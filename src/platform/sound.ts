let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtxClass) return null;

  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioCtxClass();
    } catch {
      return null;
    }
  }
  return sharedAudioCtx;
}

export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

export async function playAlarm(volume: number): Promise<'played' | 'blocked' | 'unsupported'> {
  const ctx = getAudioContext();
  if (!ctx) return 'unsupported';

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      // ignore resume error
    }
    if (ctx.state === 'suspended') {
      return 'blocked';
    }
  }

  try {
    const v = Math.max(0, Math.min(1, volume));
    if (v <= 0) return 'played';

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);

    // 2 short pulses
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(v, now + 0.02);
    gain.gain.setValueAtTime(v, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.12);

    gain.gain.setValueAtTime(0, now + 0.15);
    gain.gain.linearRampToValueAtTime(v, now + 0.17);
    gain.gain.setValueAtTime(v, now + 0.25);
    gain.gain.linearRampToValueAtTime(0, now + 0.27);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);

    return 'played';
  } catch {
    return 'blocked';
  }
}

export function _resetAudioContextForTest(): void {
  sharedAudioCtx = null;
}
