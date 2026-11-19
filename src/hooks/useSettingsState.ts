// 앱 전체가 공유하는 설정 상태. App.tsx의 SettingsProvider가 Context로 내려 준다.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { setMusicEnabled } from '../lib/music.ts';
import { setSoundEnabled } from '../lib/sound.ts';
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

  const setSound = useCallback<SettingsContextValue['setSound']>(
    (on) => {
      // 켜는 버튼을 누른 그 순간(사용자 동작 안)에 소리 장치를 깨운다.
      setSoundEnabled(on);
      setSettings((current) => {
        if ((current.sound ?? false) === on) return current;
        const next = { ...current, sound: on };
        store.save(next);
        return next;
      });
    },
    [store],
  );

  const setMusic = useCallback<SettingsContextValue['setMusic']>(
    (on) => {
      // 켜는 버튼을 누른 그 순간(사용자 동작 안)에 연주를 시작한다.
      setMusicEnabled(on);
      setSettings((current) => {
        if ((current.music ?? false) === on) return current;
        const next = { ...current, music: on };
        store.save(next);
        return next;
      });
    },
    [store],
  );

  const setLastTopic = useCallback<SettingsContextValue['setLastTopic']>(
    (topicId) => {
      setSettings((current) => {
        if (current.lastTopic === topicId) return current;
        const next = { ...current, lastTopic: topicId };
        store.save(next);
        return next;
      });
    },
    [store],
  );

  // 저장돼 있던 배경음악 설정을 알린다. 소리 장치는 첫 탭에서 깨어난다(main.tsx).
  useEffect(() => {
    setMusicEnabled(settings.music ?? false);
  }, [settings.music]);

  // 저장돼 있던 설정을 효과음 모듈에 알린다(처음 한 번과 바뀔 때).
  useEffect(() => {
    setSoundEnabled(settings.sound ?? false);
  }, [settings.sound]);

  return useMemo(
    () => ({ settings, choosePet, setSound, setMusic, setLastTopic }),
    [settings, choosePet, setSound, setMusic, setLastTopic],
  );
}
