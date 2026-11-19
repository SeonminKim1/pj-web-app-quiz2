// 칭호: 넌센스에서 맞힌 문제 수로 정한다. 마지막 칭호는 전부 맞혔을 때.

type Title = { name: string; min: number };

const TITLES: readonly Title[] = [
  { name: '넌센스 새싹', min: 0 },
  { name: '말장난 꿈나무', min: 10 },
  { name: '웃음 사냥꾼', min: 30 },
  { name: '센스 장인', min: 60 },
  { name: '아재개그 박사', min: 120 },
  { name: '넌센스 달인', min: 250 },
  { name: '넌센스 전설', min: 400 },
];

export const MASTER_TITLE = '넌센스 정복자';

export type TitleView = {
  /** 0부터. 전부 맞히면 TITLES.length(정복자). */
  level: number;
  name: string;
  /** 다음 칭호 이름과 거기까지 남은 문제 수(마지막이면 없음). */
  next: { name: string; remaining: number } | undefined;
};

export function titleFor({
  solved,
  total,
}: {
  solved: number;
  total: number;
}): TitleView {
  if (total > 0 && solved >= total) {
    return { level: TITLES.length, name: MASTER_TITLE, next: undefined };
  }
  let level = 0;
  TITLES.forEach((title, i) => {
    if (solved >= title.min) level = i;
  });
  const following = TITLES[level + 1];
  const next = following
    ? { name: following.name, remaining: following.min - solved }
    : { name: MASTER_TITLE, remaining: Math.max(0, total - solved) };
  return { level, name: TITLES[level]!.name, next };
}
