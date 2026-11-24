// 풀이 중 칭호가 오르는 순간을 잡는다. 오르면 그 칭호를 2.8초 보여 주고 효과음.
import { useEffect, useRef, useState } from 'react';
import { solvedSet } from '../lib/progress.ts';
import { playCue } from '../lib/sound.ts';
import { titleFor } from '../lib/titles.ts';
import type { TitleTable } from '../types/quiz.ts';
import { useProgress } from './useProgress.ts';

export function useTitleUp({
  topicId,
  total,
  table,
}: {
  topicId: string;
  total: number;
  /** 주제의 칭호 표. 없으면 아무것도 보이지 않는다. */
  table: TitleTable | undefined;
}): string | undefined {
  const { progress } = useProgress();
  const solved = solvedSet({ progress, topicId }).size;
  const enabled = table !== undefined;
  const title = table
    ? titleFor({ solved, total, table })
    : { level: 0, name: '' };
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
