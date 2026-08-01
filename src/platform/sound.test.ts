import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { playAlarm, unlockAudio, _resetAudioContextForTest } from './sound';

describe('sound', () => {
  const originalAudioContext = window.AudioContext;

  beforeEach(() => {
    _resetAudioContextForTest();
  });

  afterEach(() => {
    if (originalAudioContext === undefined) {
      delete (window as unknown as Record<string, unknown>).AudioContext;
    } else {
      window.AudioContext = originalAudioContext;
    }
    _resetAudioContextForTest();
    vi.restoreAllMocks();
  });

  it("resolves 'unsupported' when AudioContext is undefined", async () => {
    delete (window as unknown as Record<string, unknown>).AudioContext;
    delete (window as unknown as Record<string, unknown>).webkitAudioContext;

    const res = await playAlarm(0.5);
    expect(res).toBe('unsupported');
  });

  it("resolves 'blocked' when AudioContext is suspended and resume remains suspended", async () => {
    const mockCtx = {
      state: 'suspended',
      resume: vi.fn().mockImplementation(async () => {
        // state remains suspended
      }),
      currentTime: 0,
      createOscillator: vi.fn(),
      createGain: vi.fn(),
      destination: {},
    };

    window.AudioContext = vi.fn().mockImplementation(() => mockCtx) as unknown as typeof AudioContext;

    const res = await playAlarm(0.8);
    expect(res).toBe('blocked');
    expect(mockCtx.resume).toHaveBeenCalled();
  });

  it("never throws even if WebAudio creation throws", async () => {
    const mockCtx = {
      state: 'running',
      currentTime: 0,
      createOscillator: vi.fn().mockImplementation(() => {
        throw new Error('WebAudio error');
      }),
      createGain: vi.fn(),
      destination: {},
    };

    window.AudioContext = vi.fn().mockImplementation(() => mockCtx) as unknown as typeof AudioContext;

    const res = await playAlarm(0.8);
    expect(res).toBe('blocked');
  });

  it("resolves 'played' when AudioContext is running and tone plays", async () => {
    const mockOsc = {
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    const mockCtx = {
      state: 'running',
      currentTime: 0,
      createOscillator: vi.fn().mockReturnValue(mockOsc),
      createGain: vi.fn().mockReturnValue(mockGain),
      destination: {},
    };

    window.AudioContext = vi.fn().mockImplementation(() => mockCtx) as unknown as typeof AudioContext;

    const res = await playAlarm(0.5);
    expect(res).toBe('played');
    expect(mockOsc.start).toHaveBeenCalled();
    expect(mockOsc.stop).toHaveBeenCalled();
  });

  it("unlockAudio attempts to resume suspended context", () => {
    const resumeFn = vi.fn().mockResolvedValue(undefined);
    const mockCtx = {
      state: 'suspended',
      resume: resumeFn,
    };
    window.AudioContext = vi.fn().mockImplementation(() => mockCtx) as unknown as typeof AudioContext;

    unlockAudio();
    expect(resumeFn).toHaveBeenCalled();
  });
});
