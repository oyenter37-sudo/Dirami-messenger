"use client";

import { useEffect, useRef, useState } from "react";
import type { VoiceMessageMeta } from "@/lib/types";

const BAR_COUNT = 28;

const waveCache = new Map<string, number[]>();

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function fallbackBars(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const bars: number[] = [];
  for (let index = 0; index < BAR_COUNT; index += 1) {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    bars.push(0.22 + (((hash >>> 0) % 1000) / 1000) * 0.78);
  }
  return bars;
}

function normalizedBars(peaks: number[]) {
  const max = Math.max(...peaks) || 1;
  return peaks.map((peak, index) => {
    const before = peaks[index - 1] ?? peak;
    const after = peaks[index + 1] ?? peak;
    const smoothed = (before + peak * 2 + after) / 4;
    return Math.max(0.18, Math.min(1, (smoothed / max) * 0.92 + 0.08));
  });
}

export function VoiceMessagePlayer({
  messageId,
  voice,
  mine,
  onListened,
}: {
  messageId: string;
  voice: VoiceMessageMeta;
  mine: boolean;
  onListened: (messageId: string, listenedAt: string) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(voice.durationMs);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState("");
  const [bars, setBars] = useState<number[]>(
    () => waveCache.get(messageId) ?? fallbackBars(messageId),
  );
  const listened = Boolean(voice.listenedAt) || !voice.available;
  const src = `/api/messages/voice/${encodeURIComponent(messageId)}`;

  useEffect(() => {
    if (listened) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(src, { cache: "force-cache" });
        if (!response.ok || cancelled) return;
        const buffer = await response.arrayBuffer();
        const AudioContextCtor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioContextCtor || cancelled) return;
        const context = new AudioContextCtor();
        const decoded = await context.decodeAudioData(buffer);
        const samples = decoded.getChannelData(0);
        const block = Math.floor(samples.length / BAR_COUNT) || 1;
        const peaks: number[] = [];
        for (let index = 0; index < BAR_COUNT; index += 1) {
          let max = 0;
          for (
            let offset = 0;
            offset < block;
            offset += Math.max(1, Math.floor(block / 90))
          ) {
            const value = Math.abs(samples[index * block + offset] ?? 0);
            if (value > max) max = value;
          }
          peaks.push(max);
        }
        void context.close().catch(() => undefined);
        if (cancelled) return;
        const next = normalizedBars(peaks);
        waveCache.set(messageId, next);
        setBars(next);
      } catch {
        /* fallback bars stay */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listened, messageId, src]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || marking || listened) return;
    setError("");
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (audio.ended) audio.currentTime = 0;
    try {
      await audio.play();
    } catch {
      setError("Не удалось включить запись");
    }
  }

  function seekTo(clientX: number) {
    const audio = audioRef.current;
    const rect = waveRef.current?.getBoundingClientRect();
    if (!audio || !rect || !mine) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    audio.currentTime = (ratio * shownDuration) / 1000;
    setCurrentMs(Math.round(ratio * shownDuration));
  }

  async function finishPlayback() {
    setPlaying(false);
    if (mine || marking || listened) return;

    setMarking(true);
    setError("");
    try {
      const response = await fetch(
        `/api/messages/voice/${encodeURIComponent(messageId)}/listened`,
        { method: "POST" },
      );
      const data = (await response.json()) as {
        listenedAt?: string;
        error?: string;
      };
      if (!response.ok || !data.listenedAt) {
        setError(data.error ?? "Не удалось отметить прослушанным");
        return;
      }
      onListened(messageId, data.listenedAt);
    } catch {
      setError("Сеть недоступна — запись пока сохранена");
    } finally {
      setMarking(false);
    }
  }

  if (listened) {
    return (
      <div className="flex min-w-[200px] max-w-full items-center gap-2.5 py-0.5">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full ${
            mine
              ? "bg-black/15 text-on-accent"
              : "bg-[var(--accent)]/15 text-accent"
          }`}
        >
          <svg
            aria-hidden="true"
            fill="none"
            height="15"
            viewBox="0 0 20 20"
            width="15"
          >
            <path
              d="M4 10.5 8.2 14.5 16 5.5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </span>
        <span className="min-w-0 flex-1 text-[13px] font-semibold">
          Прослушано
        </span>
        <span className="shrink-0 text-[11px] tabular-nums opacity-60">
          {formatDuration(voice.durationMs)}
        </span>
      </div>
    );
  }

  const shownDuration = Math.max(300, durationMs || voice.durationMs);
  const progress = Math.min(currentMs, shownDuration);
  const progressRatio = progress / shownDuration;
  const mineUnlistened = mine && !listened;

  return (
    <div
      className={`w-[224px] max-w-full py-0.5 ${mine ? "" : "voice-player-theirs"}`}
    >
      <audio
        ref={audioRef}
        onDurationChange={(event) => {
          const seconds = event.currentTarget.duration;
          if (Number.isFinite(seconds) && seconds > 0) {
            setDurationMs(Math.round(seconds * 1000));
          }
        }}
        onEnded={() => void finishPlayback()}
        onError={() => setError("Запись недоступна")}
        onLoadedMetadata={(event) => {
          const seconds = event.currentTarget.duration;
          if (Number.isFinite(seconds) && seconds > 0) {
            setDurationMs(Math.round(seconds * 1000));
          }
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onTimeUpdate={(event) =>
          setCurrentMs(Math.round(event.currentTarget.currentTime * 1000))
        }
        preload="metadata"
        src={src}
      />
      <div className="flex items-center gap-2.5">
        <button
          aria-label={playing ? "Пауза" : "Воспроизвести голосовое сообщение"}
          className={`grid size-10 shrink-0 place-items-center rounded-full transition hover:scale-105 active:scale-95 disabled:opacity-50 ${
            mine
              ? "bg-black/15 text-on-accent"
              : "bg-accent text-on-accent shadow-[0_8px_18px_-8px_var(--accent)]"
          }`}
          disabled={marking}
          onClick={() => void togglePlayback()}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          {marking ? (
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : playing ? (
            <span className="flex gap-[3px]">
              <span className="h-3.5 w-[3px] rounded-full bg-current" />
              <span className="h-3.5 w-[3px] rounded-full bg-current" />
            </span>
          ) : (
            <span className="ml-0.5 block h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-current" />
          )}
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div
            aria-hidden="true"
            className={`flex h-7 min-w-0 flex-1 items-center gap-[2px] ${
              mine ? "cursor-pointer" : ""
            }`}
            onPointerDown={(event) => {
              event.stopPropagation();
              seekTo(event.clientX);
            }}
            ref={waveRef}
          >
            {bars.map((bar, index) => (
              <span
                className={`voice-bar ${
                  (index + 0.5) / BAR_COUNT <= progressRatio
                    ? "voice-bar-played"
                    : ""
                }`}
                key={index}
                style={{ height: `${Math.round(bar * 100)}%` }}
              />
            ))}
          </div>
          <span className="flex shrink-0 items-center gap-1.5 text-[11px] tabular-nums opacity-75">
            {mineUnlistened ? (
              <span className="size-[7px] rounded-full bg-current opacity-80" />
            ) : null}
            <span>
              {playing
                ? formatDuration(shownDuration - progress)
                : formatDuration(shownDuration)}
            </span>
          </span>
        </div>
      </div>
      {error || marking || !mine ? (
        <p className="mt-0.5 text-[10px] leading-4 opacity-55">
          {error
            ? error
            : marking
              ? "Сохраняем отметку…"
              : "Удалится после прослушивания"}
        </p>
      ) : null}
    </div>
  );
}
