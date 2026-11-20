// 스테이지 한 번 풀기: 풀 문제 목록(들어올 때 한 번 정함) + 풀이 상태 + 결과 진행률.
import { useEffect, useState, type RefObject } from 'react';
import type { PestAnimal } from '../lib/pestAnimals.ts';
import { solvedSet } from '../lib/progress.ts';
import { flashOnAlbum } from '../lib/rewardFlash.ts';
import { rewardFor, type Reward } from '../lib/rewards.ts';
import { stagePlayPlan, stageProgress } from '../lib/stages.ts';
import { titleFor } from '../lib/titles.ts';
import { playCue } from '../lib/sound.ts';
import type { PestView } from './usePest.ts';
import type { PestMotion } from './usePestMotion.ts';
import { usePestSession } from './usePestSession.ts';
import { useProgress } from './useProgress.ts';
import type { StagePlayTarget } from './useStagePlayPage.ts';
import { useStagePlay, type StagePlay } from './useStagePlay.ts';

/** 풀이 세션 상태. */
export type StageSessionView = {
  play: StagePlay;
  /** 방해꾼(풀이 상태에 반응)과 움직임. */
  pest: PestView & { motion: PestMotion };
  /** 방해꾼 놀이 영역·가릴 문제 문장(페이지가 ref로 단다). */
  pestAreaRef: RefObject<HTMLDivElement | null>;
  /** 놀이터 띠(방해꾼이 평소 다니는 곳). */
  playgroundRef: RefObject<HTMLDivElement | null>;
  /** 이번 세션의 방해꾼 동물(들어올 때 정함). */
  animal: PestAnimal;
  questionRef: RefObject<HTMLParagraphElement | null>;
  gold: number;
  /** 모두 푼 스테이지를 다시 푸는 중(골드 없음). */
  replay: boolean;
  /** 저장된 진행 기준 스테이지 진행률(결과 화면). */
  overall: { solvedCount: number; total: number; completed: boolean };
  hasNextStage: boolean;
  /** 이번에 다 풀어 새로 받은 보상(들어올 때 이미 받았던 것이면 없음, 설계 OV2). */
  newReward: Reward | undefined;
  /** 이번 판에서 새로 오른 칭호(결과 화면 한 줄, 설계 D6). */
  newTitle: string | undefined;
};

/** 풀이 세션 hook. 스테이지가 바뀌면 컴포넌트 key로 새로 만든다. */
export function useStageSession({
  topic,
  stage,
  stageCount,
  itemCount,
}: StagePlayTarget): StageSessionView {
  const { progress, markRewardsSeen } = useProgress();
  const solved = solvedSet({ progress, topicId: topic.id });
  // 들어올 때 받아 둔 보상과 칭호. 목록 화면이 먼저 보상을 기록해도 "이번에 받은 것"을 놓치지 않게 처음 값으로 비교한다.
  const [earnedBefore] = useState(() => new Set(progress.earnedRewards ?? []));
  const titleNow = topic.titles
    ? titleFor({ solved: solved.size, total: itemCount, table: topic.titles })
    : undefined;
  const [titleLevelBefore] = useState(() => titleNow?.level ?? 0);
  // 풀면서 목록이 바뀌지 않게 처음 진행으로 한 번만 정한다.
  const [plan] = useState(() => stagePlayPlan({ stage, solved }));
  const play = useStagePlay({ topic, plan });
  // 방해꾼은 방금 채점한 결과에만 반응하고, 결과 화면에서는 움직임 계산을 멈춘다.
  const { pest, areaRef, playgroundRef, questionRef, animal } = usePestSession({
    phase: play.pestPhase,
    active: play.state.phase !== 'result',
  });
  const overall = stageProgress({ stage, solved });
  const reward = rewardFor({ topic, round: stage });
  const newReward =
    overall.completed && reward && !earnedBefore.has(reward.id)
      ? reward
      : undefined;
  const newTitle =
    titleNow && titleNow.level > titleLevelBefore ? titleNow.name : undefined;
  const showingReward =
    play.state.phase === 'result' ? newReward?.id : undefined;
  // 결과 화면에 새 보상을 보여 주면: 본 것으로 기록하고, 효과음, 스티커첩에 돌아가면 그 칸을 반짝인다(D7).
  useEffect(() => {
    if (!showingReward) return;
    markRewardsSeen([showingReward]);
    flashOnAlbum(showingReward);
    playCue('levelUp');
  }, [showingReward, markRewardsSeen]);
  return {
    play,
    pest,
    pestAreaRef: areaRef,
    playgroundRef,
    animal,
    questionRef,
    gold: progress.gold,
    replay: plan.replay,
    overall,
    hasNextStage: stage.no < stageCount,
    newReward,
    newTitle,
  };
}
