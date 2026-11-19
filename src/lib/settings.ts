// 설정 기본값.
import type { Settings } from '../types/settings.ts';

export const SETTINGS_VERSION = 1;

/** 처음 설정: 방해꾼은 토끼. */
export function initialSettings(): Settings {
  return { version: SETTINGS_VERSION, pet: 'rabbit' };
}
