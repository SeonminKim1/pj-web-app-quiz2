// 풀이 화면 상태(spec "UI: 풀이"). 상태 전이는 stagePlayReducer 한 곳에서만 하고,
// 채점·골드 기록·흔들림 타이머 같은 부수 효과는 hook이 맡는다.
// 스테이지 문제 전체를 두고 이전·다음으로 오간다(spec "문제 목록과 이동").
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import {
  answerChars,
  answerSlots,
  answerWordLengths,
  type AnswerSlots,
  isCorrectAnswer,
  normalizeAnswer,
} from '../lib/answer.ts';
import {
  HINT_PRICE,
  openableHints,
  openedHintCount,
  type OpenableHint,
} from '../lib/progress.ts';
import type { StagePlayPlan } from '../lib/stages.ts';
import type { QuizItem, QuizTopic } from '../types/quiz.ts';
import { useProgress } from './useProgress.ts';

export type PlayPhase = 'answering' | 'wrong' | 'correct' | 'result';

/** 방금 맞힌 뒤 "다음"을 받지 않는 시간(ms). 확인 연타로 정답을 못 보고 넘어가지 않게. */
export const ADVANCE_DELAY_MS = 400;

export type StagePlayState = {
  /** 지금 문제 자리(0부터, 스테이지 안). */
  index: number;
  phase: PlayPhase;
  /** 지금 문제 입력창에 쓴 답. */
  input: string;
  /** 문제 자리별 쓰던 답(다른 문제에 갔다 와도 남는다). */
  inputs: Record<number, string>;
  /** 이번에 맞힌 문제 자리 → 얻은 골드(다시 풀기면 0). */
  earned: Record<number, number>;
  /** 방금 채점해서 correct가 됐는지(이동으로 맞힌 문제를 연 경우는 false). */
  fresh: boolean;
  /** 이번 판에서 맞힌 문제 수와 얻은 골드(결과 화면). */
  correctCount: number;
  goldTotal: number;
};

export type StagePlayAction =
  | { type: 'input'; value: string }
  | { type: 'judged'; correct: boolean; gold: number }
  | { type: 'clear' }
  /** 다른 문제로. solvedAnswer가 있으면 이미 맞힌 문제(정답을 보여 준다). */
  | { type: 'move'; to: number; solvedAnswer: string | undefined }
  | { type: 'finish' };

/** 처음 상태: start 자리 문제부터(맞힌 문제면 정답 화면). */
export function initialStagePlayState({
  start = 0,
  solvedAnswer,
}: { start?: number; solvedAnswer?: string } = {}): StagePlayState {
  return {
    index: start,
    phase: solvedAnswer === undefined ? 'answering' : 'correct',
    input: solvedAnswer ?? '',
    inputs: {},
    earned: {},
    fresh: false,
    correctCount: 0,
    goldTotal: 0,
  };
}

/** 풀이 상태 전이. answering이 아닐 때의 입력·채점은 무시한다(Enter 연타·중복 방지). */
export function stagePlayReducer(
  state: StagePlayState,
  action: StagePlayAction,
): StagePlayState {
  switch (action.type) {
    case 'input':
      if (state.phase !== 'answering') return state;
      return { ...state, input: action.value };
    case 'judged':
      if (state.phase !== 'answering') return state;
      return action.correct
        ? {
            ...state,
            phase: 'correct',
            fresh: true,
            earned: { ...state.earned, [state.index]: action.gold },
            correctCount: state.correctCount + 1,
            goldTotal: state.goldTotal + action.gold,
          }
        : { ...state, phase: 'wrong' };
    case 'clear':
      // 오답 흔들림이 끝나면 다시 쓸 수 있게(쓴 답은 남긴다).
      if (state.phase !== 'wrong') return state;
      return { ...state, phase: 'answering' };
    case 'move': {
      if (state.phase === 'result' || action.to === state.index) return state;
      // 떠나는 문제의 쓰던 답을 남기고, 갈 문제의 상태로 바꾼다.
      const inputs = { ...state.inputs, [state.index]: state.input };
      const solved = action.solvedAnswer !== undefined;
      return {
        ...state,
        index: action.to,
        phase: solved ? 'correct' : 'answering',
        input: solved ? action.solvedAnswer! : (inputs[action.to] ?? ''),
        inputs,
        fresh: false,
      };
    }
    case 'finish':
      if (state.phase === 'result') return state;
      return { ...state, phase: 'result' };
  }
}

/** 화면에 보여 줄 힌트 상태. */
export type HintView = {
  /** 이미 연 힌트. */
  opened: OpenableHint[];
  /** 이 문제에서 열 수 있는 힌트 전체 수(카드 수). */
  total: number;
  /** 다음에 열 힌트(없거나 맞힌 뒤면 undefined: 버튼을 숨김). */
  next: OpenableHint | undefined;
  /** 다음 힌트를 지금 열 수 있는지(유료인데 골드가 모자라면 false). */
  canOpen: boolean;
  /** 다음 힌트가 유료인데 골드가 모자란지("골드 부족" 표시). */
  goldShort: boolean;
};

/** 풀이 화면 hook이 돌려주는 값. */
export type StagePlay = {
  state: StagePlayState;
  /** 지금 문제(결과 단계에서는 마지막으로 본 문제). */
  item: QuizItem | undefined;
  /** 스테이지 문제 수. */
  total: number;
  /** 이번에 풀 수 있던 문제 수(들어올 때 못 푼 문제 수, 다시 풀기면 전체). */
  playable: number;
  /** 지금 문제를 맞혀 얻은 골드(이번에 맞힌 경우만, 아니면 0). */
  lastGold: number;
  /** 방해꾼에게 줄 상태: 이동으로 연 맞힌 문제는 answering으로(반응하지 않게). */
  pestPhase: PlayPhase;
  /** 정답 글자 수(공백 제외)와 어절별 글자 수(글자 수 표시). */
  charCount: number;
  wordLengths: number[];
  /** 글자 칸: 지금 입력을 정답 칸에 채운 값(주관식). */
  slots: AnswerSlots;
  /** 지금 제출할 수 있는지(answering이고 입력에 글자가 있음). */
  canSubmit: boolean;
  canPrev: boolean;
  /** 뒤 문제가 있는지(마지막이 아님, 결과가 아님). */
  canNext: boolean;
  /** 마지막 문제인지(다음 → 결과). */
  isLast: boolean;
  /** 맞힌 뒤 "다음"을 받을 수 있는지(방금 맞혔으면 ADVANCE_DELAY_MS 뒤부터). */
  canAdvance: boolean;
  hints: HintView;
  setInput: (value: string) => void;
  submit: () => void;
  openNextHint: () => void;
  prev: () => void;
  next: () => void;
  /** 맞힌 뒤의 "다음": canAdvance일 때만 next와 같다. */
  advance: () => void;
  /** 그 자리 문제로 바로 간다(MBTI 보드에서 문제 고르기). 범위 밖이면 무시. */
  goTo: (index: number) => void;
};

/** 풀이 화면 hook. plan은 stages.stagePlayPlan 결과(들어올 때 한 번 정함). */
export function useStagePlay({
  topic,
  plan,
  shakeMs = 500,
  advanceDelayMs = ADVANCE_DELAY_MS,
}: {
  topic: QuizTopic;
  plan: Pick<StagePlayPlan, 'items' | 'startIndex' | 'solvedBefore'>;
  shakeMs?: number;
  advanceDelayMs?: number;
}): StagePlay {
  const { items, startIndex, solvedBefore } = plan;
  const { progress, recordCorrect, openHint } = useProgress();
  // 자리의 문제를 이미 맞혔으면(들어오기 전에, 또는 이번에) 그 정답.
  const solvedAnswerAt = (
    index: number,
    earned: Record<number, number>,
  ): string | undefined => {
    const target = items[index];
    if (!target) return undefined;
    return solvedBefore.has(target.id) || earned[index] !== undefined
      ? target.answer
      : undefined;
  };
  const [state, dispatch] = useReducer(stagePlayReducer, undefined, () =>
    initialStagePlayState({
      start: startIndex,
      solvedAnswer: solvedAnswerAt(startIndex, {}),
    }),
  );
  const item = items[state.index];
  const canSubmit =
    item !== undefined &&
    state.phase === 'answering' &&
    normalizeAnswer(state.input).length > 0;

  // 오답이면 잠시 흔든 뒤 다시 쓸 수 있게 한다. 다른 문제로 가거나 화면을 떠나면 타이머를 정리한다.
  useEffect(() => {
    if (state.phase !== 'wrong') return;
    const timer = setTimeout(() => dispatch({ type: 'clear' }), shakeMs);
    return () => clearTimeout(timer);
  }, [state.phase, state.index, shakeMs]);

  // 방금 맞혔으면 잠시 뒤에 "다음"을 받는다. 몇 번째 맞힘에서 준비됐는지(correctCount) 기억해,
  // 새로 맞힐 때마다 다시 기다린다(같은 자리에서 또 맞히는 흐름이 생겨도 막기가 빠지지 않게).
  const [readyFor, setReadyFor] = useState<number | undefined>(undefined);
  const justSolved = state.phase === 'correct' && state.fresh;
  useEffect(() => {
    if (!justSolved) return;
    const solveNo = state.correctCount;
    const timer = setTimeout(() => setReadyFor(solveNo), advanceDelayMs);
    return () => clearTimeout(timer);
  }, [justSolved, state.index, state.correctCount, advanceDelayMs]);
  const canAdvance =
    state.phase === 'correct' &&
    (!state.fresh || readyFor === state.correctCount);

  const hints = useMemo<HintView>(() => {
    if (!item)
      return {
        opened: [],
        total: 0,
        next: undefined,
        canOpen: false,
        goldShort: false,
      };
    const all = openableHints({ topic, item });
    const count = openedHintCount({
      progress,
      topicId: topic.id,
      itemId: item.id,
    });
    // 맞힌 뒤에는 열 힌트가 없다(버튼을 숨김, 연 힌트는 그대로).
    const next = state.phase === 'correct' ? undefined : all[count];
    const goldShort = next?.paid === true && progress.gold < HINT_PRICE;
    return {
      opened: all.slice(0, count),
      total: all.length,
      next,
      goldShort,
      canOpen: state.phase === 'answering' && next !== undefined && !goldShort,
    };
  }, [item, progress, state.phase, topic]);

  // 화면이 다시 그려져도 같은 함수(effect 의존성으로 써도 렌더마다 다시 돌지 않게).
  const setInput = useCallback(
    (value: string) => dispatch({ type: 'input', value }),
    [],
  );

  const moveTo = (to: number): void => {
    if (to < 0 || to >= items.length) return;
    dispatch({
      type: 'move',
      to,
      solvedAnswer: solvedAnswerAt(to, state.earned),
    });
  };
  const isLast = state.index === items.length - 1;
  const next = (): void => {
    if (state.phase === 'result') return;
    if (isLast) dispatch({ type: 'finish' });
    else moveTo(state.index + 1);
  };

  return {
    state,
    item,
    total: items.length,
    playable: items.filter((it) => !solvedBefore.has(it.id)).length,
    lastGold: state.earned[state.index] ?? 0,
    pestPhase:
      state.phase === 'correct' && !state.fresh ? 'answering' : state.phase,
    charCount: item ? answerChars(item.answer).length : 0,
    wordLengths: item ? answerWordLengths(item.answer) : [],
    slots: answerSlots({ answer: item?.answer ?? '', input: state.input }),
    canSubmit,
    canPrev: state.phase !== 'result' && state.index > 0,
    canNext: state.phase !== 'result' && !isLast,
    isLast,
    canAdvance,
    hints,
    setInput,
    /** 제출: 채점하고, 맞으면 진행에 기록(골드는 진행 규칙이 정함). 빈 입력·answering 밖에서는 무시. */
    submit: () => {
      if (!item || !canSubmit) return;
      if (isCorrectAnswer({ answer: item.answer, input: state.input })) {
        const gold = recordCorrect({ topicId: topic.id, itemId: item.id });
        dispatch({ type: 'judged', correct: true, gold });
      } else {
        dispatch({ type: 'judged', correct: false, gold: 0 });
      }
    },
    openNextHint: () => {
      if (!item || !hints.canOpen || !hints.next) return;
      openHint({
        topicId: topic.id,
        itemId: item.id,
        step: hints.opened.length,
        paid: hints.next.paid,
      });
    },
    /** 이전 문제로(첫 문제에서는 무시). */
    prev: () => moveTo(state.index - 1),
    goTo: (index: number) => {
      if (state.phase !== 'result') moveTo(index);
    },
    /** 다음 문제로, 마지막이면 결과. 저장은 바꾸지 않는다. */
    next,
    advance: () => {
      if (canAdvance) next();
    },
  };
}
