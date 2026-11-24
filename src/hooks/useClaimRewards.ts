// 주제 파일을 읽어 판 목록이 생기면, 다 푼 판의 보상을 받은 것으로 기록한다(설계 Eng review Section 1 finding 1).
// 진행은 문제 데이터보다 먼저 읽히므로 진행을 불러올 때가 아니라 판 목록이 준비된 곳(목록·풀이 화면)에서 한다.
// 진행이 바뀔 때마다(맞힐 때마다) 다시 확인한다. 새로 받은 것이 없으면 저장하지 않는다.
import { useEffect } from 'react';
import type { Stage } from '../lib/stages.ts';
import type { QuizTopic } from '../types/quiz.ts';
import { useProgress } from './useProgress.ts';

export function useClaimRewards(
  ready:
    | { topic: QuizTopic; rounds: readonly (Stage & { name?: string })[] }
    | undefined,
): void {
  const { progress, claimRewards } = useProgress();
  useEffect(() => {
    if (ready) claimRewards(ready);
  }, [ready, progress, claimRewards]);
}
