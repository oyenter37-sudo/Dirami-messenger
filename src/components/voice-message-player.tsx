"use client";

import { useRef, useState } from "react";
import type { VoiceMessageMeta } from "@/lib/types";

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(voice.durationMs);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState("");
  const listened = Boolean(voice.listenedAt) || !voice.available;

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
      <div className="flex min-w-48 items-center gap-3 py-0.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-black/10 text-base">
          ✓
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">Прослушано</span>
          <span className="block text-[10px] opacity-60">
            Аудиозапись удалена
          </span>
        </span>
      </div>
    );
  }

  const shownDuration = Math.max(300, durationMs || voice.durationMs);
  const progress = Math.min(currentMs, shownDuration);

  return (
    <div className="w-[236px] max-w-full py-0.5">
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
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onTimeUpdate={(event) =>
          setCurrentMs(Math.round(event.currentTarget.currentTime * 1000))
        }
        preload="metadata"
        src={`/api/messages/voice/${encodeURIComponent(messageId)}`}
      />
      <div className="flex items-center gap-2.5">
        <button
          aria-label={playing ? "Пауза" : "Воспроизвести голосовое сообщение"}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-black/15 text-sm transition hover:scale-105 disabled:opacity-50"
          disabled={marking}
          onClick={() => void togglePlayback()}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          {marking ? (
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : playing ? (
            <span className="flex gap-1">
              <span className="h-3.5 w-1 rounded-full bg-current" />
              <span className="h-3.5 w-1 rounded-full bg-current" />
            </span>
          ) : (
            <span className="ml-0.5 block h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-current" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <input
            aria-label="Ход воспроизведения"
            className={`h-1.5 w-full accent-current ${mine ? "cursor-pointer" : "cursor-default"}`}
            disabled={!mine}
            max={shownDuration}
            min={0}
            onChange={(event) => {
              const audio = audioRef.current;
              if (!audio || !mine) return;
              audio.currentTime = Number(event.target.value) / 1000;
            }}
            onPointerDown={(event) => event.stopPropagation()}
            step={100}
            type="range"
            value={progress}
          />
          <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] opacity-65">
            <span>{formatDuration(currentMs)}</span>
            <span>{formatDuration(shownDuration)}</span>
          </div>
        </div>
      </div>
      <p className="mt-1 text-[10px] opacity-65">
        {error
          ? error
          : marking
            ? "Сохраняем отметку…"
            : mine
              ? "Не прослушано"
              : "Удалится после полного прослушивания"}
      </p>
    </div>
  );
}
