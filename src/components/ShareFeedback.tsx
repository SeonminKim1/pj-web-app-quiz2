// 공유 뒤 알림(토스트)과, 공유도 복사도 막혔을 때 직접 복사 칸. 문제 하나 화면과 스테이지 화면이 같이 쓴다.
import type { ReactElement } from 'react';
import styles from './ShareFeedback.module.css';

export function ShareToast({
  text,
}: {
  text: string | undefined;
}): ReactElement {
  return (
    <p className={styles.toast} aria-live="polite">
      {text}
    </p>
  );
}

export function ManualCopy({
  text,
  onClose,
}: {
  text: string;
  onClose: () => void;
}): ReactElement {
  return (
    <div className={styles.manual}>
      <p>길게 눌러 복사하세요</p>
      <textarea
        id="manual-copy"
        readOnly
        value={text}
        rows={3}
        onFocus={(event) => event.currentTarget.select()}
        autoFocus
      />
      <button
        type="button"
        className={styles.close}
        aria-label="닫기"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );
}
