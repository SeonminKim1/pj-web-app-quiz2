// 채점 결과가 바뀌는 순간에 효과음(오답 "뿅", 방금 맞힘 "띠링"). 이동으로 이미 맞힌 문제를 열 때는 소리 없음.
import { useEffect, useRef } from 'react';
import { playCue } from '../lib/sound.ts';
import type { PlayPhase } from './useStagePlay.ts';

export function usePhaseSound({
  phase,
  fresh,
}: {
  phase: PlayPhase;
  fresh: boolean;
}): void {
  const previous = useRef(phase);
  useEffect(() => {
    if (previous.current === phase) return;
    previous.current = phase;
    if (phase === 'wrong') playCue('wrong');
    if (phase === 'correct' && fresh) playCue('correct');
  }, [phase, fresh]);
}
