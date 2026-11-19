// 방해꾼 캐릭터 규칙(spec "화면 상태"): 행동·반응 이름, 시간 값, 말풍선 문구, 무작위 고르기.
import type { RandomFn } from './random.ts';
import { randomIntBetween } from './random.ts';

/** 행동 상태(spec "행동 상태"). paused는 화면이 숨겨진 동안. */
export type PestBehavior =
  'roaming' | 'covering' | 'fleeing' | 'dragged' | 'paused';

/**
 * 반응해서 달려갈 곳: 힌트 카드 옆(힌트를 열면), 골드 쪽(맞히면 동전을 쫓아),
 * 입력칸 아래 빈 곳(틀리면 놀리러).
 */
export type PestSpot = 'hint' | 'gold' | 'below';

/** 돌아다니다 놀이터 대신 입력칸 아래 빈 곳으로 산책 갈 확률(빈 곳이 있을 때). */
export const STROLL_CHANCE = 0.2;

/** 표정. */
export type PestMood =
  'idle' | 'smug' | 'taunt' | 'sulky' | 'surprised' | 'happy';

/** 말풍선 종류(언제 띄우는지). */
export type PestLineKind =
  | 'cover'
  | 'wrong'
  | 'correct'
  | 'caught'
  | 'treat'
  | 'invite'
  | 'dragged'
  | 'dropped'
  | 'hint';

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
  /** 반응해서 달려갈 때(힌트 카드·동전·입력칸 아래) 도착까지 시간. */
  visitTravel: 700,
  /** 달려간 곳에 머무는 시간. 그 뒤 놀이터로 돌아간다. */
  visitStay: 2_500,
  /** 반응 요청이 이보다 오래되면(끌리거나 어지러운 동안 지나감) 가지 않는다. */
  visitStale: 1_500,
} as const;

/** 말풍선 종류마다 띄울 표정. */
export const PEST_LINE_MOOD: Record<PestLineKind, PestMood> = {
  cover: 'smug',
  wrong: 'taunt',
  correct: 'sulky',
  caught: 'surprised',
  treat: 'happy',
  invite: 'taunt',
  dragged: 'surprised',
  dropped: 'sulky',
  hint: 'surprised',
};

/** 이 시간(ms) 동안 아무 일이 없으면 아직 끌어 보지 않은 사람에게 "끌어 봐"라고 말을 건다. */
export const INVITE_DELAY = 3_000;

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
  invite: [
    '날 잡아서 끌어 봐~',
    '꾹 잡고 옮겨 볼래?',
    '잡을 수 있으면 잡아 봐!',
    '치우고 싶으면 끌어 보시지~',
  ],
  dragged: ['으아 어디 가!', '내려 줘~', '우와 하늘을 난다!', '살살 좀 다뤄~'],
  dropped: ['어지러워…', '빙글빙글~', '다시는 안 그럴게…'],
  hint: [
    '앗! 힌트 쓰기냐~',
    '그거 봐도 모를걸?',
    '치사하게 힌트를…',
    '힌트 줘도 못 맞힐걸~',
    '아 그걸 보여 주면 어떡해!',
  ],
  treat: [
    '냠냠! 고마워',
    '이거 내 최애야!',
    '헤헤 기분 좋다',
    '한 개만 더…?',
    '맛있다~',
    '오늘은 봐줄게!',
  ],
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
