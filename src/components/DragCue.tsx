// "날 잡아서 끌어 봐" 손짓: 손가락이 방해꾼을 꾹 누르고 옆으로 끄는 시늉을 되풀이한다(장식).
import type { ReactElement } from 'react';
import styles from './DragCue.module.css';

export function DragCue(): ReactElement {
  return (
    <span className={styles.cue} aria-hidden="true">
      <span className={styles.trail} />
      <svg className={styles.hand} viewBox="0 0 32 32" width="30" height="30">
        <path
          d="M12 17 V6.5 a2 2 0 0 1 4 0 V14 l1-.2 a2 2 0 0 1 3.6 1 l.6-.1 a2 2 0 0 1 3.4 1.2 l.4 0 a2 2 0 0 1 3 1.8 V22 c0 4.4-3.3 8-8 8 h-1.6 c-2.6 0-4.6-1.4-6-3.4 L6 20.6 a2 2 0 0 1 3-2.6 Z"
          fill="#fff"
          stroke="#3a2e2e"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
