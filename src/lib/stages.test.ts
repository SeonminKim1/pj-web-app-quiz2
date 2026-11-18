import { describe, expect, it } from 'vitest';
import type { QuizItem } from '../types/quiz.ts';
import {
  buildStages,
  parseStageNo,
  stagePlayPlan,
  stageProgress,
} from './stages.ts';

function items(ids: number[]): QuizItem[] {
  return ids.map((id) => ({
    id: String(id),
    question: `q${id}`,
    answer: `a${id}`,
  }));
}

describe('buildStages', () => {
  it('id 숫자 오름차순으로 stageSize개씩 나누고, 마지막은 적을 수 있다', () => {
    const stages = buildStages({
      items: items([10, 2, 1, 3, 11]),
      stageSize: 2,
    });

    expect(stages.map((stage) => stage.no)).toEqual([1, 2, 3]);
    expect(stages.map((stage) => stage.items.map((item) => item.id))).toEqual([
      ['1', '2'],
      ['3', '10'],
      ['11'],
    ]);
  });

  it('넌센스 546문제를 10개씩 나누면 55개, 마지막 6문제', () => {
    const stages = buildStages({
      items: items(Array.from({ length: 546 }, (_, i) => i + 1)),
      stageSize: 10,
    });
    expect(stages).toHaveLength(55);
    expect(stages.at(-1)!.items).toHaveLength(6);
  });
});

describe('parseStageNo', () => {
  it('1 이상 정수 문자열이고 스테이지 수 이하일 때만 번호', () => {
    expect(parseStageNo({ value: '1', stageCount: 55 })).toBe(1);
    expect(parseStageNo({ value: '55', stageCount: 55 })).toBe(55);
    for (const value of ['0', '56', 'abc', '01', '1.5', '', undefined]) {
      expect(parseStageNo({ value, stageCount: 55 })).toBeUndefined();
    }
  });
});

describe('stageProgress / stagePlayPlan', () => {
  const [stage] = buildStages({ items: items([1, 2, 3]), stageSize: 10 });

  it('진행률과 완료 여부', () => {
    expect(stageProgress({ stage: stage!, solved: new Set(['2']) })).toEqual({
      solvedCount: 1,
      total: 3,
      completed: false,
    });
    expect(
      stageProgress({ stage: stage!, solved: new Set(['1', '2', '3']) })
        .completed,
    ).toBe(true);
  });

  it('계획: 스테이지 전체, 첫 못 푼 문제부터, 들어오기 전에 맞힌 문제를 기억', () => {
    const plan = stagePlayPlan({ stage: stage!, solved: new Set(['1', '3']) });
    expect(plan.items).toEqual(items([1, 2, 3]));
    expect(plan.startIndex).toBe(1);
    expect(plan.replay).toBe(false);
    expect([...plan.solvedBefore].sort()).toEqual(['1', '3']);
  });

  it('모두 풀었으면 다시 풀기: 1번부터, 맞힌 문제 없음으로 본다', () => {
    const plan = stagePlayPlan({
      stage: stage!,
      solved: new Set(['1', '2', '3']),
    });
    expect(plan).toMatchObject({ startIndex: 0, replay: true });
    expect(plan.solvedBefore.size).toBe(0);
  });

  it('allowReplay: false면 다 풀었어도 다시 풀기가 아니고 모두 맞힌 문제로 본다(MBTI 보드)', () => {
    const plan = stagePlayPlan({
      stage: stage!,
      solved: new Set(['1', '2', '3']),
      allowReplay: false,
    });
    expect(plan).toMatchObject({ startIndex: 0, replay: false });
    expect(plan.solvedBefore.size).toBe(3);
  });
});
