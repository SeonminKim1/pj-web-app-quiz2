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
 * (전구 아이콘 + "힌트 무료" / "힌트 5골드" / "골드 부족")과 그 아래 연 힌트 목록.
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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M9 18h6M10 21h4" />
            <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
          </svg>
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
