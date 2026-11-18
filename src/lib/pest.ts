// 방해꾼 캐릭터 규칙(spec "화면 상태"): 행동·반응 이름, 시간 값, 말풍선 문구, 무작위 고르기.
import type { RandomFn } from './random.ts';
import { randomIntBetween } from './random.ts';

/** 행동 상태(spec "행동 상태"). paused는 화면이 숨겨진 동안. */
export type PestBehavior =
  'roaming' | 'covering' | 'fleeing' | 'dragged' | 'paused';

/** 표정. */
export type PestMood = 'idle' | 'smug' | 'taunt' | 'sulky' | 'surprised';

/** 말풍선 종류(언제 띄우는지). */
export type PestLineKind = 'cover' | 'wrong' | 'correct' | 'caught';

/** 시간 값(ms). 실제로 해 보고 조정하기 쉽게 한곳에 둔다. */
export const PEST_TIMING = {
  /** 앉은 때부터 스스로 떠날 때까지. */
  coverDuration: 5_000,
  /** 가리러 문제 위까지 뛰어가는 최대 시간. */
  coverTravelMax: 1_500,
  bubbleDuration: 2_000,
  /** 잡혀서 가장 먼 쪽까지 달아나는 시간. */
  fleeDuration: 800,
  /** 돌아다니다 도착해서 두리번거리는 시간(최소~최대). */
  lookAroundMin: 1_000,
  lookAroundMax: 2_000,
  /** 끌기에서 놓인 뒤 어지러워하는 시간. */
  dizzyDuration: 1_000,
} as const;

/** 말풍선 종류마다 띄울 표정. */
export const PEST_LINE_MOOD: Record<PestLineKind, PestMood> = {
  cover: 'smug',
  wrong: 'taunt',
  correct: 'sulky',
  caught: 'surprised',
};

/** 말풍선 문구(직접 씀, 특정 집단·모욕 표현 없음). */
export const PEST_LINES: Record<PestLineKind, readonly string[]> = {
  cover: ['안 보이지~?', '여긴 내 자리야', '문제 보고 싶어?'],
  wrong: [
    '에이~ 그것도 모름?',
    '땡! 킹받지?',
    '아깝다~ 아니 안 아깝다',
    '다시 생각해 봐~ 크크',
    '정답은 비밀이지롱',
  ],
  correct: [
    '쳇, 운이 좋았네',
    '어떻게 알았지?!',
    '흥, 다음엔 못 맞힐걸',
    '이건 너무 쉬웠어…',
  ],
  caught: ['으악! 들켰다', '놔줘~!', '치사하게 누르기냐', '알았어 비켜 줄게…'],
};

/** 종류에 맞는 말풍선 문구를 하나 고른다. */
export function pickLine({
  kind,
  random,
}: {
  kind: PestLineKind;
  random: RandomFn;
}): string {
  const lines = PEST_LINES[kind];
  return lines[randomIntBetween({ min: 0, max: lines.length - 1, random })]!;
}

/** 도착해서 두리번거리는 시간(1~2초 사이, ms 정수). */
export function lookAroundDelay({ random }: { random: RandomFn }): number {
  const { lookAroundMin: min, lookAroundMax: max } = PEST_TIMING;
  return randomIntBetween({ min, max, random });
}
