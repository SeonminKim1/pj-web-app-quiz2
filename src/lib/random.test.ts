import { describe, expect, it } from 'vitest';
import { randomIntBetween } from './random.ts';

describe('randomIntBetween', () => {
  it('난수 0 → min, 1에 가까움·1 → max, 그 사이는 정수', () => {
    expect(randomIntBetween({ min: 3, max: 7, random: () => 0 })).toBe(3);
    expect(randomIntBetween({ min: 3, max: 7, random: () => 0.9999 })).toBe(7);
    expect(randomIntBetween({ min: 3, max: 7, random: () => 1 })).toBe(7);
    expect(randomIntBetween({ min: 3, max: 7, random: () => 0.5 })).toBe(5);
  });
});
