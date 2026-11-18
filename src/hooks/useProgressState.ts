// 앱 전체가 공유하는 진행 상태(골드·푼 문제·연 힌트). App.tsx의 ProgressProvider가 Context로 내려 준다.
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  createProgressStore,
  type ProgressStore,
} from '../data/progressRepository.ts';
import {
  openHint as applyOpenHint,
  openedHintCount,
  recordCorrect as applyRecordCorrect,
} from '../lib/progress.ts';
import type { Progress } from '../types/progress.ts';
import type { ProgressContextValue } from './progressContext.ts';

/** 진행 상태와 바꾸는 동작. 바뀔 때마다 바로 저장한다. store가 없으면 브라우저 저장소. */
export function useProgressState(
  givenStore?: ProgressStore,
): ProgressContextValue {
  const store = useMemo(
    () => givenStore ?? createProgressStore(),
    [givenStore],
  );
  const [progress, setProgress] = useState<Progress>(() => store.load());
  // 같은 렌더 안에서 동작이 연달아 불려도 최신 값을 쓰도록 ref에도 둔다(연타 대비).
  const latest = useRef(progress);

  const commit = useCallback(
    (next: Progress) => {
      latest.current = next;
      setProgress(next);
      store.save(next);
    },
    [store],
  );

  const recordCorrect = useCallback<ProgressContextValue['recordCorrect']>(
    ({ topicId, itemId }) => {
      const result = applyRecordCorrect({
        progress: latest.current,
        topicId,
        itemId,
      });
      if (result.progress !== latest.current) commit(result.progress);
      return result.goldEarned;
    },
    [commit],
  );

  const openHint = useCallback<ProgressContextValue['openHint']>(
    ({ topicId, itemId, step, paid }) => {
      const opened = openedHintCount({
        progress: latest.current,
        topicId,
        itemId,
      });
      if (step !== opened) return false;
      const result = applyOpenHint({
        progress: latest.current,
        topicId,
        itemId,
        paid,
      });
      if (!result.ok) return false;
      commit(result.progress);
      return true;
    },
    [commit],
  );

  return useMemo(
    () => ({ progress, recordCorrect, openHint }),
    [progress, recordCorrect, openHint],
  );
}
