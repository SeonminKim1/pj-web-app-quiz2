import { useEffect, useState, type ReactElement } from 'react';
import type { Reward } from '../lib/rewards.ts';
import { RewardArt } from './RewardArt.tsx';
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
  /** 이번에 새로 받은 보상(설계 D6). */
  newReward?: Reward | undefined;
  /** 이번에 새로 오른 칭호. */
  newTitle?: string | undefined;
  /** 보상이 붙은 스티커첩 칸 이름("3번", "연애"). */
  stickerSpot?: string;
  onList: () => void;
  onNext: () => void;
};

const KIND_LABEL: Record<Reward['kind'], string> = {
  hat: '모자',
  item: '놀이터 물건',
  big: '놀이터 큰 물건',
};

/** 스테이지 결과. 새 보상이 있으면 제목 바로 아래에 보상 카드를 먼저 보인다(설계 D6·D7). */
export function StageResult({
  correctCount,
  played,
  goldEarned,
  solvedCount,
  total,
  completed,
  hasNext,
  newReward,
  newTitle,
  stickerSpot = '',
  onList,
  onNext,
}: StageResultProps): ReactElement {
  // 읽어 주기 칸은 비운 채 먼저 그리고 다음 차례에 글을 넣는다. 처음부터 글이 든 상태 칸은 화면 읽기 프로그램이 읽지 않는다.
  const [announce, setAnnounce] = useState('');
  useEffect(() => {
    if (newReward) setAnnounce(`새 보상 ${newReward.name}`);
  }, [newReward]);
  return (
    <section
      aria-label="스테이지 결과"
      className={styles.result}
      data-completed={completed}
    >
      <h2>{completed ? '스테이지 완료!' : '스테이지 결과'}</h2>
      <p className={styles.srOnly} role="status">
        {announce}
      </p>
      {newReward && (
        <div className={styles.reward}>
          <span className={styles.rewardLabel}>새 보상!</span>
          <span
            className={styles.rewardArt}
            data-big={newReward.kind === 'big'}
            aria-hidden="true"
          >
            {newReward.kind === 'big' && (
              <span className={styles.sparkles}>
                <span />
                <span />
                <span />
                <span />
              </span>
            )}
            <RewardArt reward={newReward} size={104} />
          </span>
          <span className={styles.rewardName}>{newReward.name}</span>
          <span className={styles.rewardKind}>
            {KIND_LABEL[newReward.kind]}
          </span>
          <span className={styles.rewardNote}>
            스티커첩 {stickerSpot} 칸에 붙었어요
          </span>
        </div>
      )}
      {newTitle && (
        <p className={styles.title}>
          새 칭호: <strong>{newTitle}</strong>
        </p>
      )}
      <div className={styles.body} data-compact={newReward !== undefined}>
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
