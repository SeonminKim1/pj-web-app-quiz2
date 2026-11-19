// 카테고리 한 판: 문제의 category를 처음 나온 순서로 묶는다.
// 카테고리 진행률은 stages.stageProgress를 그대로 쓴다(문제 목록만 본다).
import type { QuizItem } from '../types/quiz.ts';
import { parseStageNo } from './stages.ts';

/** 카테고리 하나. no는 1부터. */
export type Category = {
  no: number;
  name: string;
  /** 카테고리 문제(id 숫자 오름차순). */
  items: QuizItem[];
};

/** 문제를 category로 묶는다(카테고리 순서는 처음 나온 순서, 안은 id 순서). category가 없는 문제는 뺀다. */
export function buildCategories({
  items,
}: {
  items: readonly QuizItem[];
}): Category[] {
  const groups = new Map<string, QuizItem[]>();
  for (const item of items) {
    if (item.category === undefined) continue;
    const group = groups.get(item.category) ?? [];
    group.push(item);
    groups.set(item.category, group);
  }
  return [...groups].map(([name, group], index) => ({
    no: index + 1,
    name,
    items: [...group].sort((a, b) => Number(a.id) - Number(b.id)),
  }));
}

/** 주소의 카테고리 번호를 읽는다(스테이지 번호와 같은 규칙: 1 이상 정수 문자열, 개수 이하). */
export function parseCategoryNo({
  value,
  categoryCount,
}: {
  value: string | undefined;
  categoryCount: number;
}): number | undefined {
  return parseStageNo({ value, stageCount: categoryCount });
}
