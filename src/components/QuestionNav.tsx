import type { ReactElement } from 'react';
import styles from './QuestionNav.module.css';

/** › 버튼이 하는 일: 다음 문제, 결과 보기(넌센스 마지막), 막힘(MBTI 마지막). */
type QuestionNavNext = 'next' | 'result' | 'disabled';

type QuestionNavProps = {
  /** 가운데 진행 표시(예: "1단계 · 3 / 10"). */
  label: string;
  canPrev: boolean;
  next: QuestionNavNext;
  onPrev: () => void;
  onNext: () => void;
};

/** 머리 줄 "‹ 진행 ›". 화살표는 이름으로 읽힌다. */
export function QuestionNav({
  label,
  canPrev,
  next,
  onPrev,
  onNext,
}: QuestionNavProps): ReactElement {
  return (
    <div role="group" aria-label="문제 이동" className={styles.nav}>
      <button
        type="button"
        className={styles.arrow}
        aria-label="이전 문제"
        disabled={!canPrev}
        onClick={onPrev}
      >
        ‹
      </button>
      <span className={styles.label}>{label}</span>
      <button
        type="button"
        className={styles.arrow}
        aria-label={next === 'result' ? '결과 보기' : '다음 문제'}
        disabled={next === 'disabled'}
        onClick={onNext}
      >
        ›
      </button>
    </div>
  );
}
