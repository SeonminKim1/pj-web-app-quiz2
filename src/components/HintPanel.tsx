import type { ReactElement } from 'react';
import { HINT_PRICE } from '../lib/progress.ts';
import styles from './HintPanel.module.css';

type HintPanelProps = {
  /** 이미 연 힌트 문장. */
  opened: readonly string[];
  /** 다음 힌트(없으면 버튼을 숨김). */
  next: { paid: boolean } | undefined;
  canOpen: boolean;
  /** 유료 힌트인데 골드가 모자람("골드 부족"). */
  goldShort: boolean;
  onOpen: () => void;
};

/**
 * 힌트(docs/ui-play-layout/spec.md "문제 카드와 힌트"): 문제 카드 바로 아래 오른쪽 버튼
 * ("💡 힌트 무료" / "💡 힌트 5골드" / "💡 골드 부족")과 그 아래 연 힌트 목록.
 */
export function HintPanel({
  opened,
  next,
  canOpen,
  goldShort,
  onOpen,
}: HintPanelProps): ReactElement {
  return (
    <section aria-label="힌트" className={styles.panel}>
      {next && (
        <button
          type="button"
          className={styles.button}
          disabled={!canOpen}
          onClick={onOpen}
        >
          <span aria-hidden="true">💡</span>{' '}
          {!next.paid
            ? '힌트 무료'
            : goldShort
              ? '골드 부족'
              : `힌트 ${HINT_PRICE}골드`}
        </button>
      )}
      {opened.length > 0 && (
        <ol className={styles.list}>
          {opened.map((text, index) => (
            <li key={index}>{text}</li>
          ))}
        </ol>
      )}
    </section>
  );
}
