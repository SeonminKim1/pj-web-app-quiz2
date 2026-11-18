// 진행 Context 정의(Provider는 src/App.tsx, 상태는 useProgressState.ts).
import { createContext } from 'react';
import type { Progress } from '../types/progress.ts';

/** 진행 Context 값: 현재 진행과 바꾸는 동작. 동작은 바로 저장까지 한다. */
export type ProgressContextValue = {
  progress: Progress;
  /** 맞힘 기록. 얻은 골드(다시 풀기면 0)를 돌려준다. */
  recordCorrect: (args: { topicId: string; itemId: string }) => number;
  /**
   * 힌트 한 단계 열기. step은 여는 단계 번호(0부터)로, 지금 연 단계 수와 같을 때만 연다
   * (연타로 같은 단계를 두 번 열어 골드가 두 번 빠지지 않게). 열었으면 true.
   */
  openHint: (args: {
    topicId: string;
    itemId: string;
    step: number;
    paid: boolean;
  }) => boolean;
  /** 방해꾼 간식 사기. */
  buyTreat: () => 'ok' | 'insufficientGold' | 'full';
};

export const ProgressContext = createContext<ProgressContextValue | undefined>(
  undefined,
);
