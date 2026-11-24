// 칭호: 맞힌 문제 수로 정한다. 칭호 표는 주제 설정(quizTopics.ts의 titles)에 있다. 마지막 칭호는 전부 맞혔을 때.
import type { TitleTable } from '../types/quiz.ts';

export type TitleView = {
  /** 0부터. 전부 맞히면 levels.length(마스터). */
  level: number;
  name: string;
  /** 다음 칭호 이름과 거기까지 남은 문제 수(마지막이면 없음). */
  next: { name: string; remaining: number } | undefined;
};

export function titleFor({
  solved,
  total,
  table,
}: {
  solved: number;
  total: number;
  table: TitleTable;
}): TitleView {
  const { levels, master } = table;
  if (total > 0 && solved >= total) {
    return { level: levels.length, name: master, next: undefined };
  }
  let level = 0;
  levels.forEach((title, i) => {
    if (solved >= title.min) level = i;
  });
  const following = levels[level + 1];
  const next = following
    ? { name: following.name, remaining: following.min - solved }
    : { name: master, remaining: Math.max(0, total - solved) };
  return { level, name: levels[level]!.name, next };
}
