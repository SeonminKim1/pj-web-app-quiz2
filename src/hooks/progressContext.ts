// 진행 Context 정의(Provider는 src/App.tsx, 상태는 useProgressState.ts).
import { createContext } from 'react';
import type { Stage } from '../lib/stages.ts';
import type { Progress } from '../types/progress.ts';
import type { PetId } from '../types/settings.ts';
import type { QuizTopic } from '../types/quiz.ts';

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
  /** 다 푼 판의 보상을 받은 것으로 기록(새로 받은 게 없으면 저장하지 않음). */
  claimRewards: (args: {
    topic: QuizTopic;
    rounds: readonly (Stage & { name?: string })[];
  }) => void;
  /** 보상을 보여 준 것으로 기록. */
  markRewardsSeen: (ids: readonly string[]) => void;
  /** 동물에게 받은 모자를 씌운다(hatId가 없으면 벗김). 받지 않은 모자는 무시한다. */
  equipHat: (pet: PetId, hatId: string | undefined) => void;
};

export const ProgressContext = createContext<ProgressContextValue | undefined>(
  undefined,
);
