import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSoundEnabled, playCue, setSoundEnabled } from './sound.ts';

afterEach(() => {
  setSoundEnabled(false);
  vi.unstubAllGlobals();
});

describe('효과음', () => {
  it('꺼져 있으면 진동도 소리도 없다', () => {
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate });
    playCue('wrong');
    expect(vibrate).not.toHaveBeenCalled();
    expect(isSoundEnabled()).toBe(false);
  });

  it('켜면 진동하고, 소리 장치가 없어도 예외를 던지지 않는다', () => {
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate });
    vi.stubGlobal('AudioContext', undefined);
    setSoundEnabled(true);
    expect(() => playCue('wrong')).not.toThrow();
    expect(vibrate).toHaveBeenCalledWith([40, 40, 40]);
  });
});
