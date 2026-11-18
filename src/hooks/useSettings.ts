import { useContext } from 'react';
import {
  SettingsContext,
  type SettingsContextValue,
} from './settingsContext.ts';

/** 설정 Context를 읽는다. SettingsProvider 밖에서 부르면 개발 실수라 바로 알린다. */
export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error('useSettings는 SettingsProvider 안에서만 쓸 수 있어요');
  }
  return value;
}
