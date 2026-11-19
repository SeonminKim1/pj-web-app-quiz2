// 방해꾼 동물 설정. 화면 코드는 동물 id로 분기하지 않고 이 값을 읽는다.
// 생김새는 PetPortrait.tsx(2D SVG)가 동물별로 그린다.
import type { PetId } from '../types/settings.ts';
import { randomIntBetween, type RandomFn } from './random.ts';

/** 걷는 모양: 깡충(높이 px, 초당 횟수) 또는 걷기(몸 위아래 px, 초당 걸음). */
export type PetGait =
  | { kind: 'hop'; height: number; perSecond: number }
  | { kind: 'walk'; bob: number; perSecond: number };

/** 동물 하나의 설정. */
export type PestAnimal = {
  id: PetId;
  /** 화면에 보일 이름. */
  label: string;
  /** 가지고 노는 물건 이름. */
  toy: string;
  /** 설정 화면의 성격 설명. */
  description: string;
  gait: PetGait;
  /** 돌아다니는 빠르기(px/초). */
  speed: number;
  /** 다음 가리기까지의 간격(ms). */
  coverDelay: { min: number; max: number };
};

/** 고를 수 있는 동물(설정 화면에 이 순서로). */
export const PEST_ANIMALS: readonly PestAnimal[] = [
  {
    id: 'rabbit',
    label: '토끼',
    toy: '당근',
    description: '깡충깡충 뛰어다녀요',
    gait: { kind: 'hop', height: 14, perSecond: 2.5 },
    speed: 90,
    coverDelay: { min: 15_000, max: 30_000 },
  },
  {
    id: 'dog',
    label: '강아지',
    toy: '뼈다귀',
    description: '얌전히 걸어 다녀요 · 덜 자주 가려요',
    gait: { kind: 'walk', bob: 3, perSecond: 3 },
    speed: 50,
    coverDelay: { min: 30_000, max: 50_000 },
  },
  {
    id: 'cat',
    label: '고양이',
    toy: '털실 공',
    description: '살금살금 다녀요',
    gait: { kind: 'walk', bob: 2, perSecond: 2 },
    speed: 65,
    coverDelay: { min: 20_000, max: 40_000 },
  },
  {
    id: 'squirrel',
    label: '다람쥐',
    toy: '도토리',
    description: '쪼르르 재빨라요',
    gait: { kind: 'hop', height: 6, perSecond: 5 },
    speed: 130,
    coverDelay: { min: 12_000, max: 25_000 },
  },
];

/** 걸음으로 뜨는 높이의 최댓값(px). 동물 몸이 놀이 영역 위로 잘리지 않게 여백을 정할 때 쓴다. */
export const MAX_GAIT_LIFT = Math.max(
  ...PEST_ANIMALS.map((animal) =>
    animal.gait.kind === 'hop' ? animal.gait.height : animal.gait.bob,
  ),
);

/** 값이 고를 수 있는 동물 id인지 확인한다. */
export function isPetId(value: unknown): value is PetId {
  return PEST_ANIMALS.some((animal) => animal.id === value);
}

/** 동물 id로 설정을 찾는다. */
export function getPestAnimal(id: PetId): PestAnimal {
  const found = PEST_ANIMALS.find((animal) => animal.id === id);
  // PetId와 PEST_ANIMALS가 어긋났을 때만 온다(테스트로 막는다).
  if (!found) throw new Error(`알 수 없는 방해꾼 동물: ${id}`);
  return found;
}

/** 움직인 시간(초)에 따라 걸음으로 뜬 높이(px, 0 이상). */
export function gaitLift({
  gait,
  seconds,
}: {
  gait: PetGait;
  seconds: number;
}): number {
  const size = gait.kind === 'hop' ? gait.height : gait.bob;
  return Math.abs(Math.sin(seconds * Math.PI * gait.perSecond)) * size;
}

/** 그 동물의 다음 가리기까지 간격(ms, 간격 범위 안 무작위). */
export function nextCoverDelayFor({
  animal,
  random,
}: {
  animal: PestAnimal;
  random: RandomFn;
}): number {
  const { min, max } = animal.coverDelay;
  return randomIntBetween({ min, max, random });
}

/** 동물별 간식 이름(간식 주기 버튼·문구). */
export const TREAT_NAME: Record<PetId, string> = {
  rabbit: '당근',
  dog: '뼈다귀',
  cat: '생선',
  squirrel: '도토리',
};
