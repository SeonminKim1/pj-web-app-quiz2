// 풀이 중 칭호가 오르는 순간을 잡는다. 오르면 그 칭호를 2.8초 보여 주고 효과음.
import { useEffect, useRef, useState } from 'react';
import { solvedSet } from '../lib/progress.ts';
import { playCue } from '../lib/sound.ts';
import { titleFor } from '../lib/titles.ts';
import { useProgress } from './useProgress.ts';

export function useTitleUp({
  topicId,
  total,
  enabled = true,
}: {
  topicId: string;
  total: number;
  /** 칭호가 없는 주제면 false(아무것도 보이지 않음). */
  enabled?: boolean;
}): string | undefined {
  const { progress } = useProgress();
  const solved = solvedSet({ progress, topicId }).size;
  const title = titleFor({ solved, total });
  const previous = useRef(title.level);
  const [shown, setShown] = useState<string>();
  useEffect(() => {
    if (!enabled) return;
    if (title.level <= previous.current) {
      previous.current = title.level;
      return;
    }
    previous.current = title.level;
    setShown(title.name);
    playCue('levelUp');
    const timer = setTimeout(() => setShown(undefined), 2800);
    return () => clearTimeout(timer);
  }, [enabled, title.level, title.name]);
  return shown;
}
