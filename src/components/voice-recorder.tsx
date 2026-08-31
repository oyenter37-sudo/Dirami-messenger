"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_DURATION_MS = 60_000;
const MAX_AUDIO_BYTES = 1_500_000;

type RecorderMode = "idle" | "recording" | "paused" | "sending" | "failed";

type PendingRecording = {
  blob: Blob;
  durationMs: number;
  session: number;
};

function formatDuration(milliseconds: number) {
  const seconds = Math.min(60, Math.max(0, Math.floor(milliseconds / 1000)));
  return `0:${String(seconds).padStart(2, "0")}`;
}

function preferredMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function VoiceRecorder({
  autoStart = false,
  disabled,
  onActiveChange,
  onError,
  onSend,
}: {
  autoStart?: boolean;
  disabled: boolean;
  onActiveChange: (active: boolean) => void;
  onError: (message: string) => void;
  onSend: (blob: Blob, durationMs: number) => Promise<boolean>;
}) {
  const [mode, setMode] = useState<RecorderMode>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const modeRef = useRef<RecorderMode>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const accumulatedRef = useRef(0);
  const segmentStartedRef = useRef<number | null>(null);
  const pendingRef = useRef<PendingRecording | null>(null);
  const sessionRef = useRef(0);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);
  const finishRef = useRef<() => void>(() => undefined);
  const onSendRef = useRef(onSend);
  const startRecordingRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    onSendRef.current = onSend;
  }, [onSend]);

  // Микрофон должен стартовать с первого тапа: родитель монтирует
  // рекордер уже активированным, здесь только запускаем запись.
  useEffect(() => {
    startRecordingRef.current = () => void startRecording();
  });

  useEffect(() => {
    if (autoStart) startRecordingRef.current();
  }, [autoStart]);

  const changeMode = useCallback((next: RecorderMode) => {
    modeRef.current = next;
    setMode(next);
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const reset = useCallback(() => {
    recorderRef.current = null;
    chunksRef.current = [];
    pendingRef.current = null;
    accumulatedRef.current = 0;
    segmentStartedRef.current = null;
    setElapsedMs(0);
    changeMode("idle");
    onActiveChange(false);
  }, [changeMode, onActiveChange]);

  const attemptSend = useCallback(
    async (pending: PendingRecording) => {
      pendingRef.current = pending;
      changeMode("sending");
      const sent = await onSendRef.current(pending.blob, pending.durationMs);
      if (!mountedRef.current || sessionRef.current !== pending.session) return;
      if (sent) {
        reset();
      } else {
        changeMode("failed");
      }
    },
    [changeMode, reset],
  );

  const finishRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (
      !recorder ||
      recorder.state === "inactive" ||
      (modeRef.current !== "recording" && modeRef.current !== "paused")
    ) {
      return;
    }

    if (modeRef.current === "recording" && segmentStartedRef.current !== null) {
      accumulatedRef.current += performance.now() - segmentStartedRef.current;
      segmentStartedRef.current = null;
    }
    accumulatedRef.current = Math.min(MAX_DURATION_MS, accumulatedRef.current);
    setElapsedMs(accumulatedRef.current);
    changeMode("sending");
    recorder.stop();
    stopStream();
  }, [changeMode, stopStream]);

  useEffect(() => {
    finishRef.current = finishRecording;
  }, [finishRecording]);

  useEffect(() => {
    if (mode !== "recording") return;
    const update = () => {
      const started = segmentStartedRef.current;
      const value = Math.min(
        MAX_DURATION_MS,
        accumulatedRef.current +
          (started === null ? 0 : performance.now() - started),
      );
      setElapsedMs(value);
    };
    update();
    const interval = window.setInterval(update, 100);
    const remaining = Math.max(0, MAX_DURATION_MS - accumulatedRef.current);
    const stopTimer = window.setTimeout(() => finishRef.current(), remaining);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(stopTimer);
    };
  }, [mode]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      sessionRef.current += 1;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startRecording() {
    if (disabled || modeRef.current !== "idle" || startingRef.current) return;
    onError("");
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      onError("Этот браузер не поддерживает запись голосовых сообщений");
      if (autoStart) onActiveChange(false);
      return;
    }

    const session = sessionRef.current + 1;
    sessionRef.current = session;
    startingRef.current = true;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch {
      startingRef.current = false;
      if (mountedRef.current && sessionRef.current === session) {
        onError("Разрешите Dirami доступ к микрофону");
        if (autoStart) onActiveChange(false);
      }
      return;
    }
    startingRef.current = false;
    if (!mountedRef.current || sessionRef.current !== session) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    const mimeType = preferredMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 48_000,
      });
    } catch {
      try {
        recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      } catch {
        stream.getTracks().forEach((track) => track.stop());
        onError("Не удалось запустить запись на этом устройстве");
        if (autoStart) onActiveChange(false);
        return;
      }
    }

    chunksRef.current = [];
    accumulatedRef.current = 0;
    segmentStartedRef.current = performance.now();
    pendingRef.current = null;
    recorderRef.current = recorder;
    streamRef.current = stream;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onerror = () => {
      if (sessionRef.current !== session || !mountedRef.current) return;
      sessionRef.current += 1;
      stopStream();
      onError("Запись прервалась. Попробуйте ещё раз");
      reset();
    };
    recorder.onstop = () => {
      if (sessionRef.current !== session || !mountedRef.current) return;
      const durationMs = Math.min(
        MAX_DURATION_MS,
        Math.round(accumulatedRef.current),
      );
      const type = recorder.mimeType || chunksRef.current[0]?.type;
      const blob = new Blob(chunksRef.current, { type });
      if (durationMs < 300 || blob.size < 100) {
        onError("Запись получилась слишком короткой");
        reset();
        return;
      }
      if (blob.size > MAX_AUDIO_BYTES) {
        onError("Запись получилась слишком большой. Попробуйте ещё раз");
        reset();
        return;
      }
      void attemptSend({ blob, durationMs, session });
    };

    try {
      recorder.start(250);
      setElapsedMs(0);
      changeMode("recording");
      onActiveChange(true);
    } catch {
      stopStream();
      onError("Не удалось запустить запись");
      reset();
    }
  }

  function pauseOrResume() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (modeRef.current === "recording" && recorder.state === "recording") {
      if (segmentStartedRef.current !== null) {
        accumulatedRef.current += performance.now() - segmentStartedRef.current;
      }
      segmentStartedRef.current = null;
      recorder.pause();
      setElapsedMs(Math.min(MAX_DURATION_MS, accumulatedRef.current));
      changeMode("paused");
    } else if (modeRef.current === "paused" && recorder.state === "paused") {
      segmentStartedRef.current = performance.now();
      recorder.resume();
      changeMode("recording");
    }
  }

  function cancel() {
    if (modeRef.current === "sending") return;
    sessionRef.current += 1;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stopStream();
    reset();
  }

  if (mode === "idle") {
    if (autoStart) {
      // Микрофон уже нажат — ждём разрешение браузера, показываем капсулу,
      // а не маленькую кнопку: иначе выглядит как «надо нажать ещё раз».
      return (
        <div className="composer-capsule flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-[1.4rem] px-3.5">
          <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-red-400" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--muted-2)]">
            Готовим микрофон…
          </span>
        </div>
      );
    }
    return (
      <button
        aria-label="Записать голосовое сообщение"
        className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--muted-2)] transition hover:bg-[var(--accent-muted)] hover:text-accent disabled:opacity-40"
        disabled={disabled}
        onClick={() => void startRecording()}
        title="Записать голосовое"
        type="button"
      >
        <svg
          aria-hidden="true"
          fill="none"
          height="19"
          viewBox="0 0 24 24"
          width="19"
        >
          <rect
            height="12"
            rx="4"
            stroke="currentColor"
            strokeWidth="1.8"
            width="7"
            x="8.5"
            y="2.5"
          />
          <path
            d="M5.8 10.5a6.2 6.2 0 0 0 12.4 0M12 16.8V21m-3 0h6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="composer-capsule flex min-h-[44px] min-w-0 flex-1 items-center gap-1 rounded-[1.4rem] p-1 pl-1.5">
      <button
        aria-label="Отменить запись"
        className="grid size-9 shrink-0 place-items-center rounded-full text-lg font-light text-[var(--muted-2)] transition hover:bg-white/5 disabled:opacity-40"
        disabled={mode === "sending"}
        onClick={cancel}
        title="Отменить"
        type="button"
      >
        ×
      </button>
      <span
        className={`size-2.5 shrink-0 rounded-full ${mode === "paused" || mode === "failed" ? "bg-amber-300" : "animate-pulse bg-red-400"}`}
      />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
        {mode === "sending"
          ? "Отправляем…"
          : mode === "failed"
            ? "Не отправилось"
            : mode === "paused"
              ? `Пауза · ${formatDuration(elapsedMs)}`
              : `Запись · ${formatDuration(elapsedMs)}`}
      </span>
      {mode === "recording" || mode === "paused" ? (
        <button
          aria-label={mode === "paused" ? "Продолжить запись" : "Пауза"}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-white/6 text-xs transition hover:bg-white/10"
          onClick={pauseOrResume}
          title={mode === "paused" ? "Продолжить" : "Пауза"}
          type="button"
        >
          {mode === "paused" ? "▶" : "Ⅱ"}
        </button>
      ) : null}
      <button
        aria-label={
          mode === "failed"
            ? "Повторить отправку"
            : "Остановить и отправить запись"
        }
        className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-on-accent transition hover:scale-105 disabled:opacity-50"
        disabled={mode === "sending"}
        onClick={() => {
          if (mode === "failed" && pendingRef.current) {
            void attemptSend(pendingRef.current);
          } else {
            finishRecording();
          }
        }}
        title={mode === "failed" ? "Повторить" : "Остановить и отправить"}
        type="button"
      >
        {mode === "sending" ? (
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : mode === "failed" ? (
          "↻"
        ) : (
          <span className="size-3 rounded-[3px] bg-current" />
        )}
      </button>
    </div>
  );
}

export function VoiceMicButton({
  disabled,
  onActivate,
}: {
  disabled?: boolean;
  onActivate: () => void;
}) {
  return (
    <button
      aria-label="Записать голосовое сообщение"
      className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--muted-2)] transition hover:bg-[var(--accent-muted)] hover:text-accent disabled:opacity-40"
      disabled={disabled}
      onClick={onActivate}
      title="Записать голосовое"
      type="button"
    >
      <svg
        aria-hidden="true"
        fill="none"
        height="19"
        viewBox="0 0 24 24"
        width="19"
      >
        <rect
          height="12"
          rx="4"
          stroke="currentColor"
          strokeWidth="1.8"
          width="7"
          x="8.5"
          y="2.5"
        />
        <path
          d="M5.8 10.5a6.2 6.2 0 0 0 12.4 0M12 16.8V21m-3 0h6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    </button>
  );
}
