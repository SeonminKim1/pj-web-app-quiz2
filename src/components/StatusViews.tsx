import type { ReactElement } from 'react';
import styles from './StatusViews.module.css';

/** 로딩 표시. */
export function LoadingView(): ReactElement {
  return (
    <p role="status" className={styles.status}>
      <span className={styles.dots} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      불러오는 중…
    </p>
  );
}

type ErrorViewProps = {
  message: string;
  actionLabel: string;
  onAction: () => void;
};

/** 에러 문구와 처리 버튼(다시 시도, 새로고침, 목록으로 등). */
export function ErrorView({
  message,
  actionLabel,
  onAction,
}: ErrorViewProps): ReactElement {
  return (
    <div role="alert" className={styles.error}>
      <p className={styles.message}>{message}</p>
      <button type="button" className={styles.action} onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

type GoldBadgeProps = {
  gold: number;
  /** 좁은 머리 줄용: 동전 + 숫자만(이름은 그대로 "보유 골드 N"). */
  compact?: boolean;
};

/** 보유 골드(동전 그림 + 알약). */
export function GoldBadge({
  gold,
  compact = false,
}: GoldBadgeProps): ReactElement {
  return (
    <span className={styles.gold} aria-label={`보유 골드 ${gold}`}>
      <span className={styles.coin} aria-hidden="true" />
      {compact ? gold : `골드 ${gold}`}
    </span>
  );
}
