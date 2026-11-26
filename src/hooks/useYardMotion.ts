// 놀이터 마당 동물 움직임(설계 D34, D40, D41, D45, D46). 동물 네 마리를 requestAnimationFrame 하나로 움직이고,
// 프레임마다 React를 다시 그리지 않도록 구독(subscribe)으로 그리기 쪽에 넘긴다.
// 자리는 모두 이 hook이 정한다. 움직임 줄이기면 루프 없이 서 있는 자리(PR ③과 같은 자리)에만 둔다.
// 좋아하는 물건이 놓이면 그 옆으로 가서 8~12초 머물고, 1~2곳을 돌아다닌 뒤 돌아온다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  nextYardLeg,
  pickRoamTarget,
  standingPoint,
  stepToward,
  yardBounds,
  yardRestMs,
  type Area,
  type Bounds,
  type Box,
  type Point,
  type YardLeg,
} from '../lib/pestMotion.ts';
import { gaitLift, getPestAnimal } from '../lib/pestAnimals.ts';
import type { RandomFn } from '../lib/random.ts';
import { prefersReducedMotion } from '../lib/reducedMotion.ts';
import type { PetId } from '../types/settings.ts';

/** 마당에 서는 동물 하나. */
export type YardAnimalInput = {
  id: PetId;
  /** 좋아하는 물건이 없을 때 아래 줄 자리 번호. */
  slot: number;
  /** 그림 크기(px). */
  size: number;
  /** 좋아하는 물건이 놓인 칸(가장 앞 번호, D39), 없으면 undefined. */
  home: number | undefined;
  /** 고른 방해꾼(같은 높이면 앞에 그린다). */
  front: boolean;
};

/** 한 프레임의 동물 위치(마당 기준 px, 발밑)와 그리기에 필요한 값. */
export type YardFrame = {
  x: number;
  y: number;
  /** 걸음으로 뜬 높이(px). */
  hop: number;
  /** 바라보는 방향(라디안, 0 = 화면 쪽). */
  facing: number;
  size: number;
  /** 겹칠 때 순서: 풀밭 아래쪽(가까운 쪽)일수록 크다(D45). */
  z: number;
};

export type YardMotion = {
  /** 그 동물의 프레임마다 불릴 함수를 등록한다. 돌려준 함수로 해제. 위치가 있으면 바로 한 번 불린다. */
  subscribe: (id: PetId, listener: (frame: YardFrame) => void) => () => void;
};

// 최대 한 프레임 시간(초). 잠깐 멈췄다 돌아와도 순간이동하지 않게.
const MAX_DT = 0.05;

type AnimalState = {
  point: Point | undefined;
  target: Point | undefined;
  leg: YardLeg;
  /** 도착 뒤 남은 쉬는 시간(ms, 프레임 시간으로 센다, O3). */
  restLeft: number;
  moveTime: number;
  hop: number;
  facing: number;
  home: number | undefined;
};

function emptyState(): AnimalState {
  return {
    point: undefined,
    target: undefined,
    leg: { kind: 'roam', left: 0 },
    restLeft: 0,
    moveTime: 0,
    hop: 0,
    facing: 0,
    home: undefined,
  };
}

/** 같은 높이면 고른 방해꾼이 앞(+1). */
function depthOrder(y: number, front: boolean): number {
  return Math.round(y) * 2 + (front ? 1 : 0);
}

/**
 * 마당 동물 움직임 hook. yardRef는 마당, layerRef는 칸 목록(서 있는 자리와 풀밭 윗변을 잰다).
 * animals는 그릴 때마다 새로 만들어도 된다(좋아하는 칸이 바뀌면 그쪽으로 간다).
 */
export function useYardMotion({
  yardRef,
  layerRef,
  animals,
  random = Math.random,
}: {
  yardRef: { current: HTMLElement | null };
  layerRef: { current: HTMLElement | null };
  animals: readonly YardAnimalInput[];
  random?: RandomFn;
}): YardMotion {
  const animalsRef = useRef(animals);
  const randomRef = useRef(random);
  useEffect(() => {
    animalsRef.current = animals;
    randomRef.current = random;
  });
  const geometry = useRef<{ area: Area; layer: Box } | undefined>(undefined);
  const states = useRef(new Map<PetId, AnimalState>());
  const listeners = useRef(new Map<PetId, Set<(frame: YardFrame) => void>>());
  const reduced = useRef(false);
  const [hidden, setHidden] = useState(
    () => typeof document !== 'undefined' && document.hidden,
  );

  const stateOf = useCallback((id: PetId): AnimalState => {
    let s = states.current.get(id);
    if (!s) {
      s = emptyState();
      states.current.set(id, s);
    }
    return s;
  }, []);

  const boundsOf = useCallback(
    (animal: YardAnimalInput): Bounds | undefined => {
      const g = geometry.current;
      if (!g) return undefined;
      return yardBounds({
        area: g.area,
        size: animal.size,
        grassTop: g.layer.top,
      });
    },
    [],
  );

  /** 서 있는 자리. 움직일 때는 다니는 범위 안으로 당긴다(움직임 줄이기면 PR ③ 자리 그대로). */
  const standing = useCallback(
    (animal: YardAnimalInput, cell: number | undefined): Point | undefined => {
      const g = geometry.current;
      if (!g) return undefined;
      const point = standingPoint({
        layer: g.layer,
        cell,
        slot: animal.slot,
        size: animal.size,
      });
      if (reduced.current) return point;
      const b = boundsOf(animal);
      return b
        ? {
            x: Math.min(b.right, Math.max(b.left, point.x)),
            y: Math.min(b.bottom, Math.max(b.top, point.y)),
          }
        : point;
    },
    [boundsOf],
  );

  const targetFor = useCallback(
    (animal: YardAnimalInput, s: AnimalState): Point | undefined => {
      if (s.leg.kind === 'home') return standing(animal, s.home);
      const b = boundsOf(animal);
      return b
        ? pickRoamTarget({ bounds: b, random: randomRef.current })
        : undefined;
    },
    [standing, boundsOf],
  );

  const frameOf = useCallback(
    (animal: YardAnimalInput): YardFrame | undefined => {
      const s = states.current.get(animal.id);
      if (!s?.point) return undefined;
      return {
        x: s.point.x,
        y: s.point.y,
        hop: s.hop,
        facing: s.facing,
        size: animal.size,
        z: depthOrder(s.point.y, animal.front),
      };
    },
    [],
  );

  const emit = useCallback(() => {
    for (const animal of animalsRef.current) {
      const set = listeners.current.get(animal.id);
      if (!set?.size) continue;
      const f = frameOf(animal);
      if (!f) continue;
      for (const listener of set) listener(f);
    }
  }, [frameOf]);

  /** 좋아하는 칸이 바뀐 동물은 바로 그쪽으로(치웠으면 다시 돌아다니기). 움직임 줄이기면 자리만 옮긴다. */
  const syncHomes = useCallback(() => {
    for (const animal of animalsRef.current) {
      const s = stateOf(animal.id);
      if (s.point && s.home === animal.home) continue;
      const first = s.point === undefined;
      s.home = animal.home;
      if (!geometry.current) continue;
      if (reduced.current) {
        s.point = standing(animal, s.home);
        s.target = undefined;
        s.hop = 0;
        continue;
      }
      if (first) {
        // 처음에는 서 있는 자리에서 시작한다(움직임 줄이기 배치와 같은 자리, D41).
        s.point = standing(animal, s.home);
        s.leg =
          s.home === undefined ? { kind: 'roam', left: 0 } : { kind: 'home' };
        s.target = undefined;
        s.restLeft = yardRestMs({ leg: s.leg, random: randomRef.current });
        continue;
      }
      s.leg =
        s.home === undefined ? { kind: 'roam', left: 0 } : { kind: 'home' };
      s.restLeft = 0;
      s.target = targetFor(animal, s);
    }
  }, [stateOf, standing, targetFor]);

  // 마당과 칸 목록을 재고(크기 변경도), 위치·목표를 새 범위 안으로 당긴다.
  useEffect(() => {
    const yard = yardRef.current;
    if (!yard) return;
    reduced.current = prefersReducedMotion();
    const measure = (): void => {
      const rect = yard.getBoundingClientRect();
      const layerRect = layerRef.current?.getBoundingClientRect() ?? rect;
      geometry.current = {
        area: { width: rect.width, height: rect.height },
        layer: {
          left: layerRect.left - rect.left,
          top: layerRect.top - rect.top,
          width: layerRect.width,
          height: layerRect.height,
        },
      };
      for (const animal of animalsRef.current) {
        const s = stateOf(animal.id);
        if (!s.point) continue;
        if (reduced.current) {
          s.point = standing(animal, s.home);
          continue;
        }
        const b = boundsOf(animal);
        if (!b) continue;
        const into = (p: Point): Point => ({
          x: Math.min(b.right, Math.max(b.left, p.x)),
          y: Math.min(b.bottom, Math.max(b.top, p.y)),
        });
        s.point = into(s.point);
        if (s.target) s.target = into(s.target);
        // 좋아하는 물건 쪽이면 그 칸의 새 자리로(가는 중이면 목표를, 머무는 중이면 자리를).
        if (s.leg.kind === 'home' && s.home !== undefined) {
          const spot = standing(animal, s.home);
          if (spot && s.target) s.target = spot;
          else if (spot) s.point = spot;
        }
      }
      syncHomes();
      emit();
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(yard);
    return () => observer.disconnect();
  }, [yardRef, layerRef, stateOf, standing, boundsOf, syncHomes, emit]);

  // 좋아하는 칸이 바뀌면(놓기·옮기기·빼기) 바로 반영한다. 움직임 줄이기에서는 프레임이 없으니 여기서 그린다(O2).
  const homes = animals.map((a) => `${a.id}:${a.home ?? '-'}`).join(',');
  useEffect(() => {
    syncHomes();
    emit();
  }, [homes, syncHomes, emit]);

  // 다른 탭으로 가면 멈춘다(D34, D46). 풀이 화면 방해꾼(usePest)과 같은 방식.
  useEffect(() => {
    const onChange = (): void => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  const step = useCallback(
    (dt: number): void => {
      for (const animal of animalsRef.current) {
        const s = stateOf(animal.id);
        if (!s.point) continue;
        if (s.restLeft > 0) {
          s.restLeft -= dt * 1000;
          s.hop = 0;
          if (s.restLeft > 0) continue;
          s.leg = nextYardLeg({
            leg: s.leg,
            hasHome: s.home !== undefined,
            random: randomRef.current,
          });
          s.target = targetFor(animal, s);
        }
        if (!s.target) {
          s.target = targetFor(animal, s);
          if (!s.target) continue;
        }
        const { speed, gait } = getPestAnimal(animal.id);
        const from = s.point;
        const result = stepToward({ from, to: s.target, speed, dt });
        const dx = result.point.x - from.x;
        const dy = result.point.y - from.y;
        if (Math.abs(dx) + Math.abs(dy) > 0.01) s.facing = Math.atan2(dx, dy);
        s.point = result.point;
        s.moveTime += dt;
        s.hop = result.arrived ? 0 : gaitLift({ gait, seconds: s.moveTime });
        if (result.arrived) {
          s.target = undefined;
          s.facing = 0;
          s.restLeft = yardRestMs({ leg: s.leg, random: randomRef.current });
        }
      }
    },
    [stateOf, targetFor],
  );

  // 프레임 루프. 숨긴 탭·움직임 줄이기에서는 돌리지 않는다.
  useEffect(() => {
    if (hidden || prefersReducedMotion()) return;
    let handle = 0;
    let last = performance.now();
    const loop = (now: number): void => {
      const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
      last = now;
      step(dt);
      emit();
      handle = requestAnimationFrame(loop);
    };
    handle = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(handle);
  }, [hidden, step, emit]);

  const subscribe = useCallback(
    (id: PetId, listener: (frame: YardFrame) => void) => {
      let set = listeners.current.get(id);
      if (!set) {
        set = new Set();
        listeners.current.set(id, set);
      }
      set.add(listener);
      const animal = animalsRef.current.find((a) => a.id === id);
      const f = animal && frameOf(animal);
      if (f) listener(f);
      return () => {
        set.delete(listener);
      };
    },
    [frameOf],
  );

  return useMemo(() => ({ subscribe }), [subscribe]);
}
