// 문제 하나 모드(/q/:id) hook. 설계 문서 "사용자 흐름 5"·"문제 하나 화면 명세".
// - 공유 쿼리(s, from, h, r)를 읽자마자 주소창에서 지운다(새로 고침·북마크로 다시 세지 않게).
// - s=1이면 공유 착지로 센다(문제 id와 함께).
// - 공유 대상이 아니거나 없는 문제면 "쉬는 중".
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { analytics } from '../lib/analyticsInstance.ts';
import { solvedSet } from '../lib/progress.ts';
import { textHintCount } from '../lib/quizTopics.ts';
import {
  clampShareInfo,
  parseShareQuery,
  type ShareInfo,
} from '../lib/shareLink.ts';
import type { QuizItem } from '../types/quiz.ts';
import { useProgress } from './useProgress.ts';
import type { LoadState } from './useQuizData.ts';
import { useTopicStages, type TopicStages } from './useTopicStages.ts';

const TOPIC_ID = 'nonsense';

export type QuestionTarget =
  | { kind: 'playable'; item: QuizItem; data: TopicStages; stageNo: number }
  | { kind: 'resting' };

/** 그 문제에서 실제로 열 수 있는 힌트 단계 수(문장 힌트는 데이터에 있는 만큼). */
export function availableHintSteps(data: TopicStages, item: QuizItem): number {
  const textSteps = Math.min(
    item.hints?.length ?? 0,
    textHintCount(data.topic),
  );
  const letterSteps = data.topic.hints.filter(
    (step) => step.type === 'revealLetter',
  ).length;
  return Math.min(data.topic.hints.length, textSteps + letterSteps);
}

/** 이 문제가 든 스테이지 번호(id 오름차순 위치 기준). 그 스테이지를 다 풀었으면 못 푼 문제가 남은 다음 스테이지. */
export function continueStageNo({
  data,
  item,
  solved,
}: {
  data: TopicStages;
  item: QuizItem;
  solved: ReadonlySet<string>;
}): number | undefined {
  const at = data.stages.findIndex((stage) =>
    stage.items.some((it) => it.id === item.id),
  );
  if (at === -1) return undefined;
  for (let i = at; i < data.stages.length; i++) {
    if (data.stages[i]!.items.some((it) => !solved.has(it.id))) return i + 1;
  }
  return undefined; // 다 풀었으면 스테이지 목록으로
}

export function useQuestionPage(): {
  state: LoadState<QuestionTarget>;
  retry: () => void;
  info: ShareInfo;
  fromShare: boolean;
  goHome: () => void;
  goStage: (no: number | undefined) => void;
} {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { state: loaded, retry, topic } = useTopicStages(TOPIC_ID);
  const { progress } = useProgress();
  // 쿼리는 처음 한 번만 읽는다(읽고 바로 주소창에서 지움).
  const [parsed] = useState(() =>
    parseShareQuery({
      search: globalThis.location?.search ?? '',
      maxHints: topic?.hints.length ?? 3,
    }),
  );

  useEffect(() => {
    if (globalThis.location?.search) {
      globalThis.history?.replaceState(
        globalThis.history.state,
        '',
        globalThis.location.pathname,
      );
    }
    if (parsed.fromShare) analytics.landed(id);
    // id·fromShare는 이 화면에서 바뀌지 않는다. 착지는 analytics가 (이벤트, id)당 한 번만 센다.
  }, [id, parsed.fromShare]);

  const state = useMemo<LoadState<QuestionTarget>>(() => {
    if (loaded.status !== 'ready') return loaded;
    const item = loaded.data.items.find((it) => it.id === id);
    if (!item || item.shareable !== true)
      return { status: 'ready', data: { kind: 'resting' } };
    const solved = solvedSet({ progress, topicId: TOPIC_ID });
    const stageNo = continueStageNo({ data: loaded.data, item, solved }) ?? 0;
    return {
      status: 'ready',
      data: { kind: 'playable', item, data: loaded.data, stageNo },
    };
  }, [loaded, id, progress]);

  const info =
    state.status === 'ready' && state.data.kind === 'playable'
      ? clampShareInfo(
          parsed.info,
          availableHintSteps(state.data.data, state.data.item),
        )
      : // 데이터를 받기 전에는 결과 줄을 보여 주지 않는다(검증 전).
        { from: parsed.info.from };

  return {
    state,
    retry,
    info,
    fromShare: parsed.fromShare,
    goHome: () => void navigate('/'),
    goStage: (no) =>
      void navigate(
        no ? `/topics/${TOPIC_ID}/stages/${no}` : `/topics/${TOPIC_ID}`,
      ),
  };
}
