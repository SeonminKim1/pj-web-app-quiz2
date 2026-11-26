// 방해꾼 움직임 계산(spec "행동 상태", "탭과 끌기 구분"). 좌표는 놀이 영역 왼쪽 위 기준 px이고,
// 점은 토끼 발밑(바닥)의 위치다. 입력만으로 결과가 정해지는 순수 함수만 둔다.
import { MAX_GAIT_LIFT } from './pestAnimals.ts';
import { randomIntBetween, type RandomFn } from './random.ts';

/** 놀이 영역 안의 한 점. */
export type Point = { x: number; y: number };

/** 놀이 영역 크기. */
export type Area = { width: number; height: number };

/** 화면에서 토끼 크기(px): 영역 위쪽(멀리)일수록 작고 아래쪽(가까이)일수록 크다. */
export const PEST_SIZE = { far: 56, near: 96 } as const;

/** 끌기로 볼 최소 이동 거리(px). */
export const DRAG_THRESHOLD = 8;

/** 방향키 한 번에 옮기는 거리(px). */
export const NUDGE_STEP = 24;

/** 발밑 점이 있을 수 있는 범위. */
export type Bounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** 발밑 아래로 남길 여백(그림자). */
const BOTTOM_GAP = 8;

/**
 * 동물 몸 전체(크기·걸음으로 뜬 높이 포함)가 영역 안에 들어오는 발밑 점의 범위.
 * 가로는 가장 클 때 몸 폭의 절반, 위쪽은 그 높이의 크기 + 깡충 높이만큼 띄운다.
 * 영역이 너무 작으면 가운데 한 점.
 */
export function areaBounds(area: Area): Bounds {
  const half = PEST_SIZE.near / 2;
  const grow = (PEST_SIZE.near - PEST_SIZE.far) / Math.max(1, area.height);
  const top =
    grow < 1
      ? Math.ceil((PEST_SIZE.far + MAX_GAIT_LIFT) / (1 - grow))
      : area.height;
  const bottom = area.height - BOTTOM_GAP;
  const [left, right] =
    area.width >= half * 2
      ? [half, area.width - half]
      : [area.width / 2, area.width / 2];
  const [minY, maxY] =
    top <= bottom ? [top, bottom] : [area.height / 2, area.height / 2];
  return { left, right, top: minY, bottom: maxY };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 점을 영역 안(가장자리 여백 포함)으로 당긴다. */
export function clampToArea({
  point,
  area,
}: {
  point: Point;
  area: Area;
}): Point {
  const b = areaBounds(area);
  return {
    x: clamp(point.x, b.left, b.right),
    y: clamp(point.y, b.top, b.bottom),
  };
}

/**
 * 놀이터 띠 안에서 발밑 점이 있을 수 있는 범위.
 * top·bottom은 놀이 영역 기준 띠의 윗변·아랫변(px). 몸 전체(그 높이의 크기 + 깡충 높이)가
 * 띠 안에 들어오는 가장 높은 발밑부터 띠 아랫변 조금 위까지. 영역 범위를 넘으면 영역 범위로 당기고,
 * 띠가 낮아 위가 아래보다 크면 아래 한 줄.
 */
export function playgroundBounds({
  area,
  top,
  bottom,
}: {
  area: Area;
  top: number;
  bottom: number;
}): Bounds {
  const b = areaBounds(area);
  const maxY = clamp(bottom - PLAYGROUND_FOOT_GAP, b.top, b.bottom);
  // y − depthScale(y) − 깡충 ≥ top 을 y로 푼다(depthScale은 y에 대해 1차).
  const grow =
    area.height > 0 ? (PEST_SIZE.near - PEST_SIZE.far) / area.height : 0;
  const fitTop =
    grow < 1 ? (top + PEST_SIZE.far + MAX_GAIT_LIFT) / (1 - grow) : maxY;
  // 띠가 몸보다 낮으면(영역이 아주 짧을 때) 아래 한 줄에서 걷고 몸 위쪽이 띠 밖으로 나온다.
  // 지금 화면(88px 띠, 영역 높이 300px 이상)에서는 생기지 않는다.
  const minY = clamp(Math.ceil(fitTop), b.top, maxY);
  return { ...b, top: minY, bottom: maxY };
}

/** 내용 아래 빈 곳에서 몸 위로 남길 여백(px). */
const FLOOR_GAP = 8;

/**
 * 화면 내용(입력칸 등) 아래 빈 곳에서 발밑 점이 있을 수 있는 범위. floor는 내용의 가장 아랫변
 * (놀이 영역 기준 px). 몸 전체(그 높이의 크기 + 깡충 높이)가 내용과 겹치지 않는 가장 높은 발밑부터
 * 영역 아래까지. 몸이 들어갈 만큼 비어 있지 않으면 undefined(키 작은 화면).
 */
export function spaceBelow({
  area,
  floor,
}: {
  area: Area;
  floor: number;
}): Bounds | undefined {
  const b = areaBounds(area);
  const grow =
    area.height > 0 ? (PEST_SIZE.near - PEST_SIZE.far) / area.height : 1;
  if (grow >= 1) return undefined;
  const fitTop = Math.ceil(
    (floor + FLOOR_GAP + PEST_SIZE.far + MAX_GAIT_LIFT) / (1 - grow),
  );
  if (fitTop > b.bottom) return undefined;
  return { ...b, top: Math.max(b.top, fitTop) };
}

/** 띠 아랫변에서 발밑까지 남길 여백(px, 그림자). */
const PLAYGROUND_FOOT_GAP = 4;

/** 점이 범위 안에 있는지(가장자리 포함, 반올림 오차 1px 허용). */
export function isInside({
  point,
  bounds,
}: {
  point: Point;
  bounds: Bounds;
}): boolean {
  return (
    point.x >= bounds.left - 1 &&
    point.x <= bounds.right + 1 &&
    point.y >= bounds.top - 1 &&
    point.y <= bounds.bottom + 1
  );
}

/** 돌아다닐 다음 지점(범위 안 무작위). 범위는 보통 놀이터(playgroundBounds). */
export function pickRoamTarget({
  bounds: b,
  random,
}: {
  bounds: Bounds;
  random: RandomFn;
}): Point {
  return {
    x: b.left + Math.min(1, random()) * (b.right - b.left),
    y: b.top + Math.min(1, random()) * (b.bottom - b.top),
  };
}

/** 두 점 사이 거리. */
function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** 잡힌 곳에서 가장 먼 모서리(범위 안, 보통 놀이터). */
export function fleeTarget({
  bounds: b,
  from,
}: {
  bounds: Bounds;
  from: Point;
}): Point {
  const corners: Point[] = [
    { x: b.left, y: b.top },
    { x: b.right, y: b.top },
    { x: b.left, y: b.bottom },
    { x: b.right, y: b.bottom },
  ];
  return corners.reduce((far, corner) =>
    distance(from, corner) > distance(from, far) ? corner : far,
  );
}

/** 정해진 시간 안에 도착하는 속도(px/초). 그 동물이 돌아다니는 속도(minSpeed)보다 느리지는 않다. */
export function travelSpeed({
  from,
  to,
  durationMs,
  minSpeed,
}: {
  from: Point;
  to: Point;
  durationMs: number;
  minSpeed: number;
}): number {
  return Math.max(minSpeed, distance(from, to) / (durationMs / 1000));
}

/** dt초 동안 목표 쪽으로 speed만큼 움직인다. 넘어가면 목표에 멈추고 arrived. */
export function stepToward({
  from,
  to,
  speed,
  dt,
}: {
  from: Point;
  to: Point;
  speed: number;
  dt: number;
}): { point: Point; arrived: boolean } {
  const left = distance(from, to);
  const step = speed * Math.max(0, dt);
  if (left <= step || left === 0) return { point: to, arrived: true };
  const ratio = step / left;
  return {
    point: {
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio,
    },
    arrived: false,
  };
}

/** 누른 곳에서 끌기로 볼 만큼 움직였는지. */
export function isDragStart({
  start,
  current,
}: {
  start: Point;
  current: Point;
}): boolean {
  return distance(start, current) > DRAG_THRESHOLD;
}

/** 방향키로 옮긴 점. 방향키가 아니면 undefined. */
export function nudge({
  point,
  key,
  area,
}: {
  point: Point;
  key: string;
  area: Area;
}): Point | undefined {
  const delta: Record<string, Point> = {
    ArrowLeft: { x: -NUDGE_STEP, y: 0 },
    ArrowRight: { x: NUDGE_STEP, y: 0 },
    ArrowUp: { x: 0, y: -NUDGE_STEP },
    ArrowDown: { x: 0, y: NUDGE_STEP },
  };
  const d = delta[key];
  if (!d) return undefined;
  return clampToArea({ point: { x: point.x + d.x, y: point.y + d.y }, area });
}

/** 그 높이(y)에서 화면에 보이는 토끼 크기(px). 위쪽 56 → 아래쪽 96. */
export function depthScale({ y, area }: { y: number; area: Area }): number {
  const ratio = area.height > 0 ? clamp(y / area.height, 0, 1) : 1;
  return PEST_SIZE.far + (PEST_SIZE.near - PEST_SIZE.far) * ratio;
}

/**
 * 뛰는 높이·가는 방향에 따른 몸 모양(풀이 화면 방해꾼과 놀이터 동물이 같이 쓴다, 설계 D42).
 * 옆으로 충분히 움직일 때만 방향을 바꿔(|sin| > 0.35) 떨리지 않게 하고, 뜨면 길쭉, 땅에 닿으면 원래대로.
 * flip은 직전 방향(1 = 오른쪽, -1 = 왼쪽)이고 새 방향을 돌려준다.
 */
export function figurePose({
  hop,
  facing,
  flip,
}: {
  hop: number;
  facing: number;
  flip: number;
}): { flip: number; sx: number; sy: number } {
  const side = Math.sin(facing);
  const next = side > 0.35 ? 1 : side < -0.35 ? -1 : flip;
  if (hop <= 0.5) return { flip: next, sx: 1, sy: 1 };
  const stretch = Math.min(hop, 12) / 12;
  return { flip: next, sx: 1 - 0.05 * stretch, sy: 1 + 0.08 * stretch };
}

/** 놀이터(마당) 안의 상자(마당 왼쪽 위 기준 px). */
export type Box = { left: number; top: number; width: number; height: number };

/** 마당 동물 그림 크기(px): 고른 방해꾼은 조금 크게(설계 D18). */
export const YARD_PET_SIZE = { front: 60, other: 50 } as const;

/** 마당 동물의 머무는 시간(ms)과 산책 횟수(설계 D40). */
export const YARD_TIMING = {
  /** 좋아하는 물건 옆에 머무는 시간. */
  stayMin: 8_000,
  stayMax: 12_000,
  /** 돌아다니다 한 곳에서 쉬는 시간. */
  restMin: 1_500,
  restMax: 4_000,
  /** 물건 옆을 떠나 들르는 곳 수. */
  roamStopsMin: 1,
  roamStopsMax: 2,
} as const;

/** 발밑이 풀밭 윗변보다 이만큼은 아래(px). */
const YARD_GRASS_GAP = 8;
/** 발밑 아래로 남길 여백(px, 그림자). */
const YARD_BOTTOM_GAP = 4;

/**
 * 마당에서 크기 size인 동물의 발밑이 있을 수 있는 범위. grassTop은 잰 칸 목록 윗변(하늘 아래, 설계 O1).
 * 몸(크기 + 가장 높은 걸음)은 마당 안에, 발밑은 풀밭 위에. 마당이 너무 작으면 가운데 한 점.
 */
export function yardBounds({
  area,
  size,
  grassTop,
}: {
  area: Area;
  size: number;
  grassTop: number;
}): Bounds {
  const half = size / 2;
  const [left, right] =
    area.width >= size
      ? [half, area.width - half]
      : [area.width / 2, area.width / 2];
  const top = Math.max(grassTop + YARD_GRASS_GAP, size + MAX_GAIT_LIFT);
  const bottom = area.height - YARD_BOTTOM_GAP;
  const [minY, maxY] =
    top <= bottom ? [top, bottom] : [area.height / 2, area.height / 2];
  return { left, right, top: minY, bottom: maxY };
}

/** PR ③ 배치 비율(칸 목록 기준, 설계 D47). 칸은 3열, 그림 상자 왼쪽·위 비율. */
const STAND = {
  /** 칸 안 가로 위치(칸 너비 대비). */
  inCell: 0.55,
  /** 줄 높이(목록 높이 대비)와 줄 안 위쪽 여백. */
  row: 0.5,
  rowGap: 0.02,
  /** 아래 줄에 설 때 첫 자리와 자리 간격(목록 너비 대비). */
  slotStart: 0.04,
  slotStep: 0.23,
} as const;

/**
 * 서 있는 자리(발밑, 마당 기준 px). cell이 있으면 그 칸 옆, 없으면 아래쪽 slot번째 자리.
 * layer는 잰 칸 목록 상자(설계 D41, D47: PR ③과 같은 자리).
 */
export function standingPoint({
  layer,
  cell,
  slot,
  size,
}: {
  layer: Box;
  cell: number | undefined;
  slot: number;
  size: number;
}): Point {
  if (cell === undefined) {
    const left =
      layer.left + (STAND.slotStart + slot * STAND.slotStep) * layer.width;
    return { x: left + size / 2, y: layer.top + layer.height };
  }
  const col = cell % 3;
  const row = Math.floor(cell / 3);
  const left = layer.left + ((col + STAND.inCell) / 3) * layer.width;
  const top = layer.top + (row * STAND.row + STAND.rowGap) * layer.height;
  return { x: left + size / 2, y: top + size };
}

/** 마당 동물의 지금 일정: 좋아하는 물건 옆(home) 또는 돌아다니기(roam, left = 남은 들를 곳 수). */
export type YardLeg = { kind: 'home' } | { kind: 'roam'; left: number };

/**
 * 다음 일정(설계 D40): 물건 옆 → 1~2곳 돌아다니기 → 다시 물건 옆. 좋아하는 물건이 없으면 계속 돌아다닌다.
 */
export function nextYardLeg({
  leg,
  hasHome,
  random,
}: {
  leg: YardLeg;
  hasHome: boolean;
  random: RandomFn;
}): YardLeg {
  if (!hasHome) return { kind: 'roam', left: 0 };
  if (leg.kind === 'home') {
    const stops = randomIntBetween({
      min: YARD_TIMING.roamStopsMin,
      max: YARD_TIMING.roamStopsMax,
      random,
    });
    return { kind: 'roam', left: stops - 1 };
  }
  return leg.left > 0 ? { kind: 'roam', left: leg.left - 1 } : { kind: 'home' };
}

/** 그 일정의 도착 뒤 머무는 시간(ms): 물건 옆 8~12초, 돌아다니다 쉬기 1.5~4초. */
export function yardRestMs({
  leg,
  random,
}: {
  leg: YardLeg;
  random: RandomFn;
}): number {
  return leg.kind === 'home'
    ? randomIntBetween({
        min: YARD_TIMING.stayMin,
        max: YARD_TIMING.stayMax,
        random,
      })
    : randomIntBetween({
        min: YARD_TIMING.restMin,
        max: YARD_TIMING.restMax,
        random,
      });
}
