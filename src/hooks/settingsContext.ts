// 설정 Context 정의(Provider는 src/App.tsx, 상태는 useSettingsState.ts).
import { createContext } from 'react';
import type { PetId, Settings } from '../types/settings.ts';

/** 설정 Context 값: 현재 설정과 바꾸는 동작. 동작은 바로 저장까지 한다. */
export type SettingsContextValue = {
  settings: Settings;
  /** 방해꾼 동물 고르기. */
  choosePet: (pet: PetId) => void;
  /** 효과음·진동 켜고 끄기. */
  setSound: (on: boolean) => void;
};

export const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined,
);
