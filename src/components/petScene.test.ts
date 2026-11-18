import { describe, expect, it } from 'vitest';
import { petPoseParams } from './petScene.ts';

const base = {
  mood: 'idle',
  behavior: 'roaming',
  dizzy: false,
  time: 1.2,
  moodTime: 0,
  reducedMotion: false,
  resting: false,
  animal: 'rabbit',
} as const;

// WebGL 장면 자체는 jsdom에서 그릴 수 없어 브라우저에서 확인하고, 자세 계산만 시험한다.
describe('petPoseParams', () => {
  it('삐치면 귀가 처지고 고개를 숙이고, 놀라면 귀가 서고 눈이 커진다', () => {
    const sulky = petPoseParams({ ...base, mood: 'sulky' });
    const surprised = petPoseParams({ ...base, mood: 'surprised' });
    const idle = petPoseParams(base);
    expect(sulky.earDroop).toBeGreaterThan(idle.earDroop);
    expect(sulky.headTilt).toBeGreaterThan(0);
    expect(surprised.earDroop).toBeLessThan(idle.earDroop);
    expect(surprised.eyeScale).toBeGreaterThan(1);
  });

  it('비웃기는 0.8초 동안 한 바퀴 돌고 멈춘다', () => {
    expect(petPoseParams({ ...base, mood: 'taunt', moodTime: 0 }).spin).toBe(0);
    expect(
      petPoseParams({ ...base, mood: 'taunt', moodTime: 0.4 }).spin,
    ).toBeCloseTo(Math.PI);
    expect(
      petPoseParams({ ...base, mood: 'taunt', moodTime: 2 }).spin,
    ).toBeCloseTo(Math.PI * 2);
  });

  it('끌리면 발을 버둥거리고, 어지러우면 흔들리며 눈이 작아진다', () => {
    expect(petPoseParams({ ...base, behavior: 'dragged' }).kick).not.toBe(0);
    const dizzy = petPoseParams({ ...base, dizzy: true });
    expect(dizzy.wobble).not.toBe(0);
    expect(dizzy.eyeScale).toBeLessThan(1);
  });

  it('움직임 줄이기면 반복 움직임·돌기 없이 반응 모양만', () => {
    const still = { ...base, reducedMotion: true };
    expect(petPoseParams({ ...still, mood: 'taunt', moodTime: 0.4 }).spin).toBe(
      0,
    );
    expect(petPoseParams({ ...still, behavior: 'dragged' }).kick).toBe(0);
    expect(petPoseParams({ ...still, dizzy: true }).wobble).toBe(0);
    expect(petPoseParams({ ...still, mood: 'sulky' }).earDroop).toBeGreaterThan(
      1,
    );
  });

  it('물건 놀이는 놀이터에서 쉬는 동안만(반응·끌기·어지러움·움직임 줄이기면 안 함)', () => {
    const rest = { ...base, resting: true, time: 0.3 };
    expect(petPoseParams(rest).toyPlay).not.toBe(0);
    expect(petPoseParams(base).toyPlay).toBe(0);
    expect(petPoseParams({ ...rest, mood: 'smug' }).toyPlay).toBe(0);
    expect(petPoseParams({ ...rest, behavior: 'dragged' }).toyPlay).toBe(0);
    expect(petPoseParams({ ...rest, dizzy: true }).toyPlay).toBe(0);
    expect(petPoseParams({ ...rest, reducedMotion: true }).toyPlay).toBe(0);
  });

  it('강아지는 꼬리를 흔들고(신나면 더 크게, 삐치면 멈춤), 토끼는 흔들지 않는다', () => {
    const dog = { ...base, animal: 'dog', time: 0.13 } as const;
    const idle = Math.abs(petPoseParams(dog).tailWag);
    expect(idle).toBeGreaterThan(0);
    expect(Math.abs(petPoseParams({ ...dog, mood: 'smug' }).tailWag)).not.toBe(
      idle,
    );
    expect(petPoseParams({ ...dog, mood: 'sulky' }).tailWag).toBe(0);
    expect(petPoseParams({ ...dog, reducedMotion: true }).tailWag).toBe(0);
    expect(petPoseParams({ ...base, time: 0.13 }).tailWag).toBe(0);
  });

  it('반응 모양(삐침·놀람)은 모든 동물이 같다', () => {
    for (const animal of ['rabbit', 'dog', 'cat', 'squirrel'] as const) {
      const sulky = petPoseParams({ ...base, animal, mood: 'sulky' });
      expect(sulky.earDroop).toBeGreaterThan(1);
      expect(
        petPoseParams({ ...base, animal, mood: 'surprised' }).eyeScale,
      ).toBe(1.6);
    }
  });
});
