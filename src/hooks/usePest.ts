// 방해꾼 행동(spec "행동 상태"). 상태 전이는 pestReducer 한 곳에서만 하고,
// 타이머·화면 숨김 감지·풀이 반응 같은 부수 효과는 hook이 맡는다. 위치 계산은 usePestMotion.
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { browserDragHint, type DragHint } from '../lib/dragHint.ts';
import type { RandomFn } from '../lib/random.ts';
import {
  INVITE_DELAY,
  PEST_LINE_MOOD,
  PEST_TIMING,
  pickLine,
  type PestBehavior,
  type PestLineKind,
  type PestMood,
} from '../lib/pest.ts';
import {
  getPestAnimal,
  nextCoverDelayFor,
  type PestAnimal,
} from '../lib/pestAnimals.ts';
import type { PlayPhase } from './useStagePlay.ts';

export type PestState = {
  behavior: PestBehavior;
  /** "날 잡아서 끌어 봐" 말을 거는 중(끄는 손 모양을 같이 보여 준다). */
  inviting: boolean;
  /** 간식을 먹을 때마다 1씩 는다(먹는 연출을 다시 시작). */
  fedId: number;
  /** covering에서 문제 위에 도착해 앉았는지(5초는 앉은 때부터). */
  seated: boolean;
  /** 끌기에서 놓인 뒤 어지러워하는 중(이동·가리기 안 함). */
  dizzy: boolean;
  mood: PestMood;
  /** 지금 말풍선 문구(없으면 말풍선 없음). */
  line: string | undefined;
  /** 말풍선을 띄울 때마다 1씩 늘어 2초 타이머를 새로 건다. */
  bubbleId: number;
  /** 가리기 예약 번호. 늘어날 때마다 15~30초 타이머를 새로 건다. */
  scheduleId: number;
  /** 가리기 시각이 지났지만 아직 못 가림(돌아다니는 중·풀이 중이 될 때 가림). */
  coverDue: boolean;
};

export type PestAction =
  | { type: 'coverDue' }
  | { type: 'coverStart' }
  | { type: 'seat'; line: string; invite?: boolean }
  | { type: 'leave' }
  | { type: 'tap'; line: string }
  | { type: 'feed'; line: string }
  | { type: 'grab'; line: string }
  | { type: 'drop'; line: string }
  | { type: 'invite'; line: string }
  | { type: 'dizzyEnd' }
  | { type: 'arrive' }
  | { type: 'react'; kind: PestLineKind; line: string }
  | { type: 'bubbleEnd'; bubbleId: number }
  | { type: 'hide' }
  | { type: 'show' };

/** 처음 상태. 화면이 숨겨진 채로 시작하면 paused. */
export function initialPestState(hidden = false): PestState {
  return {
    behavior: hidden ? 'paused' : 'roaming',
    seated: false,
    fedId: 0,
    inviting: false,
    dizzy: false,
    mood: 'idle',
    line: undefined,
    bubbleId: 0,
    scheduleId: 0,
    coverDue: false,
  };
}

// 말풍선과 반응을 함께 띄운다.
function say({
  state,
  kind,
  line,
}: {
  state: PestState;
  kind: PestLineKind;
  line: string;
}): PestState {
  return {
    ...state,
    mood: PEST_LINE_MOOD[kind],
    line,
    bubbleId: state.bubbleId + 1,
    inviting: kind === 'invite',
  };
}

// 가리던 중에 끝나면(잡힘·끌림) 다음 가리기 시각을 새로 정한다.
function endCover(state: PestState): Pick<PestState, 'scheduleId' | 'seated'> {
  return {
    scheduleId:
      state.behavior === 'covering' ? state.scheduleId + 1 : state.scheduleId,
    seated: false,
  };
}

/** 방해꾼 상태 전이. 맞지 않는 상태에서 온 동작은 무시한다(연타·늦게 온 타이머). */
export function pestReducer(state: PestState, action: PestAction): PestState {
  switch (action.type) {
    case 'coverDue':
      if (state.behavior === 'paused') return state;
      return { ...state, coverDue: true };
    case 'coverStart':
      if (state.behavior !== 'roaming' || state.dizzy || !state.coverDue) {
        return state;
      }
      return { ...state, behavior: 'covering', seated: false, coverDue: false };
    case 'seat':
      if (state.behavior !== 'covering' || state.seated) return state;
      return {
        ...say({
          state,
          kind: action.invite ? 'invite' : 'cover',
          line: action.line,
        }),
        seated: true,
      };
    case 'invite':
      // 돌아다니며 아무 말도 안 하고 있을 때만.
      if (state.behavior !== 'roaming' || state.dizzy || state.line) {
        return state;
      }
      return say({ state, kind: 'invite', line: action.line });
    case 'leave':
      if (state.behavior !== 'covering' || !state.seated) return state;
      return {
        ...state,
        behavior: 'roaming',
        seated: false,
        mood: state.mood === 'smug' ? 'idle' : state.mood,
        line: state.mood === 'smug' ? undefined : state.line,
        scheduleId: state.scheduleId + 1,
      };
    case 'tap':
      if (state.behavior !== 'roaming' && state.behavior !== 'covering') {
        return state;
      }
      return {
        ...say({ state, kind: 'caught', line: action.line }),
        ...endCover(state),
        behavior: 'fleeing',
        dizzy: false,
      };
    case 'feed':
      // 간식: 가리던 중이면 내려와서 먹는다. 끌리는 중·숨김 중이면 무시.
      if (state.behavior !== 'roaming' && state.behavior !== 'covering') {
        return state;
      }
      return {
        ...say({ state, kind: 'treat', line: action.line }),
        ...endCover(state),
        behavior: 'roaming',
        dizzy: false,
        fedId: state.fedId + 1,
      };
    case 'grab':
      if (
        state.behavior !== 'roaming' &&
        state.behavior !== 'covering' &&
        state.behavior !== 'fleeing'
      ) {
        return state;
      }
      return {
        ...say({ state, kind: 'dragged', line: action.line }),
        ...endCover(state),
        behavior: 'dragged',
        dizzy: false,
      };
    case 'drop':
      if (state.behavior !== 'dragged') return state;
      return {
        ...say({ state, kind: 'dropped', line: action.line }),
        behavior: 'roaming',
        dizzy: true,
      };
    case 'dizzyEnd':
      if (!state.dizzy) return state;
      return { ...state, dizzy: false };
    case 'arrive':
      if (state.behavior !== 'fleeing') return state;
      return { ...state, behavior: 'roaming' };
    case 'react':
      if (state.behavior === 'paused') return state;
      return say({ state, kind: action.kind, line: action.line });
    case 'bubbleEnd':
      if (action.bubbleId !== state.bubbleId) return state;
      return {
        ...state,
        mood: state.behavior === 'covering' && state.seated ? 'smug' : 'idle',
        line: undefined,
        inviting: false,
      };
    case 'hide':
      return {
        ...state,
        behavior: 'paused',
        seated: false,
        dizzy: false,
        mood: 'idle',
        line: undefined,
        coverDue: false,
      };
    case 'show':
      if (state.behavior !== 'paused') return state;
      return {
        ...state,
        behavior: 'roaming',
        scheduleId: state.scheduleId + 1,
      };
  }
}

/** 화면에 그릴 방해꾼 행동과 사용자·움직임이 부르는 동작. */
export type PestView = {
  behavior: PestBehavior;
  seated: boolean;
  dizzy: boolean;
  mood: PestMood;
  line: string | undefined;
  /** 탭(키보드 Enter/Space): 도망. */
  tap: () => void;
  /** 간식 주기(무료, 아무 때나): 기뻐하며 먹는다. */
  feed: () => void;
  /** 먹은 횟수(먹는 연출 키). */
  fedId: number;
  /** "끌어 봐"라고 말을 거는 중. */
  inviting: boolean;
  /** 끌기 시작. */
  grab: () => void;
  /** 끌기를 놓음. */
  drop: () => void;
  /** 움직임이 문제 위에 도착했을 때(늦어도 1.5초 뒤에는 앉는다). */
  seat: () => void;
  /** 움직임이 도망 지점에 도착했을 때(늦어도 0.8초 뒤에는 도착한다). */
  arrive: () => void;
};

/** 방해꾼 hook. phase는 풀이 상태(가리기 미루기·정답/오답 반응에 쓴다). */
export function usePest({
  phase,
  animal = getPestAnimal('rabbit'),
  random = Math.random,
  dragHint = browserDragHint,
}: {
  phase: PlayPhase;
  /** 끌어 본 적이 있는지(없으면 "끌어 봐"라고 알려 준다). 테스트에서 바꿔 넣는다. */
  dragHint?: DragHint;
  /** 고른 방해꾼 동물(가리기 간격). 기본 토끼. */
  animal?: PestAnimal;
  random?: RandomFn;
}): PestView {
  const [state, dispatch] = useReducer(pestReducer, undefined, () =>
    initialPestState(typeof document !== 'undefined' && document.hidden),
  );
  const { behavior, seated, dizzy, scheduleId, coverDue, bubbleId, line } =
    state;
  const paused = behavior === 'paused';
  const finished = phase === 'result';

  // 가리기 예약: 예약 번호가 바뀔 때마다 그 동물의 가리기 간격(토끼 15~30초 등) 타이머. 숨겨진 동안은 걸지 않는다.
  useEffect(() => {
    // 스테이지 결과 화면에서는 가리기를 예약하지 않는다(방해꾼이 없음).
    if (paused || finished) return;
    const timer = setTimeout(
      () => dispatch({ type: 'coverDue' }),
      nextCoverDelayFor({ animal, random }),
    );
    return () => clearTimeout(timer);
  }, [scheduleId, paused, finished, random, animal]);

  // 가리기 시각이 지났고, 돌아다니는 중(어지럽지 않음)이고, 답을 고르는 중이면 가리러 간다.
  useEffect(() => {
    if (coverDue && behavior === 'roaming' && !dizzy && phase === 'answering') {
      dispatch({ type: 'coverStart' });
    }
  }, [coverDue, behavior, dizzy, phase]);

  // 상태별 시간: 가리러 가기 최대 1.5초 → 앉음, 앉은 지 5초 → 떠남,
  // 도망 0.8초 → 도착, 어지러움 1초 → 끝. 움직임이 먼저 알리면 그때 바뀐다.
  useEffect(() => {
    const after = (ms: number, action: PestAction) => {
      const timer = setTimeout(() => dispatch(action), ms);
      return () => clearTimeout(timer);
    };
    if (behavior === 'covering' && !seated) {
      return after(PEST_TIMING.coverTravelMax, {
        type: 'seat',
        line: pickLine({ kind: 'cover', random }),
      });
    }
    if (behavior === 'covering' && seated) {
      return after(PEST_TIMING.coverDuration, { type: 'leave' });
    }
    if (behavior === 'fleeing') {
      return after(PEST_TIMING.fleeDuration, { type: 'arrive' });
    }
    if (behavior === 'roaming' && dizzy) {
      return after(PEST_TIMING.dizzyDuration, { type: 'dizzyEnd' });
    }
  }, [behavior, seated, dizzy, random]);

  // 아직 끌어 본 적 없으면, 들어와서 잠시 뒤 한 번 "날 잡아서 끌어 봐~".
  useEffect(() => {
    if (dragHint.known()) return;
    const timer = setTimeout(
      () =>
        dispatch({
          type: 'invite',
          line: pickLine({ kind: 'invite', random }),
        }),
      INVITE_DELAY,
    );
    return () => clearTimeout(timer);
  }, [dragHint, random]);

  // 말풍선 2초 뒤 내림. 새 말풍선이 뜨면 이전 타이머는 정리된다.
  useEffect(() => {
    if (line === undefined) return;
    const timer = setTimeout(
      () => dispatch({ type: 'bubbleEnd', bubbleId }),
      PEST_TIMING.bubbleDuration,
    );
    return () => clearTimeout(timer);
  }, [bubbleId, line]);

  // 풀이 상태가 오답·정답으로 바뀌는 순간에만 반응한다.
  const previousPhase = useRef(phase);
  useEffect(() => {
    if (previousPhase.current === phase) return;
    previousPhase.current = phase;
    if (phase === 'wrong' || phase === 'correct') {
      dispatch({
        type: 'react',
        kind: phase,
        line: pickLine({ kind: phase, random }),
      });
    }
  }, [phase, random]);

  // 탭 전환·백그라운드: 숨겨지면 멈추고, 보이면 다시 돌아다닌다.
  useEffect(() => {
    const onChange = (): void =>
      dispatch({ type: document.hidden ? 'hide' : 'show' });
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  const tap = useCallback(
    () => dispatch({ type: 'tap', line: pickLine({ kind: 'caught', random }) }),
    [random],
  );
  const feed = useCallback(
    () => dispatch({ type: 'feed', line: pickLine({ kind: 'treat', random }) }),
    [random],
  );
  const grab = useCallback(() => {
    dragHint.learned();
    dispatch({ type: 'grab', line: pickLine({ kind: 'dragged', random }) });
  }, [random, dragHint]);
  const drop = useCallback(
    () =>
      dispatch({ type: 'drop', line: pickLine({ kind: 'dropped', random }) }),
    [random],
  );
  const seat = useCallback(() => {
    // 아직 끌어 본 적 없으면, 문제를 가릴 때 "치우고 싶으면 끌어 봐"라고 알려 준다.
    const invite = !dragHint.known();
    dispatch({
      type: 'seat',
      invite,
      line: pickLine({ kind: invite ? 'invite' : 'cover', random }),
    });
  }, [random, dragHint]);
  const arrive = useCallback(() => dispatch({ type: 'arrive' }), []);

  return {
    behavior,
    seated,
    dizzy,
    mood: state.mood,
    line,
    tap,
    feed,
    fedId: state.fedId,
    inviting: state.inviting,
    grab,
    drop,
    seat,
    arrive,
  };
}
