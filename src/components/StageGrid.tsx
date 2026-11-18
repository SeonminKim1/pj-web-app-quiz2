import type { CSSProperties, ReactElement } from 'react';
import styles from './StageGrid.module.css';

/** 스테이지 칸 하나에 보여 줄 값. */
export type StageCell = {
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
  return (
    <ul className={styles.grid}>
      {stages.map((stage) => (
        <li key={stage.no}>
          <button
            type="button"
            className={styles.cell}
            data-completed={stage.completed}
            aria-label={`${stage.no}단계, ${stage.total}문제 중 ${stage.solvedCount}문제 풂${stage.completed ? ', 완료' : ''}`}
            onClick={() => onSelect(stage.no)}
          >
            <span className={styles.no}>{stage.no}</span>
            {stage.completed ? (
              <span className={styles.done}>완료</span>
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
