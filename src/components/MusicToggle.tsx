// 배경음악 켜고 끄기(첫 화면, 효과음 버튼 아래). 기본은 꺼짐.
import type { ReactElement } from 'react';
import { useSettings } from '../hooks/useSettings.ts';
import styles from './SoundToggle.module.css';

export function MusicToggle(): ReactElement {
  const { settings, setMusic } = useSettings();
  const on = settings.music ?? false;
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={on}
      aria-label="배경음악"
      onClick={() => setMusic(!on)}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M9 18V6l10-2v12" />
        <circle cx="6.5" cy="18" r="2.5" fill="currentColor" />
        <circle cx="16.5" cy="16" r="2.5" fill="currentColor" />
        {!on && <path d="M3 3l18 18" />}
      </svg>
      {on ? '음악 켬' : '음악 끔'}
    </button>
  );
}
