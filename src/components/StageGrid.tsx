import type { CSSProperties, ReactElement } from 'react';
import styles from './StageGrid.module.css';

/** 스테이지 칸 하나에 보여 줄 값. */
type StageCell = {
  no: number;
  solvedCount: number;
  total: number;
  completed: boolean;
};

type StageGridProps = {
  stages: readonly StageCell[];
  onSelect: (no: number) => void;
};

/** 스테이지 목록 격자. 모든 스테이지를 언제든 고를 수 있다(잠금 없음). */
export function StageGrid({ stages, onSelect }: StageGridProps): ReactElement {
  // 다 풀지 않은 첫 스테이지 = 지금 할 차례("여기부터").
  const current = stages.find((stage) => !stage.completed)?.no;
  return (
    <ul className={styles.grid}>
      {stages.map((stage) => (
        <li key={stage.no}>
          <button
            type="button"
            className={styles.cell}
            data-completed={stage.completed}
            data-current={stage.no === current}
            aria-current={stage.no === current ? 'step' : undefined}
            aria-label={`스테이지 ${stage.no}, ${stage.total}문제 중 ${stage.solvedCount}문제 풂${stage.completed ? ', 완료' : ''}${stage.no === current ? ', 지금 차례' : ''}`}
            onClick={() => onSelect(stage.no)}
          >
            {stage.no === current && (
              <span className={styles.here} aria-hidden="true">
                여기부터
              </span>
            )}
            <span className={styles.no}>{stage.no}</span>
            {stage.completed ? (
              <span className={styles.done}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12.5l4.5 4.5L19 7" />
                </svg>
                완료
              </span>
            ) : (
              <>
                <span className={styles.count}>
                  {stage.solvedCount}/{stage.total}
                </span>
                <span
                  className={styles.bar}
                  aria-hidden="true"
                  style={
                    {
                      '--progress': `${(stage.solvedCount / Math.max(1, stage.total)) * 100}%`,
                    } as CSSProperties
                  }
                />
              </>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
