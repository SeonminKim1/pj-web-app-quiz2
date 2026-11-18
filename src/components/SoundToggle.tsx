// 효과음·진동 켜고 끄기(첫 화면). 기본은 꺼짐.
import type { ReactElement } from 'react';
import { useSettings } from '../hooks/useSettings.ts';
import styles from './SoundToggle.module.css';

export function SoundToggle(): ReactElement {
  const { settings, setSound } = useSettings();
  const on = settings.sound ?? false;
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={on}
      aria-label="효과음·진동"
      onClick={() => setSound(!on)}
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
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        {on ? (
          <>
            <path d="M16.5 8.5a5 5 0 0 1 0 7" />
            <path d="M19 6a8.5 8.5 0 0 1 0 12" />
          </>
        ) : (
          <path d="M17 9l5 6M22 9l-5 6" />
        )}
      </svg>
      {on ? '소리 켬' : '소리 끔'}
    </button>
  );
}
