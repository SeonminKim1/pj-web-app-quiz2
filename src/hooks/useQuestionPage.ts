// 문제 하나 모드(/q/:id, /m/:id …: 주제의 공유 주소) hook. 설계 문서 "사용자 흐름 5"·"문제 하나 화면 명세".
// - 공유 쿼리(s, from, h, r)를 읽자마자 주소창에서 지운다(새로 고침·북마크로 다시 세지 않게).
// - s=1이면 공유 착지로 센다(문제 id와 함께).
// - 공유 대상이 아니면 "쉬는 중", 없는 문제면 "없는 문제".
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AppError, ErrorCode } from '../errors/AppError.ts';
import { analytics } from '../lib/analyticsInstance.ts';
import { buildCategories } from '../lib/categories.ts';
import { solvedSet } from '../lib/progress.ts';
import {
  findShareTopic,
  textHintCount,
  type ShareTopic,
} from '../lib/quizTopics.ts';
import {
  clampShareInfo,
  parseShareQuery,
  shareKey,
  type ShareInfo,
} from '../lib/shareLink.ts';
import { buildStages, type Stage } from '../lib/stages.ts';
import type { QuizItem, QuizTopic } from '../types/quiz.ts';
import { useProgress } from './useProgress.ts';
import { useTopicFile, type LoadState } from './useQuizData.ts';

/** 주제 파일과 한 판 목록(스테이지 또는 카테고리). */
type TopicRounds = {
  items: readonly QuizItem[];
  rounds: Stage[];
};

export type QuestionTarget =
  | {
      kind: 'playable';
      item: QuizItem;
      topic: ShareTopic;
      /** 이 문제가 든 판(스테이지·카테고리, 전체 데이터를 받기 전·다 풀었으면 undefined → 목록). */
      stageNo: number | undefined;
    }
  /** 쉬는 중. missing이면 그런 문제가 아예 없다(주소 오타 등). */
  | { kind: 'resting'; missing: boolean };

/**
 * 빌드가 /q/<id>/index.html에 넣어 둔 문제 자료(#q-data). 있으면 전체 파일을 받기 전에 바로 그린다.
 * 없거나(npm run dev, SPA fallback) 주소의 id와 다르면 undefined → 주제 파일을 받아서 그린다.
 */
function readInlineItem(
  id: string,
  doc: Document | undefined = globalThis.document,
): QuizItem | undefined {
  try {
    const text = doc?.getElementById('q-data')?.textContent;
    if (!text) return undefined;
    const item = JSON.parse(text) as Partial<QuizItem>;
    if (
      item.id !== id ||
      item.shareable !== true ||
      typeof item.question !== 'string' ||
      typeof item.answer !== 'string'
    ) {
      return undefined;
    }
    return item as QuizItem;
  } catch {
    return undefined;
  }
}

/** 그 문제에서 실제로 열 수 있는 힌트 단계 수(문장 힌트는 데이터에 있는 만큼). */
function availableHintSteps(topic: QuizTopic, item: QuizItem): number {
  const textSteps = Math.min(item.hints?.length ?? 0, textHintCount(topic));
  const letterSteps = topic.hints.filter(
    (step) => step.type === 'revealLetter',
  ).length;
  return Math.min(topic.hints.length, textSteps + letterSteps);
}

/** 이 문제가 든 스테이지 번호(id 오름차순 위치 기준). 그 스테이지를 다 풀었으면 못 푼 문제가 남은 다음 스테이지. */
function continueStageNo({
  data,
  item,
  solved,
}: {
  data: TopicRounds;
  item: QuizItem;
  solved: ReadonlySet<string>;
}): number | undefined {
  const at = data.rounds.findIndex((stage) =>
    stage.items.some((it) => it.id === item.id),
  );
  if (at === -1) return undefined;
  for (let i = at; i < data.rounds.length; i++) {
    if (data.rounds[i]!.items.some((it) => !solved.has(it.id))) return i + 1;
  }
  return undefined; // 다 풀었으면 스테이지 목록으로
}

/** 주제 파일 → 한 판 목록(주제 설정의 한 판 단위대로). */
function useTopicRounds(topic: ShareTopic | undefined): {
  state: LoadState<TopicRounds>;
  retry: () => void;
} {
  const { state: fileState, retry } = useTopicFile(topic?.id);
  const state = useMemo<LoadState<TopicRounds>>(() => {
    if (fileState.status !== 'ready') return fileState;
    if (!topic) {
      return {
        status: 'error',
        error: new AppError(ErrorCode.TOPIC_NOT_FOUND),
      };
    }
    const { items } = fileState.data;
    const rounds = topic.round.byCategory
      ? buildCategories({ items })
      : buildStages({ items, stageSize: topic.round.stageSize });
    return { status: 'ready', data: { items, rounds } };
  }, [fileState, topic]);
  return { state, retry };
}

/** 문제 하나 모드 hook. prefix: 주소의 공유 앞부분(q, m). */
export function useQuestionPage(prefix: string): {
  state: LoadState<QuestionTarget>;
  retry: () => void;
  info: ShareInfo;
  fromShare: boolean;
  goHome: () => void;
  goStage: (no: number | undefined) => void;
} {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const topic = findShareTopic(prefix);
  const { state: loaded, retry } = useTopicRounds(topic);
  const key = shareKey({ prefix, id });
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
    if (parsed.fromShare) analytics.landed(key);
    // key·fromShare는 이 화면에서 바뀌지 않는다. 착지는 analytics가 (이벤트, id)당 한 번만 센다.
  }, [key, parsed.fromShare]);

  const [inline] = useState(() => readInlineItem(id));

  const state = useMemo<LoadState<QuestionTarget>>(() => {
    if (loaded.status === 'ready') {
      if (!topic)
        return {
          status: 'error',
          error: new AppError(ErrorCode.TOPIC_NOT_FOUND),
        };
      const item = loaded.data.items.find((it) => it.id === id);
      if (!item || item.shareable !== true) {
        return { status: 'ready', data: { kind: 'resting', missing: !item } };
      }
      const solved = solvedSet({ progress, topicId: topic.id });
      const stageNo = continueStageNo({ data: loaded.data, item, solved });
      return {
        status: 'ready',
        data: { kind: 'playable', item, topic, stageNo },
      };
    }
    // 전체 파일을 받는 중이거나 받지 못해도 인라인 자료가 있으면 그 문제는 푼다.
    if (inline && topic) {
      return {
        status: 'ready',
        data: { kind: 'playable', item: inline, topic, stageNo: undefined },
      };
    }
    return loaded;
  }, [loaded, id, progress, inline, topic]);

  const info =
    state.status === 'ready' && state.data.kind === 'playable'
      ? clampShareInfo(
          parsed.info,
          availableHintSteps(state.data.topic, state.data.item),
        )
      : // 데이터를 받기 전에는 결과 줄을 보여 주지 않는다(검증 전).
        { from: parsed.info.from };

  return {
    state,
    retry,
    info,
    fromShare: parsed.fromShare,
    goHome: () => void navigate('/'),
    goStage: (no) => {
      const list = `/topics/${topic?.id ?? ''}`;
      const segment = topic?.round.byCategory ? 'categories' : 'stages';
      void navigate(no ? `${list}/${segment}/${no}` : list);
    },
  };
}
