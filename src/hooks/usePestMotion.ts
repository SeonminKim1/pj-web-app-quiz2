// 방해꾼 움직임(spec "행동 상태", "탭과 끌기 구분", "사용자 동작"). requestAnimationFrame 루프로
// 토끼 위치를 계산하고, 프레임마다 React를 다시 그리지 않도록 구독(subscribe)으로 그리기 쪽에 넘긴다.
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import type { RandomFn } from '../lib/random.ts';
import { prefersReducedMotion } from '../lib/reducedMotion.ts';
import {
  PEST_TIMING,
  STROLL_CHANCE,
  lookAroundDelay,
  type PestMood,
  type PestSpot,
} from '../lib/pest.ts';
import {
  gaitLift,
  getPestAnimal,
  type PestAnimal,
} from '../lib/pestAnimals.ts';
import {
  areaBounds,
  clampToArea,
  depthScale,
  fleeTarget,
  isDragStart,
  isInside,
  nudge,
  pickRoamTarget,
  playgroundBounds,
  spaceBelow,
  type Bounds,
  stepToward,
  travelSpeed,
  type Area,
  type Point,
} from '../lib/pestMotion.ts';
import type { PestView } from './usePest.ts';

/** 한 프레임의 토끼 위치(놀이 영역 px, 발밑)와 그리기에 필요한 값. */
export type PestFrame = {
  x: number;
  y: number;
  /** 뛰어오른 높이(px). */
  hop: number;
  /** 바라보는 방향(라디안, 0 = 화면 쪽). */
  facing: number;
  /** 화면에서 토끼 크기(px). 잡는 영역 크기에도 쓴다. */
  size: number;
  area: Area;
  /** 시작 뒤 시간(초), 지금 반응이 시작된 뒤 시간(초). */
  time: number;
  moodTime: number;
  reducedMotion: boolean;
  /** 놀이터에서 멈춰 두리번거리는 중(물건 놀이). */
  resting: boolean;
};

/** 잡는 영역 버튼에 붙일 이벤트 처리. */
type PestHandlers = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onLostPointerCapture: (event: PointerEvent<HTMLElement>) => void;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

/** 움직임 hook 결과. */
export type PestMotion = {
  /** 프레임마다 불릴 함수를 등록한다. 돌려준 함수로 해제. 등록하면 지금 위치로 한 번 바로 불린다. */
  subscribe: (listener: (frame: PestFrame) => void) => () => void;
  handlers: PestHandlers;
};

// 최대 한 프레임 시간(초). 탭이 잠깐 멈췄다 돌아와도 순간이동하지 않게.
const MAX_DT = 0.05;

/** 움직임 줄이기에서 머무는 자리: 놀이터 왼쪽 아래(놀이터가 없으면 영역 왼쪽 아래). */
function restPoint(m: { roam: Bounds | undefined; area: Area }): Point {
  return m.roam
    ? { x: m.roam.left, y: m.roam.bottom }
    : clampToArea({ point: { x: 0, y: m.area.height }, area: m.area });
}

/**
 * 방해꾼 움직임 hook. areaRef는 놀이 영역, coverRef는 가릴 문제 문장.
 * active가 false면(스테이지 결과 화면) 프레임 루프·크기 감시를 멈춘다.
 */
export function usePestMotion({
  pest,
  areaRef,
  coverRef,
  playgroundRef,
  animal = getPestAnimal('rabbit'),
  active = true,
  random = Math.random,
}: {
  pest: PestView;
  active?: boolean;
  areaRef: RefObject<HTMLElement | null>;
  coverRef: RefObject<HTMLElement | null>;
  /** 놀이터 띠(평소 다니는 곳). 없으면 놀이 영역 전체. */
  playgroundRef?: RefObject<HTMLElement | null>;
  /** 고른 방해꾼 동물(빠르기·걸음). 기본 토끼. */
  animal?: PestAnimal;
  random?: RandomFn;
}): PestMotion {
  const pestRef = useRef(pest);
  const randomRef = useRef(random);
  const animalRef = useRef(animal);
  useEffect(() => {
    pestRef.current = pest;
    randomRef.current = random;
    animalRef.current = animal;
  });

  // 움직임 상태(렌더와 무관해 ref로 둔다).
  const motion = useRef({
    area: { width: 0, height: 0 } as Area,
    point: undefined as Point | undefined,
    target: undefined as Point | undefined,
    speed: animal.speed,
    /** 평소 다니는 범위(놀이터). 크기를 잴 때 정한다. */
    roam: undefined as Bounds | undefined,
    resting: false,
    /** 목표를 정한 행동(바뀌면 목표를 다시 정한다). */
    plannedFor: '' as string,
    restUntil: 0,
    moveTime: 0,
    facing: 0,
    hop: 0,
    startedAt: 0,
    mood: 'idle' as PestMood,
    moodAt: 0,
    now: 0,
    reducedMotion: false,
    /** 움직임 줄이기에서 머무는 자리(처음엔 왼쪽 아래, 사용자가 옮기면 그 자리). */
    home: undefined as Point | undefined,
    /** 아직 가지 않은 달려가기 요청(받은 시각). */
    pending: undefined as { spot: PestSpot; at: number } | undefined,
    /** 달려가는 중(도착하면 오래 머문다). */
    visiting: false,
  });
  const listeners = useRef(new Set<(frame: PestFrame) => void>());
  const press = useRef({
    pointerId: -1,
    start: { x: 0, y: 0 } as Point,
    dragging: false,
    suppressClick: false,
  });

  // 반응이 바뀐 시각(자세 애니메이션용).
  useEffect(() => {
    const m = motion.current;
    if (m.mood !== pest.mood) {
      m.mood = pest.mood;
      m.moodAt = m.now;
    }
  }, [pest.mood]);

  const frame = useCallback((): PestFrame | undefined => {
    const m = motion.current;
    if (!m.point) return undefined;
    return {
      x: m.point.x,
      y: m.point.y,
      hop: m.hop,
      facing: m.facing,
      size: depthScale({ y: m.point.y, area: m.area }),
      area: m.area,
      time: (m.now - m.startedAt) / 1000,
      moodTime: (m.now - m.moodAt) / 1000,
      reducedMotion: m.reducedMotion,
      resting: m.resting,
    };
  }, []);

  const emit = useCallback(() => {
    const f = frame();
    if (!f) return;
    for (const listener of listeners.current) listener(f);
  }, [frame]);

  // 놀이 영역 기준 좌표.
  const toArea = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = areaRef.current?.getBoundingClientRect();
      return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
    },
    [areaRef],
  );

  // 가릴 지점: 문제 문장 상자 가운데(몸통이 글자를 덮도록 발밑을 조금 아래로).
  const coverPoint = useCallback((): Point => {
    const m = motion.current;
    const area = areaRef.current?.getBoundingClientRect();
    const cover = coverRef.current?.getBoundingClientRect();
    if (!area || !cover) {
      return { x: m.area.width / 2, y: areaBounds(m.area).top };
    }
    const center = {
      x: cover.left - area.left + cover.width / 2,
      y: cover.top - area.top + cover.height / 2,
    };
    const size = depthScale({ y: center.y, area: m.area });
    return clampToArea({
      point: { x: center.x, y: center.y + size * 0.35 },
      area: m.area,
    });
  }, [areaRef, coverRef]);

  // 반응해서 달려갈 요청이 오면 받아 둔다(움직일 수 있을 때 프레임에서 간다).
  const visitId = pest.visit?.id;
  useEffect(() => {
    const spot = pestRef.current.visit?.spot;
    if (visitId === undefined || !spot) return;
    motion.current.pending = { spot, at: performance.now() };
  }, [visitId]);

  // 화면 내용(놀이터·문제·힌트·입력칸) 아래 빈 곳. 방해꾼 그림·잡는 영역·말풍선은 뺀다.
  const below = useCallback((): Bounds | undefined => {
    const element = areaRef.current;
    if (!element) return undefined;
    const top = element.getBoundingClientRect().top;
    let floor = -1;
    for (const child of element.children) {
      if (child instanceof HTMLElement && child.dataset.pestPart) continue;
      floor = Math.max(floor, child.getBoundingClientRect().bottom - top);
    }
    if (floor < 0) return undefined;
    return spaceBelow({ area: motion.current.area, floor });
  }, [areaRef]);

  // 달려갈 지점. 그 자리가 없으면(힌트 카드가 없음, 아래 빈 곳이 없음) undefined.
  const spotPoint = useCallback(
    (spot: PestSpot): Point | undefined => {
      const m = motion.current;
      if (spot === 'gold') {
        // 동전이 날아가는 골드 배지 쪽: 놀이터 오른쪽 위.
        return m.roam ? { x: m.roam.right, y: m.roam.top } : undefined;
      }
      if (spot === 'below') {
        const b = below();
        // 아래에 몸이 들어갈 자리가 없으면(작은 화면, 힌트 목록이 열림) 놀이터 앞쪽 가운데로 나와 놀린다.
        if (!b) {
          return m.roam
            ? { x: (m.roam.left + m.roam.right) / 2, y: m.roam.bottom }
            : undefined;
        }
        // 입력칸 바로 아래에서 놀린다.
        return {
          x: b.left + randomRef.current() * (b.right - b.left),
          y: Math.min(b.bottom, b.top + 12),
        };
      }
      const area = areaRef.current;
      const deck = area?.querySelector('[data-pest-spot="hint"]');
      if (!area || !deck) return undefined;
      const a = area.getBoundingClientRect();
      const d = deck.getBoundingClientRect();
      const y = d.bottom - a.top;
      const size = depthScale({ y, area: m.area });
      // 카드 더미 왼쪽에 서서 카드를 기웃거린다.
      return clampToArea({
        point: { x: d.left - a.left - size * 0.3, y },
        area: m.area,
      });
    },
    [areaRef, below],
  );

  // 놀이 영역 크기를 재고(크기 변경도), 위치를 영역 안으로 당긴다.
  useEffect(() => {
    const element = areaRef.current;
    if (!element || !active) return;
    const m = motion.current;
    m.reducedMotion = prefersReducedMotion();
    const measure = (): void => {
      const rect = element.getBoundingClientRect();
      m.area = { width: rect.width, height: rect.height };
      // 놀이터 띠의 위아래(놀이 영역 기준)로 평소 다니는 범위를 정한다.
      const playground = playgroundRef?.current?.getBoundingClientRect();
      m.roam = playground
        ? playgroundBounds({
            area: m.area,
            top: playground.top - rect.top,
            bottom: playground.bottom - rect.top,
          })
        : areaBounds(m.area);
      // 크기가 바뀌면 위치·목표만 영역 안으로 당기고 가던 길은 그대로 간다.
      m.point = m.point
        ? clampToArea({ point: m.point, area: m.area })
        : m.reducedMotion
          ? restPoint(m)
          : pickRoamTarget({ bounds: m.roam, random: randomRef.current });
      if (m.target) m.target = clampToArea({ point: m.target, area: m.area });
      emit();
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [areaRef, playgroundRef, emit, active]);

  // 한 프레임 진행. 행동에 맞는 목표로 움직이고, 도착을 행동 hook에 알린다.
  const step = useCallback(
    (now: number, dt: number): void => {
      const m = motion.current;
      const p = pestRef.current;
      m.now = now;
      // 두리번거리는 동안만 true(물건 놀이). 아래 쉬는 분기에서 다시 켠다.
      m.resting = false;
      if (!m.point) return;
      // 가리기는 앉았는지와 상관없이 한 번만 목표를 정한다(시간이 먼저 끝나 앉아도 문제 위까지 간다).
      const plan =
        p.behavior === 'covering' ? 'covering' : `${p.behavior}:${p.dizzy}`;
      if (plan !== m.plannedFor) {
        m.plannedFor = plan;
        m.target = undefined;
        m.moveTime = 0;
        if (p.behavior === 'covering') {
          m.target = coverPoint();
          m.speed = travelSpeed({
            from: m.point,
            to: m.target,
            durationMs: PEST_TIMING.coverTravelMax * 0.9,
            minSpeed: animalRef.current.speed,
          });
        } else if (p.behavior === 'fleeing') {
          // 놀이터 안에서 잡힌 곳과 가장 먼 쪽으로.
          m.target = fleeTarget({
            bounds: m.roam ?? areaBounds(m.area),
            from: m.point,
          });
          m.speed = travelSpeed({
            from: m.point,
            to: m.target,
            durationMs: PEST_TIMING.fleeDuration * 0.9,
            minSpeed: animalRef.current.speed,
          });
        } else if (p.behavior === 'roaming' && m.reducedMotion) {
          // 움직임 줄이기: 머무는 자리로(가리기·도망이 끝나면 이동 없이 돌아온다).
          m.target = m.home ?? restPoint(m);
        }
      }

      // 반응해서 달려가기: 돌아다니는 중(어지럽지 않음)이면 두리번거리기를 끊고 간다.
      if (
        m.pending &&
        p.behavior === 'roaming' &&
        !p.dizzy &&
        !m.reducedMotion
      ) {
        const request = m.pending;
        m.pending = undefined;
        const to =
          now - request.at <= PEST_TIMING.visitStale
            ? spotPoint(request.spot)
            : undefined;
        if (to) {
          m.target = to;
          m.speed = travelSpeed({
            from: m.point,
            to,
            durationMs: PEST_TIMING.visitTravel,
            minSpeed: animalRef.current.speed,
          });
          m.moveTime = 0;
          m.restUntil = 0;
          m.visiting = true;
        }
      }

      const moving =
        p.behavior === 'fleeing' ||
        p.behavior === 'covering' ||
        (p.behavior === 'roaming' && !p.dizzy);

      if (moving && !m.target && p.behavior === 'roaming') {
        // 움직임 줄이기: 옮겨진 자리에 그대로 머문다(무작위로 순간 이동하지 않음).
        if (m.reducedMotion) {
          m.target = m.point;
          m.hop = 0;
          return;
        }
        if (now < m.restUntil) {
          m.hop = 0;
          m.resting = true;
          return;
        }
        // 놀이터 안 다음 지점(놀이터 밖에 있으면 이 걸음으로 놀이터로 돌아온다).
        // 놀이터에 있을 때 가끔은 입력칸 아래 빈 곳으로 산책 간다.
        const roam = m.roam ?? areaBounds(m.area);
        const inPlayground = isInside({ point: m.point, bounds: roam });
        const stroll = inPlayground ? below() : undefined;
        const strolling =
          stroll !== undefined && randomRef.current() < STROLL_CHANCE;
        m.target = pickRoamTarget({
          bounds: strolling ? stroll : roam,
          random: randomRef.current,
        });
        // 놀이터 안에서는 그 동물 빠르기로. 먼 길(산책·돌아오기)은 입력칸 위를
        // 오래 지나지 않게 서둘러 간다.
        m.speed =
          strolling || !inPlayground
            ? travelSpeed({
                from: m.point,
                to: m.target,
                durationMs: PEST_TIMING.visitTravel * 2,
                minSpeed: animalRef.current.speed,
              })
            : animalRef.current.speed;
        m.moveTime = 0;
      }

      if (!moving || !m.target) {
        m.hop = 0;
        return;
      }

      const from = m.point;
      const result = m.reducedMotion
        ? { point: m.target, arrived: true }
        : stepToward({ from, to: m.target, speed: m.speed, dt });
      const dx = result.point.x - from.x;
      const dy = result.point.y - from.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.01 && !m.reducedMotion) {
        m.facing = Math.atan2(dx, dy);
      }
      m.point = result.point;
      m.moveTime += dt;
      m.hop =
        m.reducedMotion || result.arrived
          ? 0
          : gaitLift({ gait: animalRef.current.gait, seconds: m.moveTime });

      if (result.arrived) {
        m.target = undefined;
        if (p.behavior === 'covering') {
          p.seat();
        } else if (p.behavior === 'fleeing') {
          p.arrive();
        } else if (!m.reducedMotion) {
          // 달려간 곳에서는 오래 머물며 구경하고, 그 뒤 놀이터로 돌아간다.
          m.restUntil =
            now +
            (m.visiting
              ? PEST_TIMING.visitStay
              : lookAroundDelay({ random: randomRef.current }));
          m.visiting = false;
          m.facing = 0;
        } else {
          // 움직임 줄이기에서는 목표 지점에 계속 머문다.
          m.target = m.point;
        }
      }
    },
    [coverPoint, spotPoint, below],
  );

  // 프레임 루프. 화면이 숨겨진 동안(paused)과 결과 화면(!active)에서는 돌리지 않는다.
  const paused = pest.behavior === 'paused';
  useEffect(() => {
    if (paused || !active) return;
    const m = motion.current;
    let handle = 0;
    let last = performance.now();
    if (m.startedAt === 0) m.startedAt = last;
    m.now = last;
    const loop = (now: number): void => {
      const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
      last = now;
      step(now, dt);
      emit();
      handle = requestAnimationFrame(loop);
    };
    handle = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(handle);
  }, [paused, active, step, emit]);

  const subscribe = useCallback(
    (listener: (frame: PestFrame) => void) => {
      listeners.current.add(listener);
      const f = frame();
      if (f) listener(f);
      return () => {
        listeners.current.delete(listener);
      };
    },
    [frame],
  );

  // 끄는 동안 토끼 발밑은 손가락보다 조금 아래(손가락에 매달린 모습).
  const dragTo = useCallback(
    (clientX: number, clientY: number): void => {
      const m = motion.current;
      const pointer = toArea(clientX, clientY);
      const size = depthScale({ y: pointer.y, area: m.area });
      m.point = clampToArea({
        point: { x: pointer.x, y: pointer.y + size * 0.4 },
        area: m.area,
      });
      m.hop = 0;
      emit();
    },
    [toArea, emit],
  );

  // 화면이 다시 그려져도 같은 객체를 돌려준다(구독을 다시 하지 않게).
  const handlers = useMemo<PestHandlers>(() => {
    const release = (event: PointerEvent<HTMLElement>): void => {
      const pressed = press.current;
      if (pressed.pointerId !== event.pointerId) return;
      if (pressed.dragging) {
        pestRef.current.drop();
        motion.current.home = motion.current.point;
      }
      pressed.pointerId = -1;
      pressed.dragging = false;
    };
    return {
      onPointerDown: (event) => {
        // 이미 누르고 있는 손가락이 있으면 다른 손가락은 무시한다(끌기가 굳지 않게).
        if (press.current.pointerId !== -1) return;
        press.current = {
          pointerId: event.pointerId,
          start: { x: event.clientX, y: event.clientY },
          dragging: false,
          suppressClick: false,
        };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      },
      onPointerMove: (event) => {
        const pressed = press.current;
        if (pressed.pointerId !== event.pointerId) return;
        const current = { x: event.clientX, y: event.clientY };
        if (
          !pressed.dragging &&
          isDragStart({ start: pressed.start, current })
        ) {
          pressed.dragging = true;
          pestRef.current.grab();
        }
        if (pressed.dragging) dragTo(event.clientX, event.clientY);
      },
      onPointerUp: (event) => {
        const pressed = press.current;
        if (pressed.pointerId !== event.pointerId) return;
        if (pressed.dragging) {
          pestRef.current.drop();
          motion.current.target = undefined;
          motion.current.home = motion.current.point;
          pressed.suppressClick = true;
        }
        pressed.pointerId = -1;
        pressed.dragging = false;
      },
      onPointerCancel: release,
      // 포인터를 놓친 경우(창 밖, 시스템 제스처 등)도 놓기로 친다.
      onLostPointerCapture: release,
      // 탭과 키보드 Enter/Space는 click으로 들어온다. 끌기 끝의 click은 무시.
      onClick: () => {
        if (press.current.suppressClick) {
          press.current.suppressClick = false;
          return;
        }
        pestRef.current.tap();
      },
      onKeyDown: (event) => {
        const m = motion.current;
        if (!m.point) return;
        const moved = nudge({ point: m.point, key: event.key, area: m.area });
        if (!moved) return;
        event.preventDefault();
        // 가리던 중·도망 중에 옮기면 끌기와 같게 친다(가리기 끝, 잠깐 어지러움).
        const behavior = pestRef.current.behavior;
        if (behavior === 'covering' || behavior === 'fleeing') {
          pestRef.current.grab();
          pestRef.current.drop();
        }
        m.point = moved;
        m.home = moved;
        m.target = undefined;
        m.restUntil = m.now + PEST_TIMING.lookAroundMax;
        emit();
      },
    };
  }, [dragTo, emit]);

  return useMemo(() => ({ subscribe, handlers }), [subscribe, handlers]);
}
