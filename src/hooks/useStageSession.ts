// 스테이지 한 번 풀기: 풀 문제 목록(들어올 때 한 번 정함) + 풀이 상태 + 결과 진행률.
import { useState, type RefObject } from 'react';
import type { PestAnimal } from '../lib/pestAnimals.ts';
import { solvedSet } from '../lib/progress.ts';
import { stagePlayPlan, stageProgress } from '../lib/stages.ts';
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
  /** 남은 간식 문제 수. */
  treats: number;
  questionRef: RefObject<HTMLParagraphElement | null>;
  gold: number;
  /** 모두 푼 스테이지를 다시 푸는 중(골드 없음). */
  replay: boolean;
  /** 저장된 진행 기준 스테이지 진행률(결과 화면). */
  overall: { solvedCount: number; total: number; completed: boolean };
  hasNextStage: boolean;
};

/** 풀이 세션 hook. 스테이지가 바뀌면 컴포넌트 key로 새로 만든다. */
export function useStageSession({
  topic,
  stage,
  stageCount,
}: StagePlayTarget): StageSessionView {
  const { progress } = useProgress();
  const solved = solvedSet({ progress, topicId: topic.id });
  // 풀면서 목록이 바뀌지 않게 처음 진행으로 한 번만 정한다.
  const [plan] = useState(() => stagePlayPlan({ stage, solved }));
  const play = useStagePlay({ topic, plan });
  // 방해꾼은 방금 채점한 결과에만 반응하고, 결과 화면에서는 움직임 계산을 멈춘다.
  const { pest, areaRef, playgroundRef, questionRef, animal, treats } =
    usePestSession({
      phase: play.pestPhase,
      active: play.state.phase !== 'result',
    });
  return {
    play,
    pest,
    pestAreaRef: areaRef,
    treats,
    playgroundRef,
    animal,
    questionRef,
    gold: progress.gold,
    replay: plan.replay,
    overall: stageProgress({ stage, solved }),
    hasNextStage: stage.no < stageCount,
  };
}
