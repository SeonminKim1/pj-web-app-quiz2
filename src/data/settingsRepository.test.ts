import { afterEach, describe, expect, it, vi } from 'vitest';
import type { KeyValueStorage } from './localStore.ts';
import {
  SETTINGS_KEY,
  createSettingsStore,
  isSettings,
} from './settingsRepository.ts';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  const storage: KeyValueStorage = {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
  return { data, storage };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createSettingsStore', () => {
  it('저장값이 없으면 토끼, 고른 동물을 저장하고 다시 읽는다', () => {
    const { data, storage } = memoryStorage();
    const store = createSettingsStore({ storage });
    expect(store.load()).toEqual({ version: 1, pet: 'rabbit' });
    store.save({ version: 1, pet: 'dog' });
    expect(JSON.parse(data[SETTINGS_KEY]!)).toEqual({ version: 1, pet: 'dog' });
    expect(createSettingsStore({ storage }).load().pet).toBe('dog');
  });

  it('깨진 값·모르는 동물·다른 버전이면 경고하고 토끼', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const text of [
      '{not json',
      JSON.stringify({ version: 1, pet: 'dragon' }),
      JSON.stringify({ version: 0, pet: 'dog' }),
    ]) {
      const { storage } = memoryStorage({ [SETTINGS_KEY]: text });
      expect(createSettingsStore({ storage }).load().pet).toBe('rabbit');
    }
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it('저장소가 없으면(사생활 보호 모드) 메모리에만 두고 계속된다', () => {
    const store = createSettingsStore({ storage: null });
    store.save({ version: 1, pet: 'cat' });
    expect(store.load().pet).toBe('cat');
  });
});

describe('isSettings', () => {
  it('지금 형식만 true', () => {
    expect(isSettings({ version: 1, pet: 'squirrel' })).toBe(true);
    expect(isSettings({ version: 1 })).toBe(false);
    expect(isSettings(null)).toBe(false);
  });
});
