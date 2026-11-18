// 골드·진행 규칙(spec "골드와 진행 저장", CLAUDE.md 골드). 진행 객체를 바꾸지 않고 새 객체를 돌려준다.
import type { Progress, TopicProgress } from '../types/progress.ts';
import type { HintType, QuizItem, QuizTopic } from '../types/quiz.ts';
import { answerChars } from './answer.ts';

export const PROGRESS_VERSION = 1;
export const START_GOLD = 30;
export const CORRECT_GOLD = 10;
export const CORRECT_WITH_HINT_GOLD = 5;
export const HINT_PRICE = 5;
/** 방해꾼 간식 하나: 골드 20으로 5문제 동안 얌전. 15문제까지 쌓을 수 있다. */
export const TREAT_PRICE = 20;
export const TREAT_QUESTIONS = 5;
export const TREAT_MAX = 15;

/** 열 수 있는 힌트 한 단계: 보여 줄 문장과 무료 여부. */
export type OpenableHint = {
  text: string;
  paid: boolean;
  /** 힌트 종류(문장 / 한 글자 공개). MBTI는 공개된 축을 고정하는 데 쓴다. */
  type: HintType;
};

/** 처음 상태: 30골드, 빈 진행. */
export function initialProgress(): Progress {
  return { version: PROGRESS_VERSION, gold: START_GOLD, topics: {} };
}

/** 주제의 진행(없으면 빈 진행). */
export function topicProgress({
  progress,
  topicId,
}: {
  progress: Progress;
  topicId: string;
}): TopicProgress {
  return progress.topics[topicId] ?? { solved: [], hintsOpened: {} };
}

/** 주제에서 맞힌 문제 id 집합. */
export function solvedSet({
  progress,
  topicId,
}: {
  progress: Progress;
  topicId: string;
}): ReadonlySet<string> {
  return new Set(topicProgress({ progress, topicId }).solved);
}

/** 문제에서 연 힌트 단계 수. */
export function openedHintCount({
  progress,
  topicId,
  itemId,
}: {
  progress: Progress;
  topicId: string;
  itemId: string;
}): number {
  return topicProgress({ progress, topicId }).hintsOpened[itemId] ?? 0;
}

/**
 * 문제에서 열 수 있는 힌트 단계(순서대로, spec "힌트 단계").
 * - text: 주제의 n번째 text 단계에 문제의 hints[n]을 짝짓고, 문장이 없는 단계는 뺀다.
 * - revealLetter: 주제의 n번째 공개 단계가 정답의 n번째 글자를 연다. 그 글자로 정답 전체가 드러나면(글자 수 ≤ n) 뺀다.
 */
export function openableHints({
  topic,
  item,
}: {
  topic: QuizTopic;
  item: QuizItem;
}): OpenableHint[] {
  const texts = item.hints ?? [];
  const chars = answerChars(item.answer);
  const result: OpenableHint[] = [];
  let textIndex = 0;
  let revealIndex = 0;
  for (const step of topic.hints) {
    if (step.type === 'text') {
      const text = texts[textIndex];
      textIndex += 1;
      if (text !== undefined) {
        result.push({ text, paid: step.paid, type: 'text' });
      }
    } else {
      revealIndex += 1;
      const char = chars[revealIndex - 1];
      if (char !== undefined && chars.length > revealIndex) {
        result.push({
          text: revealHintText(revealIndex, char),
          paid: step.paid,
          type: 'revealLetter',
        });
      }
    }
  }
  return result;
}

/** 한 글자 공개 힌트 문구. 첫 글자면 "첫 글자는 'X'예요", 아니면 "N번째 글자는 'X'예요". */
export function revealHintText(position: number, char: string): string {
  return position === 1
    ? `첫 글자는 '${char}'예요`
    : `${position}번째 글자는 '${char}'예요`;
}

/**
 * 맞혔을 때: 처음 맞힌 문제면 solved에 넣고 골드 +10(힌트를 연 문제는 +5).
 * 이미 맞힌 문제(다시 풀기)면 그대로, 골드 0.
 */
export function recordCorrect({
  progress,
  topicId,
  itemId,
}: {
  progress: Progress;
  topicId: string;
  itemId: string;
}): { progress: Progress; goldEarned: number } {
  const current = topicProgress({ progress, topicId });
  if (current.solved.includes(itemId)) return { progress, goldEarned: 0 };
  const goldEarned =
    (current.hintsOpened[itemId] ?? 0) > 0
      ? CORRECT_WITH_HINT_GOLD
      : CORRECT_GOLD;
  return {
    goldEarned,
    progress: {
      ...progress,
      gold: progress.gold + goldEarned,
      topics: {
        ...progress.topics,
        [topicId]: { ...current, solved: [...current.solved, itemId] },
      },
    },
  };
}

/**
 * 힌트 한 단계 열기: 유료면 골드 5를 뺀다(모자라면 열지 않음). 연 단계 수를 1 늘린다.
 * 어느 단계를 여는지(무료·유료)는 부르는 쪽이 openableHints로 정한다.
 */
export function openHint({
  progress,
  topicId,
  itemId,
  paid,
}: {
  progress: Progress;
  topicId: string;
  itemId: string;
  paid: boolean;
}):
  { ok: true; progress: Progress } | { ok: false; reason: 'insufficientGold' } {
  const price = paid ? HINT_PRICE : 0;
  if (progress.gold < price) return { ok: false, reason: 'insufficientGold' };
  const current = topicProgress({ progress, topicId });
  return {
    ok: true,
    progress: {
      ...progress,
      gold: progress.gold - price,
      topics: {
        ...progress.topics,
        [topicId]: {
          ...current,
          hintsOpened: {
            ...current.hintsOpened,
            [itemId]: (current.hintsOpened[itemId] ?? 0) + 1,
          },
        },
      },
    },
  };
}

/** 간식 사기: 골드 20을 빼고 남은 간식 문제 수 +5(최대 15). */
export function buyTreat(
  progress: Progress,
):
  | { ok: true; progress: Progress }
  | { ok: false; reason: 'insufficientGold' | 'full' } {
  const treats = progress.treats ?? 0;
  if (treats + TREAT_QUESTIONS > TREAT_MAX)
    return { ok: false, reason: 'full' };
  if (progress.gold < TREAT_PRICE) {
    return { ok: false, reason: 'insufficientGold' };
  }
  return {
    ok: true,
    progress: {
      ...progress,
      gold: progress.gold - TREAT_PRICE,
      treats: treats + TREAT_QUESTIONS,
    },
  };
}

/** 문제를 하나 맞힐 때마다 간식 하나를 먹는다(남은 게 있으면). */
export function eatTreat(progress: Progress): Progress {
  const treats = progress.treats ?? 0;
  return treats > 0 ? { ...progress, treats: treats - 1 } : progress;
}
