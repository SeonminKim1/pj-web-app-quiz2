import { describe, expect, it } from 'vitest';
import { isRecord } from './records.ts';

describe('isRecord', () => {
  it('일반 객체만 참', () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('x')).toBe(false);
  });
});
