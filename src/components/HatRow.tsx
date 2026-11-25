// 모자 고르기 줄(설계 D9·D10·D23). 방해꾼 시트가 쓰고, PR ③ 놀이터의 모자 탭도 이 부품을 그대로 쓴다.
// 모든 모자를 보여 주고, 받은 모자는 누르면 바로 씌운다(확인 없음). 받지 않은 모자는 흐리게, 어느 판에서 받는지 알려 준다.
// 보상 기록(설계 D29)은 이 줄을 쓰는 쪽이 ClaimTopics로 한다(모자 시트, 놀이터).
import { useState, type ReactElement } from 'react';
import { useProgress } from '../hooks/useProgress.ts';
import { hatOf } from '../lib/progress.ts';
import { rewardSourceLabel } from '../lib/quizTopics.ts';
import { REWARDS, type Reward } from '../lib/rewards.ts';
import { josa } from '../lib/shareLink.ts';
import type { PetId } from '../types/settings.ts';
import { RewardArt } from './RewardArt.tsx';
import styles from './HatRow.module.css';

const HATS: readonly Reward[] = [...REWARDS.values()].filter(
  (reward) => reward.kind === 'hat',
);

export function HatRow({ animal }: { animal: PetId }): ReactElement {
  const { progress, equipHat } = useProgress();
  const earned = new Set(progress.earnedRewards ?? []);
  const wearing = hatOf({ progress, pet: animal })?.id;
  // 받은 모자를 앞에(표 순서 그대로), 그다음 잠긴 모자. 가진 모자를 찾으려고 스크롤하지 않게.
  const hats = [
    ...HATS.filter((hat) => earned.has(hat.id)),
    ...HATS.filter((hat) => !earned.has(hat.id)),
  ];
  const hasAny = hats.some((hat) => earned.has(hat.id));
  // 잠긴 모자를 누르면 어디서 받는지 한 줄로 알려 준다.
  const [notice, setNotice] = useState('');
  return (
    <div className={styles.row}>
      {!hasAny && (
        <p className={styles.empty}>스테이지를 다 풀면 모자가 생겨요</p>
      )}
      <div className={styles.grid} role="radiogroup" aria-label="모자">
        <button
          type="button"
          role="radio"
          aria-checked={wearing === undefined}
          className={styles.tile}
          onClick={() => {
            setNotice('');
            equipHat(animal, undefined);
          }}
        >
          <span className={styles.none}>없음</span>
        </button>
        {hats.map((hat) => {
          if (earned.has(hat.id)) {
            return (
              <button
                key={hat.id}
                type="button"
                role="radio"
                aria-checked={wearing === hat.id}
                aria-label={hat.name}
                className={styles.tile}
                onClick={() => {
                  setNotice('');
                  equipHat(animal, hat.id);
                }}
              >
                <RewardArt reward={hat} size={40} />
              </button>
            );
          }
          const source = rewardSourceLabel(hat.id) ?? '';
          return (
            <button
              key={hat.id}
              type="button"
              role="radio"
              aria-checked={false}
              aria-disabled="true"
              aria-label={`잠김, ${source}`}
              className={styles.tile}
              data-locked="true"
              onClick={() =>
                setNotice(`${josa(source, '을', '를')} 다 풀면 받아요`)
              }
            >
              <span className={styles.faded} aria-hidden="true">
                <RewardArt reward={hat} size={32} />
              </span>
              <span className={styles.source} aria-hidden="true">
                {source}
              </span>
            </button>
          );
        })}
      </div>
      <p className={styles.notice} role="status">
        {notice}
      </p>
    </div>
  );
}
