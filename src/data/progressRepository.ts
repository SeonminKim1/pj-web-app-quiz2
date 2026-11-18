// 진행 저장(localStorage 'quiz-progress'). 저장값이 깨졌거나 저장소를 쓸 수 없어도 플레이는 계속된다
// (spec "골드와 진행 저장"). 사용자에게 에러를 보이지 않고 콘솔에만 경고한다.
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
  return createLocalStore({
    key: PROGRESS_KEY,
    version: PROGRESS_VERSION,
    isValid: isProgress,
    initial: initialProgress,
    label: '진행',
    storage,
  });
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
