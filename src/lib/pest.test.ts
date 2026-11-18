import { describe, expect, it } from 'vitest';
import {
  PEST_LINE_MOOD,
  PEST_LINES,
  PEST_TIMING,
  lookAroundDelay,
  pickLine,
  type PestLineKind,
} from './pest.ts';

const KINDS: PestLineKind[] = ['cover', 'wrong', 'correct', 'caught'];

describe('pickLine', () => {
  it('난수에 따라 목록의 처음·끝 문구를 고르고 범위를 넘지 않는다', () => {
    expect(pickLine({ kind: 'wrong', random: () => 0 })).toBe(
      PEST_LINES.wrong[0],
    );
    expect(pickLine({ kind: 'wrong', random: () => 0.999 })).toBe(
      PEST_LINES.wrong.at(-1),
    );
    expect(pickLine({ kind: 'caught', random: () => 1 })).toBe(
      PEST_LINES.caught.at(-1),
    );
  });

  it('모든 종류에 문구와 표정이 있고 문구는 말풍선에 들어갈 만큼 짧다', () => {
    for (const kind of KINDS) {
      expect(PEST_LINES[kind].length).toBeGreaterThan(0);
      expect(PEST_LINE_MOOD[kind]).not.toBe('idle');
      for (const line of PEST_LINES[kind]) {
        expect(line.trim()).toBe(line);
        expect(line.length).toBeLessThanOrEqual(15);
      }
    }
  });
});

describe('lookAroundDelay', () => {
  it('1~2초 사이 정수', () => {
    expect(lookAroundDelay({ random: () => 0 })).toBe(
      PEST_TIMING.lookAroundMin,
    );
    expect(lookAroundDelay({ random: () => 1 })).toBe(
      PEST_TIMING.lookAroundMax,
    );
  });
});
