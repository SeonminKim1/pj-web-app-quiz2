// "새 칭호!" 알림(풀이 화면 위쪽). 읽어 주기도 한다.
import type { ReactElement } from 'react';
import styles from './TitleToast.module.css';

export function TitleToast({
  name,
}: {
  name: string | undefined;
}): ReactElement {
  return (
    <div className={styles.slot} role="status" aria-live="polite">
      {name && (
        <div className={styles.toast}>
          <span className={styles.label}>새 칭호!</span>
          <span className={styles.name}>{name}</span>
        </div>
      )}
    </div>
  );
}
