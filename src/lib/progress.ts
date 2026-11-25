// 골드·진행 규칙(spec "골드와 진행 저장", CLAUDE.md 골드). 진행 객체를 바꾸지 않고 새 객체를 돌려준다.
import type { Progress, TopicProgress } from '../types/progress.ts';
import type { PetId } from '../types/settings.ts';
import type { HintType, QuizItem, QuizTopic } from '../types/quiz.ts';
import { answerChars } from './answer.ts';
import { revealAxisText } from './mbti.ts';
import {
  SHOP_ITEM_IDS,
  SHOP_PRICE,
  STARTER_ITEM_ID,
  getReward,
  getYardItem,
  rewardFor,
  type Reward,
} from './rewards.ts';
import { stageProgress, type Stage } from './stages.ts';

export const PROGRESS_VERSION = 1;
const START_GOLD = 30;
const CORRECT_GOLD = 10;
const CORRECT_WITH_HINT_GOLD = 5;
export const HINT_PRICE = 5;

/** 열 수 있는 힌트 한 단계: 보여 줄 문장과 무료 여부. */
export type OpenableHint = {
  text: string;
  paid: boolean;
  /** 힌트 종류(문장 / 한 글자 공개). MBTI(mbtiAxes)는 공개된 축을 고정하는 데 쓴다. */
  type: HintType;
};

/** 처음 상태: 30골드, 빈 진행. */
export function initialProgress(): Progress {
  return { version: PROGRESS_VERSION, gold: START_GOLD, topics: {} };
}

/** 주제의 진행(없으면 빈 진행). */
function topicProgress({
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
 *   4축 고르기(mbtiAxes) 주제는 n번째 축을 연다("E/I 축은 'I' 내향").
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
  const revealText =
    topic.play[0] === 'mbtiAxes' ? revealAxisText : revealHintText;
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
          text: revealText(revealIndex, char),
          paid: step.paid,
          type: 'revealLetter',
        });
      }
    }
  }
  return result;
}

/** 한 글자 공개 힌트 문구. 첫 글자면 "첫 글자는 'X'예요", 아니면 "N번째 글자는 'X'예요". */
function revealHintText(position: number, char: string): string {
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

/**
 * 다 푼 판의 보상을 받은 것으로 기록한다(설계 "받은 보상은 계산해서 주고, 준 것은 기록한다").
 * 이미 받은 보상은 그대로 두고, 새로 받은 것이 없으면 같은 진행 객체를 돌려준다(저장하지 않게).
 */
export function claimRewards({
  progress,
  topic,
  rounds,
}: {
  progress: Progress;
  topic: QuizTopic;
  rounds: readonly (Stage & { name?: string })[];
}): Progress {
  const solved = solvedSet({ progress, topicId: topic.id });
  const earned = new Set(progress.earnedRewards ?? []);
  const added: string[] = [];
  for (const round of rounds) {
    if (!stageProgress({ stage: round, solved }).completed) continue;
    const reward = rewardFor({ topic, round });
    if (reward && !earned.has(reward.id)) {
      earned.add(reward.id);
      added.push(reward.id);
    }
  }
  if (added.length === 0) return progress;
  return {
    ...progress,
    earnedRewards: [...(progress.earnedRewards ?? []), ...added],
  };
}

/** 보상을 보여 준 것으로 기록한다. 새로 본 것이 없으면 같은 진행 객체를 돌려준다. */
export function markRewardsSeen({
  progress,
  ids,
}: {
  progress: Progress;
  ids: readonly string[];
}): Progress {
  const seen = new Set(progress.seenRewards ?? []);
  const added = ids.filter((id) => !seen.has(id) && seen.add(id));
  if (added.length === 0) return progress;
  return {
    ...progress,
    seenRewards: [...(progress.seenRewards ?? []), ...added],
  };
}

/** 받았지만 아직 보여 주지 않은 보상 id(받은 순서). */
export function unseenRewards(progress: Progress): string[] {
  const seen = new Set(progress.seenRewards ?? []);
  return (progress.earnedRewards ?? []).filter((id) => !seen.has(id));
}

/** 받은 보상인지(기록된 것). */
function isEarned(progress: Progress, id: string): boolean {
  return (progress.earnedRewards ?? []).includes(id);
}

/** 이 동물이 쓰고 있는 모자. 모르는 id, 모자가 아닌 보상, 받지 않은 모자면 없음(설계 D30). */
export function hatOf({
  progress,
  pet,
}: {
  progress: Progress;
  pet: PetId;
}): Reward | undefined {
  const id = progress.equipped?.[pet];
  if (id === undefined || !isEarned(progress, id)) return undefined;
  const reward = getReward(id);
  return reward?.kind === 'hat' ? reward : undefined;
}

/**
 * 동물에게 모자를 씌운다(hatId가 없으면 벗긴다). 받은 모자만 씌울 수 있고,
 * 받지 않았거나 모자가 아니거나 이미 그 상태면 같은 진행 객체를 돌려준다(저장하지 않게).
 */
export function equipHat({
  progress,
  pet,
  hatId,
}: {
  progress: Progress;
  pet: PetId;
  hatId: string | undefined;
}): Progress {
  if (
    hatId !== undefined &&
    (getReward(hatId)?.kind !== 'hat' || !isEarned(progress, hatId))
  ) {
    return progress;
  }
  if (progress.equipped?.[pet] === hatId) return progress;
  const equipped = { ...progress.equipped };
  if (hatId === undefined) delete equipped[pet];
  else equipped[pet] = hatId;
  const next: Progress = { ...progress, equipped };
  if (Object.keys(equipped).length === 0) delete next.equipped;
  return next;
}

// ── 놀이터(설계 PR ③: D14, D36–D38, F4, F8, F12) ──

/** 놀이터 칸 수(3열 × 2줄). */
export const YARD_CELLS = 6;

/** 가진 놀이터 물건: 기본 물건 + 받은 물건 보상 + 산 물건(아는 id만, 중복 없음). */
export function ownedYardItems(progress: Progress): Reward[] {
  const ids = [
    STARTER_ITEM_ID,
    ...(progress.earnedRewards ?? []),
    ...(progress.ownedItems ?? []),
  ];
  return [...new Set(ids)].flatMap((id) => getYardItem(id) ?? []);
}

function ownsYardItem(progress: Progress, id: string): boolean {
  return ownedYardItems(progress).some((item) => item.id === id);
}

// 저장된 칸 배치. 한 번도 저장하지 않았으면 기본 물건이 0번 칸에 있는 것으로 본다(D14).
function storedPlaced(progress: Progress): Record<string, string> {
  return progress.placed ?? { '0': STARTER_ITEM_ID };
}

/**
 * 칸마다 놓인 물건(길이 6). 모르는 물건, 가지지 않은 물건, 앞 칸에 이미 놓인 물건은 빈칸으로 본다
 * (저장에서는 지우지 않는다, D30과 같은 방식).
 */
export function placedItems(progress: Progress): (Reward | undefined)[] {
  const stored = storedPlaced(progress);
  const seen = new Set<string>();
  return Array.from({ length: YARD_CELLS }, (_, cell) => {
    const id = stored[String(cell)];
    if (id === undefined || seen.has(id) || !ownsYardItem(progress, id)) {
      return undefined;
    }
    seen.add(id);
    return getYardItem(id);
  });
}

/** 상점에서 사기 결과(openHint처럼 이유를 돌려준다, F8). */
export type BuyResult =
  | { ok: true; progress: Progress }
  | { ok: false; reason: 'unknown' | 'owned' | 'insufficientGold' };

/** 상점 물건을 산다: 골드를 빼고 ownedItems에 넣는다. 이미 가졌거나 골드가 모자라면 이유만 돌려준다. */
export function buyItem({
  progress,
  itemId,
}: {
  progress: Progress;
  itemId: string;
}): BuyResult {
  if (!SHOP_ITEM_IDS.includes(itemId)) return { ok: false, reason: 'unknown' };
  if (ownsYardItem(progress, itemId)) return { ok: false, reason: 'owned' };
  if (progress.gold < SHOP_PRICE) {
    return { ok: false, reason: 'insufficientGold' };
  }
  return {
    ok: true,
    progress: {
      ...progress,
      gold: progress.gold - SHOP_PRICE,
      ownedItems: [...(progress.ownedItems ?? []), itemId],
    },
  };
}

/**
 * 물건을 칸에 놓는다. 그 물건이 다른 칸에 있었으면 옮긴다(저장된 모든 칸에서 뺀다, F12).
 * 그 칸에 있던 물건은 내 물건으로 돌아간다. 가지지 않은 물건이거나 이미 그 자리면 같은 진행 객체.
 */
export function placeItem({
  progress,
  itemId,
  cell,
}: {
  progress: Progress;
  itemId: string;
  cell: number;
}): Progress {
  if (
    !Number.isInteger(cell) ||
    cell < 0 ||
    cell >= YARD_CELLS ||
    !ownsYardItem(progress, itemId)
  ) {
    return progress;
  }
  if (placedItems(progress)[cell]?.id === itemId) return progress;
  // 처음 저장하면 기본 물건 자리를 함께 적어 둔다(F4).
  const placed = Object.fromEntries(
    Object.entries(storedPlaced(progress)).filter(([, id]) => id !== itemId),
  );
  placed[String(cell)] = itemId;
  return { ...progress, placed };
}

/** 칸을 비운다. 다 비워도 빈 배치를 남겨 기본 물건이 돌아오지 않게 한다(F4). 이미 비었으면 같은 객체. */
export function unplaceItem({
  progress,
  cell,
}: {
  progress: Progress;
  cell: number;
}): Progress {
  const stored = storedPlaced(progress);
  const id = stored[String(cell)];
  if (id === undefined) return progress;
  // 같은 물건이 저장된 다른 칸(깨진 값)도 함께 뺀다(placeItem과 같은 규칙, F12).
  const placed = Object.fromEntries(
    Object.entries(stored).filter(([, other]) => other !== id),
  );
  return { ...progress, placed };
}

/** 아직 보여 주지 않은 놀이터 물건 보상(첫 화면 점·처음 탭, 설계 D38). 산 물건은 산 순간 본 것이다. */
export function unseenYardItems(progress: Progress): string[] {
  const seen = new Set(progress.seenRewards ?? []);
  return (progress.earnedRewards ?? []).filter(
    (id) => getYardItem(id) !== undefined && !seen.has(id),
  );
}
