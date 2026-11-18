import { describe, expect, it } from 'vitest';
import type { QuizItem } from '../types/quiz.ts';
import { buildCategories, parseCategoryNo } from './categories.ts';

const item = (id: string, category?: string): QuizItem => ({
  id,
  question: `q${id}`,
  answer: 'ISTJ',
  ...(category === undefined ? {} : { category }),
});

describe('buildCategories', () => {
  it('처음 나온 순서로 묶고, 번호는 1부터, 안은 id 숫자 순서', () => {
    const categories = buildCategories({
      items: [
        item('10', '연애'),
        item('2', '일상'),
        item('1', '연애'),
        item('3'),
      ],
    });
    expect(
      categories.map((c) => [c.no, c.name, c.items.map((i) => i.id)]),
    ).toEqual([
      [1, '연애', ['1', '10']],
      [2, '일상', ['2']],
    ]);
  });
});

describe('parseCategoryNo', () => {
  it('1 이상 정수 문자열이고 개수 이하일 때만 번호', () => {
    expect(parseCategoryNo({ value: '7', categoryCount: 7 })).toBe(7);
    for (const value of ['0', '8', 'abc', '01', undefined]) {
      expect(parseCategoryNo({ value, categoryCount: 7 })).toBeUndefined();
    }
  });
});
