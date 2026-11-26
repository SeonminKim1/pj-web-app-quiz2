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
  spaceBelow,
  isDragStart,
  nudge,
  pickRoamTarget,
  stepToward,
  travelSpeed,
  YARD_TIMING,
  figurePose,
  nextYardLeg,
  standingPoint,
  yardBounds,
  yardRestMs,
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

describe('spaceBelow', () => {
  it('내용 아래가 넉넉하면 몸이 내용과 겹치지 않는 높이부터 영역 아래까지', () => {
    const b = spaceBelow({ area: AREA, floor: 300 })!;
    expect(b.bottom).toBe(B.bottom);
    expect(b.left).toBe(B.left);
    expect(b.right).toBe(B.right);
    // 가장 높은 발밑에서도 몸 위쪽(크기 + 깡충)이 내용 아랫변 아래에 있다.
    expect(
      b.top - depthScale({ y: b.top, area: AREA }) - MAX_GAIT_LIFT,
    ).toBeGreaterThanOrEqual(300);
  });

  it('몸이 들어갈 만큼 비어 있지 않으면 없다', () => {
    expect(spaceBelow({ area: AREA, floor: 560 })).toBeUndefined();
    expect(
      spaceBelow({ area: { width: 360, height: 0 }, floor: 0 }),
    ).toBeUndefined();
  });
});

// Value: protects=뛰기·방향 모양이 풀이 화면과 마당에서 같다(D42); fails_when=떨림 방지(0.35)나 늘어남 비율이 바뀌면; why_new=PestLayer에서 꺼낸 공유 함수; seam=none; no_claim=그림 모양
describe('figurePose', () => {
  it.each([
    // [hop, facing, 이전 flip] → [flip, sx, sy]
    [0, Math.PI / 2, -1, 1, 1, 1], // 오른쪽으로 가면 오른쪽을 본다, 땅에서는 원래 모양
    [0, -Math.PI / 2, 1, -1, 1, 1], // 왼쪽
    [0, 0.2, -1, -1, 1, 1], // 거의 앞뒤로만 가면 방향을 바꾸지 않는다(떨림 방지)
    [0.5, Math.PI / 2, 1, 1, 1, 1], // 0.5px 이하는 땅에 닿은 것으로
    [6, Math.PI / 2, 1, 1, 0.975, 1.04], // 반쯤 뜨면 반만 늘어난다
    [20, Math.PI / 2, 1, 1, 0.95, 1.08], // 12px 넘게 떠도 최대치
  ])(
    'hop %s, facing %s, flip %s → %s, %s, %s',
    (hop, facing, flip, f, sx, sy) => {
      const pose = figurePose({ hop, facing, flip });
      expect(pose.flip).toBe(f);
      expect(pose.sx).toBeCloseTo(sx);
      expect(pose.sy).toBeCloseTo(sy);
    },
  );
});

// Value: protects=마당 동물의 발밑이 풀밭 위, 몸은 마당 안(50/60px 동물, O1); fails_when=PEST_SIZE(96px)를 쓰거나 하늘 띠를 무시하면; why_new=마당 범위가 새로 생김; seam=none; no_claim=실제 CSS 배치
describe('yardBounds', () => {
  it('발밑은 풀밭 윗변 아래, 몸 전체와 가장 높은 걸음이 마당 안', () => {
    const b = yardBounds({
      area: { width: 360, height: 300 },
      size: 50,
      grassTop: 66,
    });
    expect(b).toEqual({ left: 25, right: 335, top: 74, bottom: 296 });
    // 몸 꼭대기(발밑 − 크기 − 걸음)가 마당 위로 나가지 않는다.
    expect(b.top - 50 - MAX_GAIT_LIFT).toBeGreaterThanOrEqual(0);
  });

  it('풀밭이 아주 높으면 몸 높이로 아래를 정한다', () => {
    const b = yardBounds({
      area: { width: 360, height: 300 },
      size: 60,
      grassTop: 0,
    });
    expect(b.top).toBe(60 + MAX_GAIT_LIFT);
  });

  it('마당이 동물보다 작으면 가운데 한 점', () => {
    expect(
      yardBounds({ area: { width: 40, height: 50 }, size: 60, grassTop: 10 }),
    ).toEqual({ left: 20, right: 20, top: 25, bottom: 25 });
  });
});

// Value: protects=움직임 줄이기 자리가 PR ③ CSS 자리와 같다(D47); fails_when=비율(0.55, 50%+2%, 4%+23%)이 바뀌면; why_new=CSS 배치를 hook으로 옮김(D41); seam=none; no_claim=그림이 칸과 겹쳐 보이는 모양
describe('standingPoint', () => {
  const layer = { left: 7, top: 66, width: 346, height: 225 };
  it.each([
    // [칸, 자리, 크기] → 발밑 [x, y]
    [0, 0, 50, 7 + (0.55 / 3) * 346 + 25, 66 + 0.02 * 225 + 50],
    [4, 1, 50, 7 + (1.55 / 3) * 346 + 25, 66 + 0.52 * 225 + 50],
    [5, 3, 60, 7 + (2.55 / 3) * 346 + 30, 66 + 0.52 * 225 + 60],
    [undefined, 0, 50, 7 + 0.04 * 346 + 25, 66 + 225],
    [undefined, 3, 60, 7 + 0.73 * 346 + 30, 66 + 225],
  ])('칸 %s, 자리 %s, 크기 %s → (%s, %s)', (cell, slot, size, x, y) => {
    const p = standingPoint({ layer, cell, slot, size });
    expect(p.x).toBeCloseTo(x);
    expect(p.y).toBeCloseTo(y);
  });
});

// Value: protects=물건 옆 8~12초 → 1~2곳 → 다시 물건 옆(D40), 물건이 없으면 계속 돌아다니기; fails_when=떠나지 않거나 돌아오지 않으면; why_new=새 일정; seam=none; no_claim=기기에서 느끼는 속도
describe('nextYardLeg / yardRestMs', () => {
  it('물건 옆을 떠나 1~2곳 들른 뒤 돌아온다', () => {
    // random 0 → 1곳, random 0.99 → 2곳.
    const one = nextYardLeg({
      leg: { kind: 'home' },
      hasHome: true,
      random: () => 0,
    });
    expect(one).toEqual({ kind: 'roam', left: 0 });
    expect(nextYardLeg({ leg: one, hasHome: true, random: () => 0 })).toEqual({
      kind: 'home',
    });

    const two = nextYardLeg({
      leg: { kind: 'home' },
      hasHome: true,
      random: () => 0.99,
    });
    expect(two).toEqual({ kind: 'roam', left: 1 });
    const next = nextYardLeg({ leg: two, hasHome: true, random: () => 0 });
    expect(next).toEqual({ kind: 'roam', left: 0 });
    expect(nextYardLeg({ leg: next, hasHome: true, random: () => 0 })).toEqual({
      kind: 'home',
    });
  });

  it('좋아하는 물건이 없으면 계속 돌아다닌다(물건 옆 일정이어도)', () => {
    expect(
      nextYardLeg({ leg: { kind: 'home' }, hasHome: false, random: () => 0 }),
    ).toEqual({
      kind: 'roam',
      left: 0,
    });
    expect(
      nextYardLeg({
        leg: { kind: 'roam', left: 0 },
        hasHome: false,
        random: () => 0,
      }),
    ).toEqual({ kind: 'roam', left: 0 });
  });

  it('물건 옆은 8~12초, 돌아다니다 쉬기는 1.5~4초', () => {
    const home = { kind: 'home' } as const;
    const roam = { kind: 'roam', left: 0 } as const;
    expect(yardRestMs({ leg: home, random: () => 0 })).toBe(
      YARD_TIMING.stayMin,
    );
    expect(yardRestMs({ leg: home, random: () => 0.9999 })).toBe(
      YARD_TIMING.stayMax,
    );
    expect(yardRestMs({ leg: roam, random: () => 0 })).toBe(
      YARD_TIMING.restMin,
    );
    expect(yardRestMs({ leg: roam, random: () => 0.9999 })).toBe(
      YARD_TIMING.restMax,
    );
  });
});
