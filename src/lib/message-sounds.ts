"use client";

let audioContext: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return null;
  audioContext ??= new AudioContextClass();
  return audioContext;
}

function tone(
  context: AudioContext,
  frequency: number,
  startsAt: number,
  duration: number,
  volume: number,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startsAt);
  gain.gain.setValueAtTime(0.0001, startsAt);
  gain.gain.exponentialRampToValueAtTime(volume, startsAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startsAt);
  oscillator.stop(startsAt + duration + 0.02);
}

export async function unlockMessageSounds() {
  const context = getContext();
  if (context?.state === "suspended") {
    try {
      await context.resume();
    } catch {
      // A later user gesture can unlock audio.
    }
  }
}

export function playMessageSound(kind: "send" | "receive") {
  const context = getContext();
  if (!context) return;
  void unlockMessageSounds();

  const now = context.currentTime + 0.01;
  if (kind === "send") {
    tone(context, 620, now, 0.09, 0.055);
    tone(context, 880, now + 0.055, 0.12, 0.04);
  } else {
    tone(context, 760, now, 0.1, 0.05);
    tone(context, 540, now + 0.07, 0.15, 0.045);
  }
}
