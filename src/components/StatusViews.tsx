import { useEffect, useRef, useState, type ReactElement } from 'react';
import styles from './StatusViews.module.css';
import { prefersReducedMotion } from '../lib/reducedMotion.ts';

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
/** 골드가 늘면 동전이 도착할 즈음(0.45초 뒤)부터 숫자를 하나씩 올린다. 줄면 바로. */
function useCountUp(value: number): number {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  useEffect(() => {
    const from = shownRef.current;
    const reduce = prefersReducedMotion();
    if (value <= from || reduce) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now() + 450;
    const duration = 500;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const next = Math.round(from + (value - from) * t);
      shownRef.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      shownRef.current = value;
    };
  }, [value]);
  return shown;
}

export function GoldBadge({
  gold,
  compact = false,
}: GoldBadgeProps): ReactElement {
  const shown = useCountUp(gold);
  return (
    <span
      className={styles.gold}
      aria-label={`보유 골드 ${gold}`}
      data-gold-badge=""
      data-rising={shown !== gold || undefined}
    >
      <span className={styles.coin} aria-hidden="true" />
      <span aria-hidden="true">{compact ? shown : `골드 ${shown}`}</span>
    </span>
  );
}
