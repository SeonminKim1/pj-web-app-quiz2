import { describe, expect, it } from 'vitest';
import { MAX_GAIT_LIFT } from './pestAnimals.ts';
import {
  DRAG_THRESHOLD,
  NUDGE_STEP,
  areaBounds,
  PEST_SIZE,
  clampToArea,
  depthScale,
  fleeTarget,
  isInside,
  playgroundBounds,
  isDragStart,
  nudge,
  pickRoamTarget,
  stepToward,
  travelSpeed,
} from './pestMotion.ts';

const AREA = { width: 360, height: 600 };
const B = areaBounds(AREA);

describe('clampToArea', () => {
  it('영역 밖 점은 가장자리 여백 안으로, 안쪽 점은 그대로', () => {
    expect(clampToArea({ point: { x: -50, y: 9999 }, area: AREA })).toEqual({
      x: B.left,
      y: B.bottom,
    });
    expect(clampToArea({ point: { x: 100, y: 200 }, area: AREA })).toEqual({
      x: 100,
      y: 200,
    });
  });

  it('영역이 여백보다 작으면 가운데', () => {
    const tiny = { width: 40, height: 0 };
    expect(clampToArea({ point: { x: 5, y: 5 }, area: tiny })).toEqual({
      x: 20,
      y: 0,
    });
  });
});

describe('areaBounds', () => {
  it('몸 전체(크기·깡충 높이)가 영역 안에 들어온다', () => {
    const b = areaBounds(AREA);
    expect(b.left).toBe(PEST_SIZE.near / 2);
    expect(b.right).toBe(AREA.width - PEST_SIZE.near / 2);
    // 위쪽 끝에서도 머리 꼭대기(발밑 - 크기 - 깡충)가 0 이상.
    expect(
      b.top - depthScale({ y: b.top, area: AREA }) - MAX_GAIT_LIFT,
    ).toBeGreaterThanOrEqual(0);
    expect(b.bottom).toBeLessThan(AREA.height);
  });
});

describe('pickRoamTarget', () => {
  it('난수 0이면 왼쪽 위, 1이면 오른쪽 아래(여백 안)', () => {
    expect(pickRoamTarget({ bounds: B, random: () => 0 })).toEqual({
      x: B.left,
      y: B.top,
    });
    expect(pickRoamTarget({ bounds: B, random: () => 1 })).toEqual({
      x: B.right,
      y: B.bottom,
    });
  });
});

describe('fleeTarget', () => {
  it('잡힌 곳에서 가장 먼 모서리', () => {
    expect(fleeTarget({ bounds: B, from: { x: 40, y: 40 } })).toEqual({
      x: B.right,
      y: B.bottom,
    });
    expect(fleeTarget({ bounds: B, from: { x: 350, y: 590 } })).toEqual({
      x: B.left,
      y: B.top,
    });
  });
});

describe('stepToward·travelSpeed', () => {
  it('속도 × 시간만큼 다가가고, 넘어가면 목표에 멈춘다', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    expect(stepToward({ from, to, speed: 50, dt: 1 })).toEqual({
      point: { x: 50, y: 0 },
      arrived: false,
    });
    expect(stepToward({ from, to, speed: 50, dt: 3 })).toEqual({
      point: to,
      arrived: true,
    });
    expect(stepToward({ from: to, to, speed: 50, dt: 0 }).arrived).toBe(true);
  });

  it('정해진 시간 안에 도착하는 속도, 가까우면 돌아다니는 속도', () => {
    expect(
      travelSpeed({
        from: { x: 0, y: 0 },
        to: { x: 400, y: 0 },
        durationMs: 800,
        minSpeed: 90,
      }),
    ).toBe(500);
    expect(
      travelSpeed({
        from: { x: 0, y: 0 },
        to: { x: 10, y: 0 },
        durationMs: 800,
        minSpeed: 50,
      }),
    ).toBe(50);
  });
});

describe('playgroundBounds / isInside', () => {
  // 놀이터 띠: 놀이 영역 맨 위 88px.
  const BAND = { top: 0, bottom: 88 };

  it('발밑은 몸 전체가 띠 안에 들어오는 높이부터 띠 아랫변 조금 위까지, 가로는 영역 그대로', () => {
    const pg = playgroundBounds({ area: AREA, ...BAND });
    expect(pg.left).toBe(B.left);
    expect(pg.right).toBe(B.right);
    expect(pg.bottom).toBe(BAND.bottom - 4);
    expect(pg.top).toBeLessThanOrEqual(pg.bottom);
    // 가장 높이 있을 때도 몸(그 높이의 크기 + 깡충)이 띠 윗변 아래에 있다.
    expect(
      pg.top - depthScale({ y: pg.top, area: AREA }) - MAX_GAIT_LIFT,
    ).toBeGreaterThanOrEqual(BAND.top);
    // 띠 안에서는 작게(약 60px) 보인다.
    expect(depthScale({ y: pg.bottom, area: AREA })).toBeLessThan(64);
  });

  it('띠가 영역 아래쪽에 있어도 같은 규칙(윗변 아래, 아랫변 위)', () => {
    const pg = playgroundBounds({ area: AREA, top: 400, bottom: 528 });
    expect(pg.top).toBeGreaterThan(400);
    expect(pg.bottom).toBe(524);
  });

  it('띠가 너무 낮으면 아랫변 한 줄, 영역 밖이면 영역 범위로 당긴다', () => {
    const low = playgroundBounds({ area: AREA, top: 0, bottom: 40 });
    expect(low.top).toBe(low.bottom);
    expect(
      playgroundBounds({ area: AREA, top: -500, bottom: -400 }),
    ).toMatchObject({ top: B.top, bottom: B.top });
    expect(
      playgroundBounds({
        area: AREA,
        top: AREA.height + 50,
        bottom: AREA.height + 138,
      }),
    ).toMatchObject({ top: B.bottom, bottom: B.bottom });
  });

  it('범위 안이면 true(가장자리 포함), 밖이면 false', () => {
    const pg = playgroundBounds({ area: AREA, ...BAND });
    expect(isInside({ point: { x: pg.left, y: pg.bottom }, bounds: pg })).toBe(
      true,
    );
    expect(
      isInside({ point: { x: pg.left, y: pg.top - 20 }, bounds: pg }),
    ).toBe(false);
  });
});

describe('isDragStart', () => {
  it(`${DRAG_THRESHOLD}px 넘게 움직여야 끌기`, () => {
    const start = { x: 0, y: 0 };
    expect(isDragStart({ start, current: { x: DRAG_THRESHOLD, y: 0 } })).toBe(
      false,
    );
    expect(
      isDragStart({ start, current: { x: DRAG_THRESHOLD + 1, y: 0 } }),
    ).toBe(true);
  });
});

describe('nudge', () => {
  it('방향키로 옮기고 영역 밖으로는 못 나간다. 다른 키는 undefined', () => {
    const point = { x: 100, y: 100 };
    expect(nudge({ point, key: 'ArrowRight', area: AREA })).toEqual({
      x: 100 + NUDGE_STEP,
      y: 100,
    });
    expect(
      nudge({
        point: { x: B.left, y: 100 },
        key: 'ArrowLeft',
        area: AREA,
      }),
    ).toEqual({
      x: B.left,
      y: 100,
    });
    expect(nudge({ point, key: 'Enter', area: AREA })).toBeUndefined();
  });
});

describe('depthScale', () => {
  it('위쪽 56px, 아래쪽 96px, 영역 크기가 0이면 가까운 크기', () => {
    expect(depthScale({ y: 0, area: AREA })).toBe(PEST_SIZE.far);
    expect(depthScale({ y: AREA.height, area: AREA })).toBe(PEST_SIZE.near);
    expect(depthScale({ y: 300, area: { width: 0, height: 0 } })).toBe(
      PEST_SIZE.near,
    );
  });
});
