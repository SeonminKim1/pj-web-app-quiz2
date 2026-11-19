// 방해꾼 움직임 계산(spec "행동 상태", "탭과 끌기 구분"). 좌표는 놀이 영역 왼쪽 위 기준 px이고,
// 점은 토끼 발밑(바닥)의 위치다. 입력만으로 결과가 정해지는 순수 함수만 둔다.
import { MAX_GAIT_LIFT } from './pestAnimals.ts';
import type { RandomFn } from './random.ts';

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
