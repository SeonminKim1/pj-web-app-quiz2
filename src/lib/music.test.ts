import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BASS,
  EVENTS,
  LOOP_SECONDS,
  MELODY,
  isMusicPlaying,
  setMusicEnabled,
} from './music.ts';

/** 시간이 멈춘 가짜 소리 장치: 만든 소리(오실레이터) 수만 센다. */
function fakeAudio() {
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });
  const node = () => ({ gain: param(), connect: vi.fn((n: unknown) => n) });
  const oscillators: unknown[] = [];
  class FakeContext {
    currentTime = 0;
    state = 'running';
    destination = {};
    resume = vi.fn();
    createGain = () => node();
    createOscillator = () => {
      const osc = {
        type: 'sine',
        frequency: param(),
        connect: vi.fn((n: unknown) => n),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push(osc);
      return osc;
    };
  }
  vi.stubGlobal('AudioContext', FakeContext);
  return { oscillators };
}

afterEach(() => {
  setMusicEnabled(false);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('배경음악 곡', () => {
  it('멜로디·베이스는 8마디이고 마디마다 8분음표 8개', () => {
    expect(MELODY).toHaveLength(8);
    expect(BASS).toHaveLength(8);
    for (const bar of [...MELODY, ...BASS]) {
      expect(bar.reduce((sum, [, eighths]) => sum + eighths, 0)).toBe(8);
    }
  });

  it('한 바퀴는 약 17.8초(108 BPM 8마디)이고 음은 시간 순서', () => {
    expect(LOOP_SECONDS).toBeCloseTo((60 / 108) * 4 * 8);
    for (let i = 1; i < EVENTS.length; i++) {
      expect(EVENTS[i]!.at).toBeGreaterThanOrEqual(EVENTS[i - 1]!.at);
    }
    expect(EVENTS.at(-1)!.at).toBeLessThan(LOOP_SECONDS);
  });
});

describe('배경음악 재생', () => {
  it('꺼져 있으면 연주하지 않는다', () => {
    const { oscillators } = fakeAudio();
    setMusicEnabled(false);
    expect(isMusicPlaying()).toBe(false);
    expect(oscillators).toHaveLength(0);
  });

  it('켜면 앞의 음을 미리 잡아 연주하고, 끄면 멈춘다', () => {
    vi.useFakeTimers();
    const { oscillators } = fakeAudio();
    setMusicEnabled(true);
    expect(isMusicPlaying()).toBe(true);
    // 시작 0.05초 + 앞으로 0.3초 안의 음(첫 멜로디 음과 첫 베이스 음).
    expect(oscillators.length).toBeGreaterThan(0);
    setMusicEnabled(false);
    expect(isMusicPlaying()).toBe(false);
  });

  it('탭이 숨겨지면 멈추고, 다시 보이면 이어서 연주한다', () => {
    vi.useFakeTimers();
    fakeAudio();
    let hidden = false;
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    setMusicEnabled(true);
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(isMusicPlaying()).toBe(false);
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(isMusicPlaying()).toBe(true);
  });

  it('소리 장치가 없어도 예외를 던지지 않는다', async () => {
    // 위 테스트가 만든 소리 장치를 쓰지 않도록 모듈을 새로 불러온다.
    vi.resetModules();
    vi.stubGlobal('AudioContext', undefined);
    const fresh = await import('./music.ts');
    expect(() => fresh.setMusicEnabled(true)).not.toThrow();
    expect(fresh.isMusicPlaying()).toBe(false);
    fresh.setMusicEnabled(false);
  });
});
