// 간식 먹는 연출(그림 위에 겹침): 간식이 위에서 입으로 떨어지고, 하트 세 개가 떠오른다. 한 번만.
import type { ReactElement } from 'react';
import type { PetId } from '../types/settings.ts';
import styles from './FeedEffect.module.css';
import { TreatIcon } from './TreatIcon.tsx';

export function FeedEffect({ animal }: { animal: PetId }): ReactElement {
  return (
    <span className={styles.effect} aria-hidden="true">
      <span className={styles.treat}>
        <TreatIcon animal={animal} size={26} />
      </span>
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          className={styles.heart}
          data-i={i}
          viewBox="0 0 24 24"
          width="16"
          height="16"
        >
          <path
            d="M12 21 C5 15 2 12 2 8 a5 5 0 0 1 10 -1 a5 5 0 0 1 10 1 c0 4 -3 7 -10 13 z"
            fill="#ff6f9c"
            stroke="#6b4f4a"
            strokeWidth="1.8"
          />
        </svg>
      ))}
    </span>
  );
}
