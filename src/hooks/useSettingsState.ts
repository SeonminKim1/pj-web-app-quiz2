// 앱 전체가 공유하는 설정 상태. App.tsx의 SettingsProvider가 Context로 내려 준다.
import { useCallback, useMemo, useState } from 'react';
import {
  createSettingsStore,
  type SettingsStore,
} from '../data/settingsRepository.ts';
import type { Settings } from '../types/settings.ts';
import type { SettingsContextValue } from './settingsContext.ts';

/** 설정 상태와 바꾸는 동작. 바뀔 때마다 바로 저장한다. store가 없으면 브라우저 저장소. */
export function useSettingsState(
  givenStore?: SettingsStore,
): SettingsContextValue {
  const store = useMemo(
    () => givenStore ?? createSettingsStore(),
    [givenStore],
  );
  const [settings, setSettings] = useState<Settings>(() => store.load());

  const choosePet = useCallback<SettingsContextValue['choosePet']>(
    (pet) => {
      setSettings((current) => {
        if (current.pet === pet) return current;
        const next = { ...current, pet };
        store.save(next);
        return next;
      });
    },
    [store],
  );

  return useMemo(() => ({ settings, choosePet }), [settings, choosePet]);
}
