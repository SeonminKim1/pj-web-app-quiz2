import type { ReactElement } from 'react';
import styles from './StageResult.module.css';

type StageResultProps = {
  /** 이번에 맞힌 수 / 이번에 나온 문제 수. */
  correctCount: number;
  played: number;
  goldEarned: number;
  /** 스테이지 전체 진행(저장된 진행 기준). */
  solvedCount: number;
  total: number;
  completed: boolean;
  hasNext: boolean;
  onList: () => void;
  onNext: () => void;
};

/** 스테이지 결과. */
export function StageResult({
  correctCount,
  played,
  goldEarned,
  solvedCount,
  total,
  completed,
  hasNext,
  onList,
  onNext,
}: StageResultProps): ReactElement {
  return (
    <section
      aria-label="스테이지 결과"
      className={styles.result}
      data-completed={completed}
    >
      <h2>{completed ? '스테이지 완료!' : '스테이지 결과'}</h2>
      <div className={styles.body}>
        <p>
          이번에 <strong>{played}</strong>문제 중{' '}
          <strong>{correctCount}</strong>문제를 맞혔어요.
        </p>
        <p>
          얻은 골드 <strong>{goldEarned}</strong>
        </p>
        <p>
          스테이지 진행{' '}
          <strong>
            {solvedCount}/{total}
          </strong>
          {completed ? null : (
            <span className={styles.note}>
              {' '}
              (넘긴 문제는 다시 들어와서 풀 수 있어요)
            </span>
          )}
        </p>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.list} onClick={onList}>
          목록으로
        </button>
        {hasNext && (
          <button type="button" className={styles.next} onClick={onNext}>
            다음 스테이지
          </button>
        )}
      </div>
    </section>
  );
}
