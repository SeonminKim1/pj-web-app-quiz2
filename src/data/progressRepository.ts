// 진행 저장(localStorage 'quiz-progress'). 저장값이 깨졌거나 저장소를 쓸 수 없어도 플레이는 계속된다
// (spec "골드와 진행 저장"). 사용자에게 에러를 보이지 않고 콘솔에만 경고한다.
import { isPetId } from '../lib/pestAnimals.ts';
import { PROGRESS_VERSION, initialProgress } from '../lib/progress.ts';
import { isRecord } from '../lib/records.ts';
import {
  createLocalStore,
  type KeyValueStorage,
  type LocalStore,
} from './localStore.ts';
import type { Bookmark, Progress, TopicProgress } from '../types/progress.ts';

export const PROGRESS_KEY = 'quiz-progress';

export type { KeyValueStorage };

/** 진행 읽기·쓰기. */
export type ProgressStore = LocalStore<Progress>;

/**
 * 진행 저장소를 만든다. storage를 주지 않으면 브라우저 localStorage(쓸 수 없으면 메모리),
 * null이면 처음부터 메모리에만 둔다(테스트, 사생활 보호 모드).
 */
export function createProgressStore({
  storage,
}: { storage?: KeyValueStorage | null } = {}): ProgressStore {
  const store = createLocalStore({
    key: PROGRESS_KEY,
    version: PROGRESS_VERSION,
    isValid: isProgress,
    initial: initialProgress,
    label: '진행',
    storage,
  });
  return { load: () => sanitizeProgress(store.load()), save: store.save };
}

/**
 * 보상 선택 필드(earnedRewards, seenRewards, equipped)를 고친다: 문자열이 아니거나 중복인 항목,
 * 모르는 동물 칸만 버린다.
 * 모르는 id(더 새 버전이 더한 보상)는 남긴다: 오래된 탭이 저장하면서 지우면 "받은 보상은 빼앗지 않는다"가 깨진다.
 * 화면은 아는 id(getReward)만 그린다.
 * 이 필드가 깨져도 푼 문제와 골드는 그대로 둔다(isProgress는 이 필드를 보지 않는다). 고칠 것이 없으면 같은 객체.
 */
function sanitizeProgress(progress: Progress): Progress {
  const earnedRewards = cleanRewardIds(progress.earnedRewards);
  const seenRewards = cleanRewardIds(progress.seenRewards);
  const equipped = cleanEquipped(progress.equipped);
  const ownedItems = cleanRewardIds(progress.ownedItems);
  const placed = cleanPlaced(progress.placed);
  if (
    earnedRewards === progress.earnedRewards &&
    seenRewards === progress.seenRewards &&
    equipped === progress.equipped &&
    ownedItems === progress.ownedItems &&
    placed === progress.placed
  ) {
    return progress;
  }
  const next: Progress = { ...progress };
  delete next.earnedRewards;
  delete next.seenRewards;
  delete next.equipped;
  delete next.ownedItems;
  delete next.placed;
  if (ownedItems) next.ownedItems = ownedItems;
  if (placed) next.placed = placed;
  if (earnedRewards) next.earnedRewards = earnedRewards;
  if (seenRewards) next.seenRewards = seenRewards;
  if (equipped) next.equipped = equipped;
  return next;
}

// 놀이터 칸: "0"~"5" 칸의 문자열 값만 남긴다. 빈 객체(다 치움)는 그대로 둔다(설계 F4, F12).
function cleanPlaced(value: unknown): Progress['placed'] {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value);
  const kept = entries.filter(
    (entry): entry is [string, string] =>
      /^[0-5]$/.test(entry[0]) && typeof entry[1] === 'string',
  );
  if (kept.length === entries.length) return value as Progress['placed'];
  return Object.fromEntries(kept);
}

// 쓰고 있는 모자: 아는 동물 칸의 문자열 값만 남긴다. 모르는 모자 id는 남긴다(그릴 때 hatOf가 거른다).
function cleanEquipped(value: unknown): Progress['equipped'] {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value);
  const kept = entries.filter(
    ([pet, hat]) => isPetId(pet) && typeof hat === 'string',
  );
  if (kept.length === entries.length) return value as Progress['equipped'];
  return kept.length > 0 ? Object.fromEntries(kept) : undefined;
}

// 깨끗하면 그대로, 아니면 알맞은 항목만 남긴 새 배열(남은 게 없으면 undefined).
function cleanRewardIds(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  const kept = [
    ...new Set(value.filter((id): id is string => typeof id === 'string')),
  ];
  if (kept.length === value.length) return value as string[];
  return kept.length > 0 ? kept : undefined;
}

/** 저장값이 지금 형식(version 1)의 진행인지 확인한다. bookmarks는 선택 필드. */
export function isProgress(value: unknown): value is Progress {
  if (!isRecord(value) || value.version !== PROGRESS_VERSION) return false;
  if (!Number.isInteger(value.gold) || (value.gold as number) < 0) return false;
  if (
    value.bookmarks !== undefined &&
    !(Array.isArray(value.bookmarks) && value.bookmarks.every(isBookmark))
  ) {
    return false;
  }
  return (
    isRecord(value.topics) && Object.values(value.topics).every(isTopicProgress)
  );
}

function isBookmark(value: unknown): value is Bookmark {
  return (
    isRecord(value) &&
    typeof value.topic === 'string' &&
    typeof value.id === 'string'
  );
}

function isTopicProgress(value: unknown): value is TopicProgress {
  return (
    isRecord(value) &&
    Array.isArray(value.solved) &&
    value.solved.every((id) => typeof id === 'string') &&
    isRecord(value.hintsOpened) &&
    Object.values(value.hintsOpened).every(
      (count) => Number.isInteger(count) && (count as number) >= 0,
    )
  );
}
