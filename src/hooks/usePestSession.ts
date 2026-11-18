// 한 화면의 방해꾼(ui-pest-character, ui-pest-skin): 설정의 동물(들어올 때 한 번 정함) + 행동(usePest)
// + 움직임(usePestMotion) + PestLayer·놀이터·가릴 문제에 달 refs. 넌센스 풀이 화면과 MBTI 시트가 같이 쓴다.
import { useRef, useState, type RefObject } from 'react';
import { getPestAnimal, type PestAnimal } from '../lib/pestAnimals.ts';
import { usePest, type PestView } from './usePest.ts';
import { usePestMotion, type PestMotion } from './usePestMotion.ts';
import { useSettings } from './useSettings.ts';
import type { PlayPhase } from './useStagePlay.ts';

/** 방해꾼 상태와 PestLayer에 달 refs. */
export type PestSessionView = {
  pest: PestView & { motion: PestMotion };
  /** 놀이 영역(PestLayer). */
  areaRef: RefObject<HTMLDivElement | null>;
  /** 놀이터 띠(평소 다니는 곳). */
  playgroundRef: RefObject<HTMLDivElement | null>;
  /** 가릴 문제 문장. */
  questionRef: RefObject<HTMLParagraphElement | null>;
  /** 이번 화면의 방해꾼 동물. */
  animal: PestAnimal;
};

/**
 * 방해꾼 hook. phase는 방금 채점한 결과에만 반응하는 값(useStagePlay의 pestPhase).
 * active가 false면(결과 화면) 움직임 계산을 멈춘다.
 */
export function usePestSession({
  phase,
  active = true,
}: {
  phase: PlayPhase;
  active?: boolean;
}): PestSessionView {
  const { settings } = useSettings();
  // 화면에 있는 동안에는 동물이 바뀌지 않게 들어올 때 한 번 정한다.
  const [animal] = useState(() => getPestAnimal(settings.pet));
  const pest = usePest({ phase, animal });
  const areaRef = useRef<HTMLDivElement>(null);
  const playgroundRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLParagraphElement>(null);
  const motion = usePestMotion({
    pest,
    areaRef,
    coverRef: questionRef,
    playgroundRef,
    animal,
    active,
  });
  return {
    pest: { ...pest, motion },
    areaRef,
    playgroundRef,
    questionRef,
    animal,
  };
}
