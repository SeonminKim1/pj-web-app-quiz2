import { act, renderHook } from '@testing-library/react';
import type { PointerEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PEST_TIMING } from '../lib/pest.ts';
import { getPestAnimal } from '../lib/pestAnimals.ts';
import {
  NUDGE_STEP,
  areaBounds,
  isInside,
  playgroundBounds,
} from '../lib/pestMotion.ts';
import { stubReducedMotion } from '../test/reducedMotion.ts';
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
    visit: undefined,
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

  // Value: protects=보는 도중 동작 줄이기를 켜면 방해꾼이 깡충 뛰지 않고 그 자리에 멈춘다; fails_when=설정을 처음 한 번만 읽으면; why_new=예전 테스트는 처음부터 켜 둔 경우만 봄; seam=none; no_claim=실제 OS 설정 화면
  it('보는 도중 움직임 줄이기를 켜면 바로 그 자리에 멈추고 깡충 뛰지 않는다', () => {
    const media = stubReducedMotion(false);
    // 목표가 매번 달라지게(늘 0이면 같은 자리로만 간다).
    const values = [0.2, 0.8, 0.5, 0.9, 0.1];
    let i = 0;
    const { last, frames } = setup(
      fakePest(),
      () => values[i++ % values.length]!,
    );
    act(() => vi.advanceTimersByTime(2000));
    act(() => media.set(true));
    const from = frames.length;
    const at = { x: last().x, y: last().y };
    // 쉬었다 다시 다닐 시간까지 지켜본다.
    act(() => vi.advanceTimersByTime(15_000));
    const after = frames.slice(from);
    expect(after.every((f) => f.hop === 0)).toBe(true);
    expect(after.every((f) => f.x === at.x && f.y === at.y)).toBe(true);

    // Value: protects=다시 끄면 방해꾼이 그 자리에서 다시 돌아다닌다; fails_when=끌 때 m.reducedMotion을 안 되돌리거나 머무는 목표를 안 풀면; why_new=위 단언은 켜는 쪽만 봄; seam=none; no_claim=실제 OS 설정 화면
    // Generated by /ship test coverage audit (extension).
    const offAt = frames.length;
    act(() => media.set(false));
    act(() => vi.advanceTimersByTime(5_000));
    const resumed = frames.slice(offAt);
    expect(
      Math.max(...resumed.map((f) => Math.hypot(f.x - at.x, f.y - at.y))),
    ).toBeGreaterThan(1);
    expect(resumed.some((f) => f.hop > 0)).toBe(true);
    expect(last().reducedMotion).toBe(false);
    vi.unstubAllGlobals();
  });

  // Value: protects=걷는 도중 동작 줄이기를 켜도 가던 목표로 순간이동하지 않고 그 자리에 멈춘다; fails_when=켤 때 걷던 m.target을 그대로 두면(다음 프레임이 목표로 점프); why_new=위 테스트는 쉬는 중(2초)에만 켬; seam=none; no_claim=실제 OS 설정 화면, 가리기·도망 중 전환
  // Generated by /ship test coverage audit.
  it('걷는 도중에 움직임 줄이기를 켜도 가던 곳으로 순간이동하지 않는다', () => {
    const media = stubReducedMotion(false);
    const values = [0.2, 0.8, 0.5, 0.9, 0.1];
    let i = 0;
    const { last, frames } = setup(
      fakePest(),
      () => values[i++ % values.length]!,
    );
    // 0.1초: 첫 목표로 걷는 중(깡충).
    act(() => vi.advanceTimersByTime(100));
    expect(last().hop).toBeGreaterThan(0);
    act(() => media.set(true));
    const from = frames.length;
    const at = { x: last().x, y: last().y };
    act(() => vi.advanceTimersByTime(3_000));
    const after = frames.slice(from);
    expect(after.every((f) => f.hop === 0)).toBe(true);
    expect(
      Math.max(...after.map((f) => Math.hypot(f.x - at.x, f.y - at.y))),
    ).toBeLessThan(1);
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

    // Value: protects=가리러 가는 도중 동작 줄이기를 켜도 입력칸·문제 위를 머무는 자리로 삼지 않는다(놀이터 왼쪽 아래로); fails_when=켤 때의 자리를 그대로 머무는 자리로 삼으면; why_new=다른 켜기 테스트는 놀이터 안에서만 켬; seam=none; no_claim=도망·산책 중 켜기(같은 분기)
    it('가리러 가는 도중 움직임 줄이기를 켜면 다 가린 뒤 놀이터로 돌아와 머문다', () => {
      const media = stubReducedMotion(false);
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
      const view = renderHook(
        ({ pest }: { pest: PestView }) =>
          usePestMotion({ pest, areaRef, coverRef, playgroundRef }),
        { initialProps: { pest: fakePest({ behavior: 'covering' }) } },
      );
      const frames: PestFrame[] = [];
      act(() => {
        view.result.current.subscribe((f) => frames.push({ ...f }));
      });
      // 놀이터 밖(문제 쪽)으로 나갈 때까지 간다.
      for (
        let i = 0;
        i < 40 && isInside({ point: frames.at(-1)!, bounds: PG });
        i++
      )
        act(() => vi.advanceTimersByTime(50));
      expect(isInside({ point: frames.at(-1)!, bounds: PG })).toBe(false);
      act(() => media.set(true));
      view.rerender({ pest: fakePest() });
      act(() => vi.advanceTimersByTime(2000));
      expect(frames.at(-1)).toMatchObject({ x: PG.left, y: PG.bottom });
      vi.unstubAllGlobals();
    });

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

  describe('반응해서 달려가기·산책', () => {
    // 놀이터(맨 위 88px), 내용은 영역 위에서 300px까지, 힌트 카드 더미는 오른쪽 (240~360, 200~254).
    function setupScene(random: () => number = () => 0, contentBottom = 300) {
      const area = element(AREA);
      const playground = element({
        left: AREA.left,
        top: AREA.top,
        width: AREA.width,
        height: 88,
      });
      const content = element({
        left: AREA.left,
        top: AREA.top + 100,
        width: AREA.width,
        height: contentBottom - 100,
      });
      const deck = element({
        left: AREA.left + 240,
        top: AREA.top + 200,
        width: 120,
        height: 54,
      });
      deck.dataset.pestSpot = 'hint';
      content.append(deck);
      const figure = element({ left: 0, top: 0, width: 1, height: 9999 });
      figure.dataset.pestPart = 'figure';
      area.append(playground, content, figure);
      const refs = {
        areaRef: { current: area },
        coverRef: { current: content },
        playgroundRef: { current: playground },
      };
      const view = renderHook(
        ({ pest }: { pest: PestView }) =>
          usePestMotion({ pest, ...refs, random }),
        { initialProps: { pest: fakePest() } },
      );
      const frames: PestFrame[] = [];
      act(() => {
        view.result.current.subscribe((frame) => frames.push({ ...frame }));
      });
      return { ...view, frames, last: () => frames.at(-1)! };
    }

    it('힌트를 열면 카드 더미 왼쪽으로 달려가 머물다가 놀이터로 돌아간다', () => {
      // 난수 0.99: 산책은 가지 않는다(돌아오는 걸음만 본다).
      const { rerender, last, frames } = setupScene(() => 0.99);
      rerender({ pest: fakePest({ visit: { id: 1, spot: 'hint' } }) });
      act(() => vi.advanceTimersByTime(800));
      expect(last().y).toBeCloseTo(254);
      expect(last().x).toBeLessThan(240);
      const stay = last();
      act(() => vi.advanceTimersByTime(2000));
      expect(last()).toMatchObject({ x: stay.x, y: stay.y });
      const before = frames.length;
      act(() => vi.advanceTimersByTime(3000));
      expect(frames.slice(before).some((f) => f.y <= 88)).toBe(true);
    });

    it('틀리면 입력칸 아래 빈 곳으로 간다(방해꾼 그림은 내용으로 치지 않음)', () => {
      const { rerender, last } = setupScene();
      rerender({ pest: fakePest({ visit: { id: 1, spot: 'below' } }) });
      act(() => vi.advanceTimersByTime(800));
      expect(last().y - last().size).toBeGreaterThan(300);
    });

    it('아래에 자리가 없으면 틀렸을 때 놀이터 앞쪽 가운데로 나온다', () => {
      // 내용이 영역 거의 끝(580px)까지 차 있다. 난수 0.99: 처음 자리는 놀이터 오른쪽.
      const { rerender, last } = setupScene(() => 0.99, 580);
      rerender({ pest: fakePest({ visit: { id: 1, spot: 'below' } }) });
      act(() => vi.advanceTimersByTime(800));
      expect(last().x).toBeCloseTo((B.left + B.right) / 2);
      expect(last().y).toBeLessThanOrEqual(88);
    });

    it('맞히면 놀이터 오른쪽 위(골드 쪽)로 간다', () => {
      const { rerender, last } = setupScene();
      rerender({ pest: fakePest({ visit: { id: 1, spot: 'gold' } }) });
      act(() => vi.advanceTimersByTime(800));
      expect(last().x).toBe(B.right);
      expect(last().y).toBeLessThanOrEqual(88);
    });

    it('어지러운 동안 받은 요청은 늦으면 버린다', () => {
      const { rerender, last } = setupScene(() => 0.99);
      rerender({
        pest: fakePest({ dizzy: true, visit: { id: 1, spot: 'below' } }),
      });
      act(() => vi.advanceTimersByTime(PEST_TIMING.visitStale + 100));
      rerender({
        pest: fakePest({ visit: { id: 1, spot: 'below' } }),
      });
      act(() => vi.advanceTimersByTime(800));
      expect(last().y).toBeLessThanOrEqual(88);
    });

    it('놀이터에 있을 때 가끔은 입력칸 아래로 산책 간다', () => {
      // 난수 0: 처음 자리 놀이터, 산책 확률 통과, 산책 목표는 빈 곳 왼쪽 위.
      const { last } = setupScene(() => 0);
      act(() => vi.advanceTimersByTime(1600));
      expect(last().y - last().size).toBeGreaterThan(300);
    });

    it('산책 확률을 넘으면 놀이터 안에서만 돈다', () => {
      const { last } = setupScene(() => 0.99);
      act(() => vi.advanceTimersByTime(1600));
      expect(last().y).toBeLessThanOrEqual(88);
    });
  });
});
