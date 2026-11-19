// 방해꾼 효과음: 행동이 실제로 바뀐 순간에만 낸다(무시된 탭·늦은 타이머에는 소리가 없다).
// 잡혀서 도망 → 뾰로롱, 집어 듦 → 뽁, 내려놓아 어지러움 → 쿵·빙글, 문제 위에 앉음 → 털썩.
import { useEffect, useRef } from 'react';
import type { PestBehavior } from '../lib/pest.ts';
import { playCue, type Cue } from '../lib/sound.ts';

/** 이전 상태 → 지금 상태로 바뀔 때 낼 소리(없으면 undefined). */
export function pestCue(
  prev: { behavior: PestBehavior; seated: boolean; dizzy: boolean },
  next: { behavior: PestBehavior; seated: boolean; dizzy: boolean },
): Cue | undefined {
  if (next.behavior === 'dragged' && prev.behavior !== 'dragged') return 'grab';
  if (next.dizzy && !prev.dizzy) return 'drop';
  if (next.behavior === 'fleeing' && prev.behavior !== 'fleeing') return 'flee';
  if (next.behavior === 'covering' && next.seated && !prev.seated)
    return 'plop';
  return undefined;
}

export function usePestSound(state: {
  behavior: PestBehavior;
  seated: boolean;
  dizzy: boolean;
}): void {
  const { behavior, seated, dizzy } = state;
  const prev = useRef({ behavior, seated, dizzy });
  useEffect(() => {
    const next = { behavior, seated, dizzy };
    const cue = pestCue(prev.current, next);
    prev.current = next;
    if (cue) playCue(cue);
  }, [behavior, seated, dizzy]);
}
