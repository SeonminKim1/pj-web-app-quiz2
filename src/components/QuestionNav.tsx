import type { ReactElement } from 'react';
import styles from './QuestionNav.module.css';

/** › 버튼이 하는 일: 다음 문제, 결과 보기(넌센스 마지막), 막힘(MBTI 마지막). */
type QuestionNavNext = 'next' | 'result' | 'disabled';

type QuestionNavProps = {
  /** 가운데 진행 표시의 판 이름(예: "스테이지 1", "연애"). */
  label: string;
  /** 지금 문제 자리(1부터)와 판의 문제 수. */
  current: number;
  total: number;
  canPrev: boolean;
  next: QuestionNavNext;
  onPrev: () => void;
  onNext: () => void;
};

/** 머리 줄 "‹ 진행 ›". 화살표는 이름으로 읽힌다. */
export function QuestionNav({
  label,
  current,
  total,
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
      {/* 보이는 것은 3 / 10(판 이름은 머리 줄 제목). 읽는 이름은 판 이름까지 한 줄로. */}
      <span className={styles.label}>
        <span
          className={styles.srOnly}
        >{`${label} · ${current} / ${total}`}</span>
        <span aria-hidden="true">
          {current} / {total}
        </span>
      </span>
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
