import { describe, expect, it } from 'vitest';
import type { PetId } from '../types/settings.ts';
import {
  MAX_GAIT_LIFT,
  PEST_ANIMALS,
  gaitLift,
  getPestAnimal,
  isPetId,
  nextCoverDelayFor,
} from './pestAnimals.ts';

// PetId 유니온의 모든 값. 유니온에 값을 더하면 이 객체도 고쳐야 타입 검사를 통과한다.
const ALL_IDS: Record<PetId, true> = {
  rabbit: true,
  dog: true,
  cat: true,
  squirrel: true,
};

describe('PEST_ANIMALS', () => {
  it('타입의 모든 동물을 한 번씩, spec 순서로 담는다', () => {
    const ids = PEST_ANIMALS.map((animal) => animal.id);
    expect(ids).toEqual(['rabbit', 'dog', 'cat', 'squirrel']);
    expect([...ids].sort()).toEqual(Object.keys(ALL_IDS).sort());
  });

  it('spec 표의 이름·물건·빠르기·가리기 간격', () => {
    expect(
      PEST_ANIMALS.map((a) => [
        a.label,
        a.toy,
        a.speed,
        a.coverDelay.min,
        a.coverDelay.max,
      ]),
    ).toEqual([
      ['토끼', '당근', 90, 15_000, 30_000],
      ['강아지', '뼈다귀', 50, 30_000, 50_000],
      ['고양이', '털실 공', 65, 20_000, 40_000],
      ['다람쥐', '도토리', 130, 12_000, 25_000],
    ]);
  });

  it('강아지는 토끼보다 느리고 덜 자주 가린다', () => {
    const rabbit = getPestAnimal('rabbit');
    const dog = getPestAnimal('dog');
    expect(dog.speed).toBeLessThan(rabbit.speed);
    expect(dog.coverDelay.min).toBeGreaterThanOrEqual(rabbit.coverDelay.max);
    expect(dog.gait.kind).toBe('walk');
  });
});

describe('isPetId / getPestAnimal', () => {
  it('고를 수 있는 동물 id만 true', () => {
    expect(isPetId('dog')).toBe(true);
    expect(isPetId('dragon')).toBe(false);
    expect(isPetId(undefined)).toBe(false);
    expect(getPestAnimal('cat').label).toBe('고양이');
  });
});

describe('gaitLift', () => {
  it('땅에서 시작하고 0 이상, 그 걸음의 높이를 넘지 않는다', () => {
    for (const animal of PEST_ANIMALS) {
      expect(gaitLift({ gait: animal.gait, seconds: 0 })).toBe(0);
      const max =
        animal.gait.kind === 'hop' ? animal.gait.height : animal.gait.bob;
      for (const t of [0.05, 0.13, 0.5, 1.7]) {
        const lift = gaitLift({ gait: animal.gait, seconds: t });
        expect(lift).toBeGreaterThanOrEqual(0);
        expect(lift).toBeLessThanOrEqual(max);
        expect(lift).toBeLessThanOrEqual(MAX_GAIT_LIFT);
      }
    }
  });
});

describe('nextCoverDelayFor', () => {
  it('그 동물의 간격 범위 안 정수(난수 0 → 최소, 1 이상 → 최대)', () => {
    const dog = getPestAnimal('dog');
    expect(nextCoverDelayFor({ animal: dog, random: () => 0 })).toBe(30_000);
    expect(nextCoverDelayFor({ animal: dog, random: () => 1 })).toBe(50_000);
    const middle = nextCoverDelayFor({ animal: dog, random: () => 0.5 });
    expect(Number.isInteger(middle)).toBe(true);
    expect(middle).toBeGreaterThan(30_000);
    expect(middle).toBeLessThan(50_000);
  });
});
