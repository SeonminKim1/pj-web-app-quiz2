// 설정 저장(localStorage 'quiz-settings').
// 진행 저장과 같은 규칙: 깨진 값·저장 실패·사생활 보호 모드면 처음 값·메모리로 계속.
import { isPetId } from '../lib/pestAnimals.ts';
import { isRecord } from '../lib/records.ts';
import { SETTINGS_VERSION, initialSettings } from '../lib/settings.ts';
import type { Settings } from '../types/settings.ts';
import {
  createLocalStore,
  type KeyValueStorage,
  type LocalStore,
} from './localStore.ts';

export const SETTINGS_KEY = 'quiz-settings';

/** 설정 읽기·쓰기. */
export type SettingsStore = LocalStore<Settings>;

/** 설정 저장소를 만든다(storage 규칙은 createProgressStore와 같다). */
export function createSettingsStore({
  storage,
}: { storage?: KeyValueStorage | null } = {}): SettingsStore {
  return createLocalStore({
    key: SETTINGS_KEY,
    version: SETTINGS_VERSION,
    isValid: isSettings,
    initial: initialSettings,
    label: '설정',
    storage,
  });
}

/** 저장값이 지금 형식(version 1)의 설정인지 확인한다. */
export function isSettings(value: unknown): value is Settings {
  return (
    isRecord(value) &&
    value.version === SETTINGS_VERSION &&
    isPetId(value.pet) &&
    (value.sound === undefined || typeof value.sound === 'boolean')
  );
}
