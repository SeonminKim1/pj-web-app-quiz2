import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialProgress } from '../lib/progress.ts';
import type { Progress } from '../types/progress.ts';
import {
  PROGRESS_KEY,
  createProgressStore,
  isProgress,
  type KeyValueStorage,
} from './progressRepository.ts';

function memoryStorage(
  initial: Record<string, string> = {},
): KeyValueStorage & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const SAVED: Progress = {
  version: 1,
  gold: 55,
  topics: { nonsense: { solved: ['1', '7'], hintsOpened: { '12': 2 } } },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createProgressStore', () => {
  it('저장값이 없으면 처음 상태(30골드)', () => {
    expect(createProgressStore({ storage: memoryStorage() }).load()).toEqual(
      initialProgress(),
    );
  });

  it('저장한 값을 그대로 읽는다', () => {
    const storage = memoryStorage();
    const store = createProgressStore({ storage });
    store.save(SAVED);

    expect(JSON.parse(storage.data[PROGRESS_KEY]!)).toEqual(SAVED);
    expect(createProgressStore({ storage }).load()).toEqual(SAVED);
  });

  it('깨진 값·다른 버전·틀린 모양이면 경고하고 처음 상태', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const text of [
      '{',
      JSON.stringify({ ...SAVED, version: 2 }),
      JSON.stringify({ ...SAVED, gold: -1 }),
      JSON.stringify({ ...SAVED, topics: { nonsense: { solved: [1] } } }),
    ]) {
      const store = createProgressStore({
        storage: memoryStorage({ [PROGRESS_KEY]: text }),
      });
      expect(store.load()).toEqual(initialProgress());
    }
    expect(warn).toHaveBeenCalledTimes(4);
  });

  it('저장소가 없으면(사생활 보호 모드) 메모리에만 두고 계속된다', () => {
    const store = createProgressStore({ storage: null });
    expect(store.load()).toEqual(initialProgress());
    store.save(SAVED);
    expect(store.load()).toEqual(SAVED);
  });

  it('저장이 실패하면(용량 초과 등) 이후에는 메모리에만 둔다', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failing: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
    };
    const store = createProgressStore({ storage: failing });
    store.save(SAVED);
    expect(store.load()).toEqual(SAVED);
  });
});

describe('createProgressStore: 저장소 고르기', () => {
  it('storage: null이면 브라우저 localStorage를 건드리지 않는다', () => {
    localStorage.removeItem(PROGRESS_KEY);
    createProgressStore({ storage: null }).save(SAVED);
    expect(localStorage.getItem(PROGRESS_KEY)).toBeNull();
  });

  it('storage를 주지 않으면 브라우저 localStorage에 저장한다', () => {
    localStorage.removeItem(PROGRESS_KEY);
    createProgressStore().save(SAVED);
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!)).toEqual(SAVED);
    localStorage.removeItem(PROGRESS_KEY);
  });
});

describe('createProgressStore: 더 새로운 버전', () => {
  it('높은 버전으로 저장된 진행은 덮어쓰지 않고 메모리에만 둔다', () => {
    const text = JSON.stringify({ version: 2, gold: 99, topics: {}, extra: 1 });
    const storage = memoryStorage({ [PROGRESS_KEY]: text });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createProgressStore({ storage });

    expect(store.load()).toEqual(initialProgress());
    store.save({ ...initialProgress(), gold: 40 });
    expect(storage.getItem(PROGRESS_KEY)).toBe(text);
    expect(store.load().gold).toBe(40);
    vi.restoreAllMocks();
  });
});

describe('isProgress', () => {
  it('지금 형식만 true', () => {
    expect(isProgress(SAVED)).toBe(true);
    expect(isProgress(initialProgress())).toBe(true);
    expect(isProgress({ ...SAVED, gold: 1.5 })).toBe(false);
    expect(isProgress(null)).toBe(false);
  });

  it('bookmarks는 없어도 되고, 있으면 { topic, id } 문자열 배열이어야 한다', () => {
    expect(
      isProgress({ ...SAVED, bookmarks: [{ topic: 'nonsense', id: '3' }] }),
    ).toBe(true);
    expect(isProgress({ ...SAVED, bookmarks: [] })).toBe(true);
    expect(isProgress({ ...SAVED, bookmarks: ['3'] })).toBe(false);
    expect(
      isProgress({ ...SAVED, bookmarks: [{ topic: 'nonsense', id: 3 }] }),
    ).toBe(false);
    expect(isProgress({ ...SAVED, bookmarks: {} })).toBe(false);
  });
});

// Value: protects=보상 필드가 깨져도 푼 문제와 골드는 남는다(학습 progress-version-bump-wipes, 설계 R2-8); fails_when=새 필드를 isProgress에서 검사해 진행 전체를 버리거나, 나쁜 항목을 그대로 두면; why_new=선택 필드가 새로 생김; seam=none; no_claim=실제 브라우저 저장 용량
describe('보상 필드 정리', () => {
  it('지금 형식(보상 필드 없음)의 진행은 그대로 읽는다', () => {
    const storage = memoryStorage({ [PROGRESS_KEY]: JSON.stringify(SAVED) });
    expect(createProgressStore({ storage }).load()).toEqual(SAVED);
  });

  it('깨진 항목·중복만 버리고(모르는 id는 남김) 푼 문제와 골드는 그대로', () => {
    const storage = memoryStorage({
      [PROGRESS_KEY]: JSON.stringify({
        ...SAVED,
        earnedRewards: ['hat-ribbon-pink', 7, 'hat-nope', 'hat-ribbon-pink'],
        seenRewards: 'oops',
      }),
    });
    expect(createProgressStore({ storage }).load()).toEqual({
      ...SAVED,
      // 더 새 버전이 더한 보상일 수 있어 남긴다(리뷰 지적 progressRepository.ts:67).
      earnedRewards: ['hat-ribbon-pink', 'hat-nope'],
    });
  });

  it('쓰고 있는 모자: 모르는 동물 칸과 문자열이 아닌 값만 버리고, 모르는 모자 id는 남긴다(설계 D30)', () => {
    const storage = memoryStorage({
      [PROGRESS_KEY]: JSON.stringify({
        ...SAVED,
        equipped: {
          cat: 'hat-ribbon-pink',
          dog: 7,
          dragon: 'hat-straw-sky',
          rabbit: 'hat-from-the-future',
        },
      }),
    });
    expect(createProgressStore({ storage }).load()).toEqual({
      ...SAVED,
      equipped: { cat: 'hat-ribbon-pink', rabbit: 'hat-from-the-future' },
    });
  });

  it('쓰고 있는 모자가 객체가 아니면 그 필드만 버린다(푼 문제와 골드는 그대로)', () => {
    const storage = memoryStorage({
      [PROGRESS_KEY]: JSON.stringify({
        ...SAVED,
        equipped: ['hat-ribbon-pink'],
      }),
    });
    expect(createProgressStore({ storage }).load()).toEqual(SAVED);
  });
});
