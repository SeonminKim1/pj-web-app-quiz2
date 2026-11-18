import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PEST_LINES, PEST_TIMING } from '../lib/pest.ts';
import { getPestAnimal } from '../lib/pestAnimals.ts';
import { initialPestState, pestReducer, usePest } from './usePest.ts';
import { INVITE_DELAY } from '../lib/pest.ts';
import type { PlayPhase } from './useStagePlay.ts';

// 난수 0: 가리기 간격 15초, 문구는 목록의 첫 번째.
const random = () => 0;
// 난수 0이면 그 동물(기본 토끼)의 가장 짧은 가리기 간격.
const COVER_AT = getPestAnimal('rabbit').coverDelay.min;
const KNOWN = { known: () => true, learned: () => {} };

function setup(initialPhase: PlayPhase = 'answering') {
  // 이 테스트들은 끌기를 이미 아는 사람 기준("끌어 봐" 안내 없음). 안내는 아래 따로.
  return renderHook(
    ({ phase }) => usePest({ phase, random, dragHint: KNOWN }),
    {
      initialProps: { phase: initialPhase },
    },
  );
}

type Result = ReturnType<typeof setup>['result'];

// 15초 기다려 가리러 가고, 움직임이 도착을 알려 앉는다.
function coverAndSit(result: Result) {
  act(() => vi.advanceTimersByTime(COVER_AT));
  act(() => result.current.seat());
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => false,
  });
});

describe('pestReducer', () => {
  it('맞지 않는 상태의 동작은 무시한다', () => {
    const roaming = initialPestState();
    expect(pestReducer(roaming, { type: 'coverStart' })).toBe(roaming);
    expect(pestReducer(roaming, { type: 'seat', line: 'x' })).toBe(roaming);
    expect(pestReducer(roaming, { type: 'leave' })).toBe(roaming);
    expect(pestReducer(roaming, { type: 'arrive' })).toBe(roaming);
    expect(pestReducer(roaming, { type: 'drop', line: 'x' })).toBe(roaming);
    expect(pestReducer(roaming, { type: 'dizzyEnd' })).toBe(roaming);

    const fleeing = pestReducer(roaming, { type: 'tap', line: 'x' });
    expect(pestReducer(fleeing, { type: 'tap', line: 'y' })).toBe(fleeing);
    const dragged = pestReducer(fleeing, { type: 'grab', line: 'x' });
    expect(dragged.behavior).toBe('dragged');
    expect(pestReducer(dragged, { type: 'tap', line: 'y' })).toBe(dragged);
    expect(pestReducer(dragged, { type: 'grab', line: 'y' })).toBe(dragged);

    const paused = initialPestState(true);
    expect(pestReducer(paused, { type: 'coverDue' })).toBe(paused);
    expect(pestReducer(paused, { type: 'tap', line: 'x' })).toBe(paused);
    expect(pestReducer(paused, { type: 'grab', line: 'x' })).toBe(paused);
  });

  it('어지러운 동안은 가리러 가지 않는다', () => {
    const dizzy = {
      ...initialPestState(),
      coverDue: true,
      dizzy: true,
    };
    expect(pestReducer(dizzy, { type: 'coverStart' })).toBe(dizzy);
  });
});

describe('usePest', () => {
  it('15초 뒤 가리러 가고, 도착하면 앉아서 말풍선, 앉은 지 5초 뒤 떠난다', () => {
    const { result } = setup();
    expect(result.current).toMatchObject({ behavior: 'roaming', mood: 'idle' });

    act(() => vi.advanceTimersByTime(COVER_AT - 1));
    expect(result.current.behavior).toBe('roaming');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toMatchObject({
      behavior: 'covering',
      seated: false,
    });

    act(() => result.current.seat());
    expect(result.current).toMatchObject({
      seated: true,
      mood: 'smug',
      line: PEST_LINES.cover[0],
    });
    act(() => vi.advanceTimersByTime(PEST_TIMING.coverDuration - 1));
    expect(result.current.behavior).toBe('covering');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toMatchObject({ behavior: 'roaming', mood: 'idle' });

    // 떠난 뒤 다시 15초 뒤에 가리러 간다.
    act(() => vi.advanceTimersByTime(COVER_AT));
    expect(result.current.behavior).toBe('covering');
  });

  it('움직임이 도착을 알리지 않아도 1.5초 뒤에는 앉는다', () => {
    const { result } = setup();
    act(() => vi.advanceTimersByTime(COVER_AT));
    act(() => vi.advanceTimersByTime(PEST_TIMING.coverTravelMax));
    expect(result.current).toMatchObject({
      behavior: 'covering',
      seated: true,
    });
  });

  it('가리는 중 탭 → 도망(놀람 + 잡힘 문구), 0.8초 뒤 돌아다님, 다음 가리기는 새로 15초', () => {
    const { result } = setup();
    coverAndSit(result);
    act(() => result.current.tap());
    expect(result.current).toMatchObject({
      behavior: 'fleeing',
      mood: 'surprised',
      line: PEST_LINES.caught[0],
    });
    act(() => result.current.tap());
    expect(result.current.behavior).toBe('fleeing');

    act(() => vi.advanceTimersByTime(PEST_TIMING.fleeDuration));
    expect(result.current.behavior).toBe('roaming');
    act(() => vi.advanceTimersByTime(COVER_AT - PEST_TIMING.fleeDuration - 1));
    expect(result.current.behavior).toBe('roaming');
    act(() => vi.advanceTimersByTime(PEST_TIMING.fleeDuration + 1));
    expect(result.current.behavior).toBe('covering');
  });

  it('움직임이 먼저 도착을 알리면 그때 돌아다닌다', () => {
    const { result } = setup();
    act(() => result.current.tap());
    act(() => result.current.arrive());
    expect(result.current.behavior).toBe('roaming');
  });

  it('끌기: 잡으면 매달리고, 놓으면 1초 어지러워한 뒤(그동안 가리지 않음) 다시 가린다', () => {
    const { result } = setup();
    act(() => vi.advanceTimersByTime(COVER_AT - 500));
    act(() => result.current.grab());
    expect(result.current).toMatchObject({
      behavior: 'dragged',
      mood: 'surprised',
    });
    // 끄는 동안 가리기 시각이 지나도 가리지 않는다.
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.behavior).toBe('dragged');

    act(() => result.current.drop());
    expect(result.current).toMatchObject({ behavior: 'roaming', dizzy: true });
    act(() => vi.advanceTimersByTime(PEST_TIMING.dizzyDuration - 1));
    expect(result.current.behavior).toBe('roaming');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toMatchObject({
      behavior: 'covering',
      dizzy: false,
    });
  });

  it('돌아다니다 잡혀도 다음 가리기 시각은 그대로', () => {
    const { result } = setup();
    act(() => vi.advanceTimersByTime(10_000));
    act(() => result.current.tap());
    act(() => vi.advanceTimersByTime(PEST_TIMING.fleeDuration));
    act(() =>
      vi.advanceTimersByTime(COVER_AT - 10_000 - PEST_TIMING.fleeDuration),
    );
    expect(result.current.behavior).toBe('covering');
  });

  it('답을 고르는 중이 아니면 가리기를 미뤘다가 answering이 되면 바로 간다', () => {
    const { result, rerender } = setup();
    rerender({ phase: 'correct' });
    act(() => vi.advanceTimersByTime(COVER_AT));
    expect(result.current.behavior).toBe('roaming');
    rerender({ phase: 'answering' });
    expect(result.current.behavior).toBe('covering');
  });

  it('오답이면 비웃고 정답이면 삐친다. 말풍선은 2초 뒤 내려간다', () => {
    const { result, rerender } = setup();
    rerender({ phase: 'wrong' });
    expect(result.current).toMatchObject({
      mood: 'taunt',
      line: PEST_LINES.wrong[0],
    });
    rerender({ phase: 'answering' });
    rerender({ phase: 'correct' });
    expect(result.current).toMatchObject({
      mood: 'sulky',
      line: PEST_LINES.correct[0],
    });
    act(() => vi.advanceTimersByTime(PEST_TIMING.bubbleDuration));
    expect(result.current).toMatchObject({ mood: 'idle', line: undefined });
  });

  it('화면이 숨겨지면 멈추고, 다시 보이면 돌아다니며 가리기 시각을 새로 정한다', () => {
    const { result } = setup();
    coverAndSit(result);
    setHidden(true);
    expect(result.current.behavior).toBe('paused');
    act(() => vi.advanceTimersByTime(COVER_AT * 3));
    expect(result.current.behavior).toBe('paused');

    setHidden(false);
    expect(result.current.behavior).toBe('roaming');
    act(() => vi.advanceTimersByTime(COVER_AT));
    expect(result.current.behavior).toBe('covering');
  });

  it('언마운트하면 타이머와 이벤트를 정리한다', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const { unmount } = setup();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
    remove.mockRestore();
  });

  it('스테이지 결과 화면에서는 가리기를 예약하지 않는다', () => {
    const { result, rerender } = setup();
    rerender({ phase: 'result' });
    act(() => vi.advanceTimersByTime(COVER_AT * 3));
    expect(result.current.behavior).toBe('roaming');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('강아지는 토끼보다 늦게(30초부터) 가리러 간다', () => {
    const dog = getPestAnimal('dog');
    const { result } = renderHook(() =>
      usePest({ phase: 'answering', animal: dog, random }),
    );
    act(() => vi.advanceTimersByTime(COVER_AT));
    expect(result.current.behavior).toBe('roaming');
    act(() => vi.advanceTimersByTime(dog.coverDelay.min - COVER_AT));
    expect(result.current.behavior).toBe('covering');
  });
});

describe('끌기 안내', () => {
  function fresh() {
    let known = false;
    const hint = { known: () => known, learned: () => void (known = true) };
    const view = renderHook(() =>
      usePest({ phase: 'answering', random, dragHint: hint }),
    );
    return { ...view, hint };
  }

  it('끌어 본 적 없으면 잠시 뒤 "날 잡아서 끌어 봐~"라고 말을 건다', () => {
    const { result } = fresh();
    act(() => vi.advanceTimersByTime(INVITE_DELAY));
    expect(result.current.line).toBe(PEST_LINES.invite[0]);
    expect(result.current.inviting).toBe(true);
  });

  it('문제를 가릴 때도 끌어서 치우라고 알려 주고, 한 번 끌면 그만한다', () => {
    const { result, hint } = fresh();
    act(() => vi.advanceTimersByTime(COVER_AT));
    act(() => result.current.seat());
    expect(result.current.line).toBe(PEST_LINES.invite[0]);
    act(() => result.current.grab());
    expect(hint.known()).toBe(true);
    expect(result.current.line).toBe(PEST_LINES.dragged[0]);
    expect(result.current.inviting).toBe(false);
    act(() => result.current.drop());
    expect(result.current.line).toBe(PEST_LINES.dropped[0]);
  });
});
