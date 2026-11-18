import { describe, expect, it } from 'vitest';
import { buyTreat, eatTreat, initialProgress } from './progress.ts';

describe('방해꾼 간식', () => {
  it('골드 20으로 5문제, 15문제까지 쌓인다', () => {
    let progress = { ...initialProgress(), gold: 100 };
    for (let i = 0; i < 3; i++) {
      const result = buyTreat(progress);
      expect(result.ok).toBe(true);
      if (result.ok) progress = result.progress;
    }
    expect(progress).toMatchObject({ gold: 40, treats: 15 });
    expect(buyTreat(progress)).toEqual({ ok: false, reason: 'full' });
  });

  it('골드가 모자라면 사지 않는다', () => {
    expect(buyTreat({ ...initialProgress(), gold: 19 })).toEqual({
      ok: false,
      reason: 'insufficientGold',
    });
  });

  it('맞힐 때마다 하나씩 먹고, 없으면 그대로', () => {
    const progress = { ...initialProgress(), treats: 1 };
    expect(eatTreat(progress).treats).toBe(0);
    const none = initialProgress();
    expect(eatTreat(none)).toBe(none);
  });
});
