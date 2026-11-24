// 스티커첩 칸 계산(설계 D4): 판 목록 + 진행 → 칸마다 진행·보상·받았는지.
// 받은 보상은 "지금 계산(다 푼 판)"과 "기록된 것(earnedRewards)"을 합쳐 본다(설계 OV3): 기록 전에도 칸이 깜빡이지 않는다.
import type { Progress } from '../types/progress.ts';
import type { QuizTopic, TitleTable } from '../types/quiz.ts';
import { solvedSet } from './progress.ts';
import { rewardFor, type Reward } from './rewards.ts';
import { stageProgress, type Stage } from './stages.ts';
import { titleFor, type TitleView } from './titles.ts';

/** 스티커첩 칸 하나. */
export type AlbumCell = {
  no: number;
  /** 화면에 보일 이름("3", "연애"). */
  label: string;
  solvedCount: number;
  total: number;
  completed: boolean;
  /** 이 판의 보상(표 밖이면 없음). */
  reward: Reward | undefined;
  /** 보상을 받았는지(다 풀었거나 전에 받음). */
  earned: boolean;
};

/** 스티커첩 전체. */
export type Album = {
  cells: AlbumCell[];
  /** 받은 스티커 수 / 보상이 있는 칸 수. */
  earnedCount: number;
  rewardCount: number;
  /** 칭호(칭호 표가 없는 주제면 없음)와 다음 칭호까지 채운 비율(0~1). */
  title: (TitleView & { progress: number }) | undefined;
};

export function buildAlbum({
  topic,
  rounds,
  progress,
}: {
  topic: QuizTopic;
  rounds: readonly (Stage & { name?: string })[];
  progress: Progress;
}): Album {
  const solved = solvedSet({ progress, topicId: topic.id });
  const recorded = new Set(progress.earnedRewards ?? []);
  const cells = rounds.map((round): AlbumCell => {
    const status = stageProgress({ stage: round, solved });
    const reward = rewardFor({ topic, round });
    return {
      no: round.no,
      label: round.name ?? String(round.no),
      ...status,
      reward,
      earned:
        reward !== undefined && (status.completed || recorded.has(reward.id)),
    };
  });
  const total = rounds.reduce((sum, round) => sum + round.items.length, 0);
  return {
    cells,
    earnedCount: cells.filter((cell) => cell.earned).length,
    rewardCount: cells.filter((cell) => cell.reward).length,
    title: topic.titles
      ? titleWithProgress({ solved: solved.size, total, table: topic.titles })
      : undefined,
  };
}

// 칭호와, 지금 칭호에서 다음 칭호까지 얼마나 왔는지.
function titleWithProgress({
  solved,
  total,
  table,
}: {
  solved: number;
  total: number;
  table: TitleTable;
}): TitleView & { progress: number } {
  const view = titleFor({ solved, total, table });
  if (!view.next) return { ...view, progress: 1 };
  const from = table.levels[view.level]?.min ?? 0;
  const to = solved + view.next.remaining;
  return {
    ...view,
    progress: to > from ? Math.min(1, (solved - from) / (to - from)) : 1,
  };
}
