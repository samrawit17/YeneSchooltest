"use client";

let sirenAudioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  if (!sirenAudioContext) {
    sirenAudioContext = new AudioContextCtor();
  }

  return sirenAudioContext;
}

export async function unlockSirenAudio() {
  const context = getAudioContext();

  if (!context) {
    throw new Error("Web Audio is not supported in this browser");
  }

  if (context.state === "suspended") {
    await context.resume();
  }

  return context;
}

export async function playSirenAudio(durationMs = 1800) {
  const context = await unlockSirenAudio();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "sawtooth";

  const now = context.currentTime;
  const endTime = now + durationMs / 1000;
  let cursor = now;

  oscillator.frequency.setValueAtTime(720, now);
  while (cursor < endTime) {
    oscillator.frequency.linearRampToValueAtTime(980, Math.min(cursor + 0.22, endTime));
    oscillator.frequency.linearRampToValueAtTime(720, Math.min(cursor + 0.44, endTime));
    cursor += 0.44;
  }

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
  gainNode.gain.setValueAtTime(0.18, Math.max(now + 0.03, endTime - 0.08));
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(now);
  oscillator.stop(endTime);
}
