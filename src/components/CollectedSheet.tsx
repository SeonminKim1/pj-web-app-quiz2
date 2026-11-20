// "그동안 모은 스티커" 시트(설계 D8): 결과 카드로 보지 못하고 받은 보상(업데이트 전부터 푼 판 등)을 한 번 보여 준다.
// "확인"을 누르면 본 것으로 기록해 다시 뜨지 않는다.
import type { ReactElement } from 'react';
import { useModalSheet } from '../hooks/useModalSheet.ts';
import { getReward } from '../lib/rewards.ts';
import styles from './CollectedSheet.module.css';
import { RewardArt } from './RewardArt.tsx';

const SHOWN = 12;

export function CollectedSheet({
  rewardIds,
  onClose,
}: {
  rewardIds: readonly string[];
  onClose: () => void;
}): ReactElement {
  const sheetRef = useModalSheet(onClose);
  const rewards = rewardIds.flatMap((id) => getReward(id) ?? []);
  const rest = rewards.length - SHOWN;
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="collected-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="collected-title" className={styles.title}>
          그동안 모은 스티커 {rewards.length}장을 받았어요
        </h2>
        <ul
          className={styles.row}
          aria-label={rewards.map((reward) => reward.name).join(', ')}
        >
          {rewards.slice(0, SHOWN).map((reward) => (
            <li key={reward.id} aria-hidden="true">
              <RewardArt reward={reward} size={44} />
            </li>
          ))}
          {rest > 0 && (
            <li className={styles.more} aria-hidden="true">
              +{rest}
            </li>
          )}
        </ul>
        <p className={styles.note}>
          스테이지를 다 풀 때마다 스티커가 하나씩 생겨요.
        </p>
        <button type="button" className={styles.ok} onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  );
}
