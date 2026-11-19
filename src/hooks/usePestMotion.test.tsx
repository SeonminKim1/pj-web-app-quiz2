import { act, renderHook } from '@testing-library/react';
import type { PointerEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPestAnimal } from '../lib/pestAnimals.ts';
import {
  NUDGE_STEP,
  areaBounds,
  isInside,
  playgroundBounds,
} from '../lib/pestMotion.ts';
import type { PestView } from './usePest.ts';
import { usePestMotion, type PestFrame } from './usePestMotion.ts';

const AREA = { left: 10, top: 20, width: 360, height: 600 };
const B = areaBounds(AREA);

function element(rect: {
  left: number;
  top: number;
  width: number;
  height: number;
}) {
  const el = document.createElement('div');
  el.getBoundingClientRect = () =>
    ({
      ...rect,
      x: rect.left,
      y: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      toJSON: () => ({}),
    }) as DOMRect;
  return el;
}

function fakePest(overrides: Partial<PestView> = {}): PestView {
  return {
    behavior: 'roaming',
    seated: false,
    dizzy: false,
    mood: 'idle',
    line: undefined,
    tap: vi.fn(),
    feed: vi.fn(),
    hint: vi.fn(),
    fedId: 0,
    inviting: false,
    grab: vi.fn(),
    drop: vi.fn(),
    seat: vi.fn(),
    arrive: vi.fn(),
    ...overrides,
  };
}

function setup(pest: PestView, random = () => 0) {
  const areaRef = { current: element(AREA) };
  // 문제 문장: 영역 안 (40, 100) ~ (320, 140).
  const coverRef = {
    current: element({
      left: AREA.left + 40,
      top: AREA.top + 100,
      width: 280,
      height: 40,
    }),
  };
  const view = renderHook(
    ({ pest: current, active }: { pest: PestView; active?: boolean }) =>
      usePestMotion({ pest: current, areaRef, coverRef, random, active }),
    { initialProps: { pest } as { pest: PestView; active?: boolean } },
  );
  const frames: PestFrame[] = [];
  act(() => {
    view.result.current.subscribe((frame) => frames.push({ ...frame }));
  });
  const last = () => frames.at(-1)!;
  return { ...view, frames, last };
}

const pointer = (x: number, y: number, pointerId = 1) =>
  ({
    pointerId,
    clientX: x,
    clientY: y,
    currentTarget: { setPointerCapture: vi.fn() },
  }) as unknown as PointerEvent<HTMLElement>;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('usePestMotion', () => {
  it('처음 위치는 영역 안이고, 구독하면 바로 한 번 받는다', () => {
    const { frames, last } = setup(fakePest());
    expect(frames.length).toBeGreaterThan(0);
    expect(last()).toMatchObject({ x: B.left, y: B.top });
    expect(last().size).toBeGreaterThanOrEqual(44);
  });

  it('돌아다니면 목표 쪽으로 움직이며 깡충 뛴다(영역 밖으로 나가지 않음)', () => {
    const random = vi
      .fn()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValue(1);
    const { last, frames } = setup(fakePest(), random);
    act(() => vi.advanceTimersByTime(500));
    const now = last();
    expect(now.x).toBeGreaterThan(B.left);
    expect(now.y).toBeGreaterThan(B.top);
    expect(frames.some((f) => f.hop > 0)).toBe(true);
    for (const f of frames) {
      expect(f.x).toBeLessThanOrEqual(B.right);
      expect(f.y).toBeLessThanOrEqual(B.bottom);
    }
  });

  it('가리러 가면 1.5초 안에 문제 위에 도착해 seat를 알린다', () => {
    const pest = fakePest({ behavior: 'covering', seated: false });
    const { last } = setup(pest);
    act(() => vi.advanceTimersByTime(1500));
    expect(pest.seat).toHaveBeenCalled();
    expect(last().x).toBeCloseTo(40 + 140);
    expect(last().y).toBeGreaterThan(120);
  });

  it('시간이 먼저 끝나 앉은 상태가 돼도 문제 위까지 간 뒤 머문다', () => {
    const pest = fakePest({ behavior: 'covering', seated: false });
    const { rerender, last } = setup(pest);
    act(() => vi.advanceTimersByTime(100));
    rerender({ pest: { ...pest, seated: true } });
    act(() => vi.advanceTimersByTime(1500));
    expect(last().x).toBeCloseTo(40 + 140);
    const sat = last();
    act(() => vi.advanceTimersByTime(1000));
    expect(last()).toMatchObject({ x: sat.x, y: sat.y, hop: 0 });
  });

  it('도망은 가장 먼 모서리로 0.8초 안에 도착해 arrive를 알린다', () => {
    const pest = fakePest({ behavior: 'fleeing' });
    const { last } = setup(pest);
    act(() => vi.advanceTimersByTime(800));
    expect(pest.arrive).toHaveBeenCalled();
    expect(last()).toMatchObject({
      x: B.right,
      y: B.bottom,
    });
  });

  it('조금만 움직이고 떼면 탭, 8px 넘게 움직이면 끌기(그 뒤 click은 무시)', () => {
    const pest = fakePest();
    const { result, rerender, last } = setup(pest);
    const h = () => result.current.handlers;

    act(() => {
      h().onPointerDown(pointer(100, 100));
      h().onPointerMove(pointer(104, 103));
      h().onPointerUp(pointer(104, 103));
      h().onClick();
    });
    expect(pest.tap).toHaveBeenCalledTimes(1);
    expect(pest.grab).not.toHaveBeenCalled();

    act(() => {
      h().onPointerDown(pointer(100, 100));
      h().onPointerMove(pointer(130, 100));
    });
    expect(pest.grab).toHaveBeenCalledTimes(1);
    rerender({ pest: { ...pest, behavior: 'dragged' } });
    act(() => h().onPointerMove(pointer(AREA.left + 200, AREA.top + 300)));
    expect(last().x).toBe(200);
    expect(last().y).toBeGreaterThan(300);
    act(() => {
      h().onPointerUp(pointer(AREA.left + 200, AREA.top + 300));
      h().onClick();
    });
    expect(pest.drop).toHaveBeenCalledTimes(1);
    expect(pest.tap).toHaveBeenCalledTimes(1);
  });

  it('끌어서 영역 밖에 놓아도 가장자리에 붙는다', () => {
    const pest = fakePest();
    const { result, rerender, last } = setup(pest);
    act(() => {
      result.current.handlers.onPointerDown(pointer(100, 100));
      result.current.handlers.onPointerMove(pointer(200, 100));
    });
    rerender({ pest: { ...pest, behavior: 'dragged' } });
    act(() => result.current.handlers.onPointerMove(pointer(-500, 5000)));
    expect(last()).toMatchObject({
      x: B.left,
      y: B.bottom,
    });
  });

  it('방향키로 옮기고, 가리던 중이면 끌기처럼 가리기를 끝낸다', () => {
    const pest = fakePest({ behavior: 'covering', seated: true });
    const { result, last } = setup(pest);
    const before = last();
    const preventDefault = vi.fn();
    act(() =>
      result.current.handlers.onKeyDown({
        key: 'ArrowRight',
        preventDefault,
      } as never),
    );
    expect(last().x).toBe(before.x + NUDGE_STEP);
    expect(preventDefault).toHaveBeenCalled();
    expect(pest.grab).toHaveBeenCalled();
    expect(pest.drop).toHaveBeenCalled();

    act(() =>
      result.current.handlers.onKeyDown({ key: 'a', preventDefault } as never),
    );
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('화면이 숨겨지면(paused) 프레임 루프를 멈추고, 언마운트하면 정리한다', () => {
    const { frames, rerender, unmount } = setup(fakePest());
    rerender({ pest: fakePest({ behavior: 'paused' }) });
    const count = frames.length;
    act(() => vi.advanceTimersByTime(1000));
    expect(frames.length).toBe(count);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('움직임 줄이기면 왼쪽 아래에 가만히 있고 깡충 뛰지 않는다', () => {
    // jsdom에는 matchMedia가 없어 직접 넣는다.
    vi.stubGlobal('matchMedia', () => ({ matches: true }) as MediaQueryList);
    const { last, frames } = setup(fakePest());
    act(() => vi.advanceTimersByTime(3000));
    expect(last()).toMatchObject({
      x: B.left,
      y: B.bottom,
      hop: 0,
    });
    expect(frames.every((f) => f.hop === 0)).toBe(true);
    vi.unstubAllGlobals();
  });

  it('누르고 있는 동안 다른 손가락은 무시하고, 포인터를 놓치면 놓기로 친다', () => {
    const pest = fakePest();
    const { result } = setup(pest);
    const h = () => result.current.handlers;
    act(() => {
      h().onPointerDown(pointer(100, 100, 1));
      h().onPointerMove(pointer(140, 100, 1));
      // 두 번째 손가락이 눌러도 첫 손가락의 끌기가 그대로다.
      h().onPointerDown(pointer(200, 200, 2));
      h().onPointerUp(pointer(200, 200, 2));
    });
    expect(pest.grab).toHaveBeenCalledTimes(1);
    expect(pest.drop).not.toHaveBeenCalled();
    act(() => h().onLostPointerCapture(pointer(140, 100, 1)));
    expect(pest.drop).toHaveBeenCalledTimes(1);
    // 놓은 뒤에는 새로 누를 수 있다.
    act(() => {
      h().onPointerDown(pointer(100, 100, 3));
      h().onPointerMove(pointer(140, 100, 3));
    });
    expect(pest.grab).toHaveBeenCalledTimes(2);
  });

  it('결과 화면(active: false)에서는 프레임 루프를 멈춘다', () => {
    const { frames, rerender } = setup(fakePest());
    rerender({ pest: fakePest(), active: false });
    const count = frames.length;
    act(() => vi.advanceTimersByTime(1000));
    expect(frames.length).toBe(count);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('다시 그려져도 같은 움직임 객체를 돌려준다(구독을 다시 하지 않게)', () => {
    const pest = fakePest();
    const { result, rerender } = setup(pest);
    const first = result.current;
    rerender({ pest: { ...pest, mood: 'taunt' } });
    expect(result.current).toBe(first);
  });

  it('움직임 줄이기에서 방향키로 옮기면 그 자리에 머문다', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }) as MediaQueryList);
    const { result, last } = setup(fakePest());
    act(() =>
      result.current.handlers.onKeyDown({
        key: 'ArrowUp',
        preventDefault: () => {},
      } as never),
    );
    const moved = last();
    act(() => vi.advanceTimersByTime(5000));
    expect(last()).toMatchObject({ x: moved.x, y: moved.y });
    vi.unstubAllGlobals();
  });

  describe('놀이터·동물', () => {
    // 놀이터 띠: 놀이 영역 맨 위 88px(문제는 그 아래).
    const PG_TOP = 0;
    const PG_HEIGHT = 88;
    const PG = playgroundBounds({
      area: AREA,
      top: PG_TOP,
      bottom: PG_TOP + PG_HEIGHT,
    });

    function setupWith({
      pest,
      animal = getPestAnimal('rabbit'),
      random = () => 0,
    }: {
      pest: PestView;
      animal?: ReturnType<typeof getPestAnimal>;
      random?: () => number;
    }) {
      const areaRef = { current: element(AREA) };
      const coverRef = {
        current: element({
          left: AREA.left + 40,
          top: AREA.top + 100,
          width: 280,
          height: 40,
        }),
      };
      const playgroundRef = {
        current: element({
          left: AREA.left,
          top: AREA.top + PG_TOP,
          width: AREA.width,
          height: PG_HEIGHT,
        }),
      };
      const view = renderHook(() =>
        usePestMotion({
          pest,
          areaRef,
          coverRef,
          playgroundRef,
          animal,
          random,
        }),
      );
      const frames: PestFrame[] = [];
      act(() => {
        view.result.current.subscribe((frame) => frames.push({ ...frame }));
      });
      return { frames, last: () => frames.at(-1)! };
    }

    it('평소에는 놀이터 안에서만 다니고, 두리번거리는 동안 resting', () => {
      const random = vi.fn().mockReturnValue(0.5);
      const { frames } = setupWith({ pest: fakePest(), random });
      act(() => vi.advanceTimersByTime(4000));
      for (const f of frames) {
        expect(f.y).toBeGreaterThanOrEqual(PG.top - 1);
        expect(f.y).toBeLessThanOrEqual(PG.bottom + 1);
      }
      expect(frames.some((f) => f.resting)).toBe(true);
      expect(frames.some((f) => !f.resting)).toBe(true);
    });

    it('도망은 놀이터 안 가장 먼 모서리로', () => {
      const pest = fakePest({ behavior: 'fleeing' });
      const { last } = setupWith({ pest });
      act(() => vi.advanceTimersByTime(800));
      expect(pest.arrive).toHaveBeenCalled();
      expect(isInside({ point: last(), bounds: PG })).toBe(true);
    });

    it('움직임 줄이기면 놀이터 왼쪽 아래에 가만히 있다', () => {
      vi.stubGlobal('matchMedia', () => ({ matches: true }) as MediaQueryList);
      const { last } = setupWith({ pest: fakePest() });
      act(() => vi.advanceTimersByTime(3000));
      expect(last()).toMatchObject({ x: PG.left, y: PG.bottom, hop: 0 });
      vi.unstubAllGlobals();
    });

    it('가리러 갈 때는 놀이터를 벗어나 아래 문제 위로 내려간다', () => {
      const pest = fakePest({ behavior: 'covering', seated: false });
      const { last } = setupWith({ pest });
      act(() => vi.advanceTimersByTime(1500));
      expect(pest.seat).toHaveBeenCalled();
      expect(last().y).toBeGreaterThan(PG.bottom);
    });

    it('강아지는 토끼보다 느리고 낮게(걷기) 움직인다', () => {
      // 처음 자리는 놀이터 왼쪽 위(0), 다음 목표는 오른쪽 아래(1)로 같게.
      const random = () =>
        vi
          .fn()
          .mockReturnValueOnce(0)
          .mockReturnValueOnce(0)
          .mockReturnValue(1);
      const rabbit = setupWith({ pest: fakePest(), random: random() });
      const dog = setupWith({
        pest: fakePest(),
        animal: getPestAnimal('dog'),
        random: random(),
      });
      act(() => vi.advanceTimersByTime(300));
      const moved = (frames: PestFrame[]) =>
        Math.hypot(
          frames.at(-1)!.x - frames[0]!.x,
          frames.at(-1)!.y - frames[0]!.y,
        );
      expect(moved(dog.frames)).toBeLessThan(moved(rabbit.frames));
      // 강아지는 깡충 대신 걷기: 몸이 위아래로 3px까지만 움직인다.
      expect(Math.max(...dog.frames.map((f) => f.hop))).toBeLessThanOrEqual(3);
    });
  });
});
