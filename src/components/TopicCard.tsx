import type { ReactElement } from 'react';
import styles from './TopicCard.module.css';

type TopicCardProps = {
  label: string;
  /** 진행 문구(예: "546문제 중 12문제 풂"). */
  detail: string;
  enterable: boolean;
  onSelect: () => void;
};

/** 첫 화면의 주제 카드. 들어갈 수 없는 주제는 "준비 중"으로 보이고 눌리지 않는다. */
export function TopicCard({
  label,
  detail,
  enterable,
  onSelect,
}: TopicCardProps): ReactElement {
  return (
    <button
      type="button"
      className={styles.card}
      aria-disabled={!enterable}
      onClick={enterable ? onSelect : undefined}
    >
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        <span className={styles.detail}>{enterable ? detail : '준비 중'}</span>
      </span>
      {enterable && (
        <span className={styles.arrow} aria-hidden="true">
          ›
        </span>
      )}
    </button>
  );
}
