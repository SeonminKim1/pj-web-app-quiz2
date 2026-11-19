// ⚙ 설정: 모든 화면 머리 줄에서 열고, 효과음·진동과 배경음악을 켜고 끈다(예전에는 첫 화면에만 있었음).
import { useRef, useState, type ReactElement } from 'react';
import { useModalSheet } from '../hooks/useModalSheet.ts';
import { MusicToggle } from './MusicToggle.tsx';
import { SoundToggle } from './SoundToggle.tsx';
import styles from './SettingsButton.module.css';

/** ⚙ 버튼 + 누르면 아래에서 올라오는 설정 시트. 닫으면 포커스를 버튼으로 돌려준다. */
export function SettingsButton(): ReactElement {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={styles.gear}
        aria-label="설정"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <GearIcon />
      </button>
      {open && (
        <SettingsSheet
          onClose={() => {
            setOpen(false);
            buttonRef.current?.focus();
          }}
        />
      )}
    </>
  );
}

function SettingsSheet({ onClose }: { onClose: () => void }): ReactElement {
  const sheetRef = useModalSheet(onClose);
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={sheetRef}
        tabIndex={-1}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="settings-title" className={styles.title}>
          설정
        </h2>
        <ul className={styles.rows}>
          <li className={styles.row}>
            <span className={styles.rowLabel}>효과음·진동</span>
            <SoundToggle />
          </li>
          <li className={styles.row}>
            <span className={styles.rowLabel}>배경음악</span>
            <MusicToggle />
          </li>
        </ul>
        <button type="button" className={styles.done} onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}

function GearIcon(): ReactElement {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
