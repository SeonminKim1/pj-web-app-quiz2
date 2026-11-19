import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressProvider } from '../App.tsx';
import {
  createProgressStore,
  type ProgressStore,
} from '../data/progressRepository.ts';
import { getQuizTopic } from '../lib/quizTopics.ts';
import { buildStages, stagePlayPlan } from '../lib/stages.ts';
import type { QuizItem } from '../types/quiz.ts';
import { useProgress } from './useProgress.ts';
import {
  ADVANCE_DELAY_MS,
  initialStagePlayState,
  stagePlayReducer,
  useStagePlay,
} from './useStagePlay.ts';

const NONSENSE = getQuizTopic('nonsense');
const ITEMS: QuizItem[] = [
  {
    id: '1',
    question: '지구가 제일 힘들었던 시기는?',
    answer: '고생대',
    hints: ['시대 이름', '힘든 일'],
  },
  { id: '2', question: '진짜 새는?', answer: '참새' },
];

function setup(
  items: QuizItem[] = ITEMS,
  store: ProgressStore = createProgressStore({ storage: null }),
) {
  // 들어올 때의 진행으로 계획을 정한다(useStageSession과 같은 방식).
  const [stage] = buildStages({ items, stageSize: 10 });
  const solved = new Set(store.load().topics.nonsense?.solved ?? []);
  const plan = stagePlayPlan({ stage: stage!, solved });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ProgressProvider store={store}>{children}</ProgressProvider>
  );
  const view = renderHook(
    () => ({
      play: useStagePlay({ topic: NONSENSE, plan }),
      progress: useProgress().progress,
    }),
    { wrapper },
  );
  return { ...view, store };
}

// 입력창에 답을 쓰고 제출한다.
function type(result: ReturnType<typeof setup>['result'], text: string) {
  act(() => result.current.play.setInput(text));
  act(() => result.current.play.submit());
}

describe('stagePlayReducer', () => {
  it('4축 고르기: 연달아 고른 축이 모두 남는다(같은 렌더의 값으로 덮어쓰지 않음)', () => {
    let state = initialStagePlayState();
    for (const [axis, letter] of [
      [1, 'N'],
      [2, 'F'],
      [3, 'P'],
    ] as const) {
      state = stagePlayReducer(state, { type: 'pickAxis', axis, letter });
    }
    expect(state.input).toBe('_NFP');
    const judged = stagePlayReducer(state, {
      type: 'judged',
      correct: false,
      gold: 0,
    });
    // 채점 중에는 고르지 않는다.
    expect(
      stagePlayReducer(judged, { type: 'pickAxis', axis: 0, letter: 'E' })
        .input,
    ).toBe('_NFP');
  });

  it('틀린 답을 기억하고(오답 문구 유지), 다른 문제로 가면 잊는다', () => {
    const typed = stagePlayReducer(initialStagePlayState(), {
      type: 'input',
      value: 'ESFJ',
    });
    const wrong = stagePlayReducer(typed, {
      type: 'judged',
      correct: false,
      gold: 0,
    });
    expect(wrong.missedInput).toBe('ESFJ');
    expect(stagePlayReducer(wrong, { type: 'clear' }).missedInput).toBe('ESFJ');
    const moved = stagePlayReducer(wrong, {
      type: 'move',
      to: 1,
      solvedAnswer: undefined,
    });
    expect(moved.missedInput).toBeUndefined();
  });

  it('4축 고르기: 맞힌 뒤·결과 화면에서는 축을 바꾸지 않는다(보여 주는 정답이 그대로)', () => {
    const correct = stagePlayReducer(initialStagePlayState(), {
      type: 'judged',
      correct: true,
      gold: 10,
    });
    expect(
      stagePlayReducer(correct, { type: 'pickAxis', axis: 0, letter: 'E' }),
    ).toBe(correct);
    const result = stagePlayReducer(correct, { type: 'finish' });
    expect(
      stagePlayReducer(result, { type: 'pickAxis', axis: 0, letter: 'E' }),
    ).toBe(result);
  });

  it('answering이 아닐 때의 입력·채점은 무시한다', () => {
    const base = initialStagePlayState();
    const typed = stagePlayReducer(base, { type: 'input', value: '고생' });
    expect(typed.input).toBe('고생');
    const wrong = stagePlayReducer(typed, {
      type: 'judged',
      correct: false,
      gold: 0,
    });
    expect(wrong.phase).toBe('wrong');
    expect(stagePlayReducer(wrong, { type: 'input', value: 'x' })).toBe(wrong);
    expect(
      stagePlayReducer(wrong, { type: 'judged', correct: true, gold: 10 }),
    ).toBe(wrong);
  });

  it('채점·비우기(입력은 남김)·끝(한 번만)', () => {
    const typed = { ...initialStagePlayState(), input: '고생대' };
    const correct = stagePlayReducer(typed, {
      type: 'judged',
      correct: true,
      gold: 10,
    });
    expect(correct).toMatchObject({
      phase: 'correct',
      fresh: true,
      earned: { 0: 10 },
      correctCount: 1,
      goldTotal: 10,
    });
    expect(
      stagePlayReducer(correct, { type: 'judged', correct: true, gold: 10 }),
    ).toBe(correct);

    const wrong = stagePlayReducer(typed, {
      type: 'judged',
      correct: false,
      gold: 0,
    });
    expect(stagePlayReducer(wrong, { type: 'clear' })).toMatchObject({
      phase: 'answering',
      input: '고생대',
    });

    const done = stagePlayReducer(correct, { type: 'finish' });
    expect(done.phase).toBe('result');
    expect(stagePlayReducer(done, { type: 'finish' })).toBe(done);
  });

  it('이동: 쓰던 답을 남기고, 맞힌 문제는 정답 화면, 흔들림 중에도 이동', () => {
    const typed = { ...initialStagePlayState(), input: '고생' };
    const moved = stagePlayReducer(typed, {
      type: 'move',
      to: 1,
      solvedAnswer: undefined,
    });
    expect(moved).toMatchObject({
      index: 1,
      phase: 'answering',
      input: '',
      inputs: { 0: '고생' },
    });
    const back = stagePlayReducer(moved, {
      type: 'move',
      to: 0,
      solvedAnswer: undefined,
    });
    expect(back).toMatchObject({ index: 0, input: '고생' });

    const toSolved = stagePlayReducer(
      { ...typed, phase: 'wrong' },
      { type: 'move', to: 2, solvedAnswer: '참새' },
    );
    expect(toSolved).toMatchObject({
      index: 2,
      phase: 'correct',
      input: '참새',
      fresh: false,
    });
  });
});

describe('useStagePlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('정답을 제출하면 correct, 골드 +10과 푼 문제가 저장된다. 다음 → 다음 문제, 마지막 다음 → result', () => {
    const { result, store } = setup();
    expect(result.current.play.charCount).toBe(3);
    expect(result.current.play.wordLengths).toEqual([3]);

    type(result, '고생대');
    expect(result.current.play.state.phase).toBe('correct');
    expect(result.current.play.lastGold).toBe(10);
    expect(result.current.progress.gold).toBe(40);
    expect(store.load().topics.nonsense?.solved).toEqual(['1']);

    act(() => result.current.play.next());
    expect(result.current.play.item?.id).toBe('2');
    expect(result.current.play.state.input).toBe('');
    expect(result.current.play.isLast).toBe(true);
    type(result, '참 새');
    act(() => result.current.play.next());
    expect(result.current.play.state).toMatchObject({
      phase: 'result',
      correctCount: 2,
      goldTotal: 20,
    });
  });

  it('틀리면 wrong, 0.5초 뒤 answering(쓴 답은 남김). 그 사이 입력·제출은 무시', () => {
    const { result } = setup();
    type(result, '고대생');
    expect(result.current.play.state.phase).toBe('wrong');
    expect(result.current.play.canSubmit).toBe(false);

    act(() => result.current.play.setInput('고생대'));
    act(() => result.current.play.submit());
    expect(result.current.play.state).toMatchObject({
      phase: 'wrong',
      input: '고대생',
    });

    act(() => vi.advanceTimersByTime(500));
    expect(result.current.play.state).toMatchObject({
      phase: 'answering',
      input: '고대생',
    });
  });

  it('빈 입력·공백만이면 제출하지 않는다', () => {
    const { result } = setup();
    expect(result.current.play.canSubmit).toBe(false);
    type(result, '   ');
    expect(result.current.play.state.phase).toBe('answering');
  });

  it('Enter 연타(제출 두 번)해도 한 번만 채점·기록한다', () => {
    const { result } = setup();
    act(() => result.current.play.setInput('고생대'));
    act(() => {
      result.current.play.submit();
      result.current.play.submit();
    });
    expect(result.current.play.state.correctCount).toBe(1);
    expect(result.current.progress.gold).toBe(40);
  });

  it('힌트: 문장(무료) → 첫 글자(5골드) → 문장(5골드), 연타해도 한 번만 열리고, 힌트를 연 문제는 +5', () => {
    const { result } = setup();
    expect(result.current.play.hints).toMatchObject({
      next: { paid: false },
      canOpen: true,
    });

    act(() => {
      result.current.play.openNextHint();
      result.current.play.openNextHint();
    });
    expect(result.current.play.hints.opened.map((h) => h.text)).toEqual([
      '시대 이름',
    ]);
    expect(result.current.progress.gold).toBe(30);

    act(() => result.current.play.openNextHint());
    expect(result.current.progress.gold).toBe(25);
    expect(result.current.play.hints.opened.map((h) => h.text)).toEqual([
      '시대 이름',
      "첫 글자는 '고'예요",
    ]);
    act(() => result.current.play.openNextHint());
    expect(result.current.progress.gold).toBe(20);
    expect(result.current.play.hints).toMatchObject({
      next: undefined,
      canOpen: false,
    });

    type(result, '고생대');
    expect(result.current.play.lastGold).toBe(5);
    expect(result.current.progress.gold).toBe(25);
  });

  it('다음은 저장 변화 없이 다음 문제로, 마지막이면 result. 이전은 첫 문제에서 막힌다', () => {
    const { result, store } = setup();
    expect(result.current.play.canPrev).toBe(false);
    act(() => result.current.play.prev());
    expect(result.current.play.item?.id).toBe('1');
    act(() => result.current.play.next());
    expect(result.current.play.item?.id).toBe('2');
    expect(result.current.play.canPrev).toBe(true);
    act(() => result.current.play.next());
    expect(result.current.play.state).toMatchObject({
      phase: 'result',
      correctCount: 0,
    });
    expect(result.current.play.playable).toBe(2);
    expect(store.load().topics).toEqual({});
  });

  it('맞힌 뒤 "다음"(advance)은 0.4초 뒤부터 받는다. 그 전 advance는 무시, 마지막이면 result', () => {
    const { result } = setup();
    type(result, '고생대');
    expect(result.current.play.canAdvance).toBe(false);
    act(() => result.current.play.advance()); // 확인 연타: 무시
    expect(result.current.play.item?.id).toBe('1');

    act(() => vi.advanceTimersByTime(ADVANCE_DELAY_MS));
    expect(result.current.play.canAdvance).toBe(true);
    act(() => result.current.play.advance());
    expect(result.current.play.item?.id).toBe('2');
    expect(result.current.play.canAdvance).toBe(false); // answering

    type(result, '참새');
    act(() => vi.advanceTimersByTime(ADVANCE_DELAY_MS - 1));
    act(() => result.current.play.advance());
    expect(result.current.play.state.phase).toBe('correct');
    act(() => vi.advanceTimersByTime(1));
    act(() => result.current.play.advance());
    expect(result.current.play.state.phase).toBe('result');
  });

  it('이미 맞힌 문제로 옮겨 오면 "다음"을 바로 받고, 기다리는 중에 옮기면 타이머를 정리한다', () => {
    const { result } = setup();
    type(result, '고생대');
    act(() => result.current.play.next()); // 기다리는 중 이동
    expect(vi.getTimerCount()).toBe(0);
    act(() => result.current.play.prev());
    expect(result.current.play.canAdvance).toBe(true);
  });

  it('들어오기 전에 맞힌 문제는 건너뛰어 시작하고, 이전으로 가면 정답 화면(방해꾼 반응 없음)', () => {
    const store = createProgressStore({ storage: null });
    store.save({
      version: 1,
      gold: 30,
      topics: { nonsense: { solved: ['1'], hintsOpened: {} } },
    });
    const { result } = setup(ITEMS, store);
    expect(result.current.play.item?.id).toBe('2');
    expect(result.current.play.playable).toBe(1);

    act(() => result.current.play.prev());
    expect(result.current.play.state).toMatchObject({
      phase: 'correct',
      input: '고생대',
    });
    expect(result.current.play.lastGold).toBe(0);
    expect(result.current.play.pestPhase).toBe('answering');
    expect(result.current.play.canSubmit).toBe(false);
  });

  it('goTo는 그 자리 문제로 바로 가고(범위 밖은 무시), canNext는 마지막에서 false', () => {
    const { result } = setup();
    expect(result.current.play.canNext).toBe(true);
    act(() => result.current.play.goTo(1));
    expect(result.current.play.item?.id).toBe('2');
    expect(result.current.play.canNext).toBe(false);
    act(() => result.current.play.goTo(5));
    expect(result.current.play.item?.id).toBe('2');
  });

  it('이번에 맞힌 문제에 다시 오면 정답 화면과 얻은 골드가 남아 있다', () => {
    const { result } = setup();
    type(result, '고생대');
    expect(result.current.play.pestPhase).toBe('correct');
    act(() => result.current.play.next());
    act(() => result.current.play.prev());
    expect(result.current.play.state.phase).toBe('correct');
    expect(result.current.play.lastGold).toBe(10);
    expect(result.current.play.pestPhase).toBe('answering');
  });

  it('다시 풀기(이미 푼 문제)는 맞혀도 골드 0, 진행 그대로', () => {
    const store = createProgressStore({ storage: null });
    store.save({
      version: 1,
      gold: 30,
      topics: { nonsense: { solved: ['2'], hintsOpened: {} } },
    });
    const { result } = setup([ITEMS[1]!], store);
    type(result, '참새');
    expect(result.current.play.state.phase).toBe('correct');
    expect(result.current.play.lastGold).toBe(0);
    expect(result.current.progress.gold).toBe(30);
  });
});

describe('useProgress', () => {
  it('ProgressProvider 밖에서 쓰면 바로 알린다', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useProgress())).toThrow(
      'useProgress는 ProgressProvider 안에서만 쓸 수 있어요',
    );
    vi.restoreAllMocks();
  });
});
