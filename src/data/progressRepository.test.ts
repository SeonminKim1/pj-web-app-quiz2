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
