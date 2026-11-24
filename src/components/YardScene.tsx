// 놀이터 마당(설계 D18, D33): 하늘 띠 + 풀밭 위 3열 × 2줄 칸, 칸마다 놓인 물건, 서 있는 동물 네 마리.
// 동물은 좋아하는 물건 옆에(여러 개면 칸 번호가 가장 작은 곳, D39), 없으면 아래쪽에 선다.
// 움직임은 다음 PR(D34)이 이 부품에 얹는다. 동물은 누를 수 없다(장식).
// 놓기 모드(D17): 위에 "어느 칸에 놓을까요?" + 취소, 빈 칸은 "+", 찬 칸은 "바꾸기".
import type { CSSProperties, ReactElement } from 'react';
import { PEST_ANIMALS } from '../lib/pestAnimals.ts';
import { YARD_CELLS } from '../lib/progress.ts';
import { likedBy, type Reward } from '../lib/rewards.ts';
import type { PetId } from '../types/settings.ts';
import { PetPortrait } from './PetPortrait.tsx';
import { RewardArt } from './RewardArt.tsx';
import styles from './YardScene.module.css';

type YardSceneProps = {
  /** 칸마다 놓인 물건(길이 6, 빈칸은 undefined). */
  items: readonly (Reward | undefined)[];
  /** 고른 방해꾼(맨 앞에 선다). */
  pet: PetId;
  /** 동물마다 쓰고 있는 모자. */
  hatOf: (pet: PetId) => Reward | undefined;
  /** 놓는 중인 물건(놓기 모드), 아니면 undefined. */
  placing: Reward | undefined;
  onCell: (cell: number) => void;
  onCancelPlacing: () => void;
};

/** 동물이 서는 자리: 좋아하는 물건이 놓인 가장 앞 번호 칸, 없으면 아래쪽 줄의 차례 자리. */
function standingCell(
  items: readonly (Reward | undefined)[],
  pet: PetId,
): number | undefined {
  const cell = items.findIndex((item) => item && likedBy(item) === pet);
  return cell >= 0 ? cell : undefined;
}

export function YardScene({
  items,
  pet,
  hatOf,
  placing,
  onCell,
  onCancelPlacing,
}: YardSceneProps): ReactElement {
  // 고른 방해꾼이 맨 앞(마지막에 그림).
  const animals = [...PEST_ANIMALS].sort((a, b) =>
    a.id === pet ? 1 : b.id === pet ? -1 : 0,
  );
  return (
    <section
      className={styles.yard}
      aria-label="놀이터 마당"
      data-placing={placing !== undefined}
    >
      <span className={styles.cloud} aria-hidden="true" />
      {placing && (
        <div className={styles.banner} role="status">
          어느 칸에 놓을까요?
          <button
            type="button"
            className={styles.cancel}
            onClick={onCancelPlacing}
          >
            취소
          </button>
        </div>
      )}
      <div className={styles.animals} aria-hidden="true">
        {animals.map((animal, order) => {
          const cell = standingCell(items, animal.id);
          const style = (
            cell === undefined
              ? { '--col': order, '--row': 2 }
              : { '--col': cell % 3, '--row': Math.floor(cell / 3) }
          ) as CSSProperties;
          return (
            <span
              key={animal.id}
              className={styles.animal}
              data-by-item={cell !== undefined}
              data-front={animal.id === pet}
              style={style}
            >
              <PetPortrait
                animal={animal.id}
                hat={hatOf(animal.id)}
                mood={animal.id === pet ? 'smug' : 'idle'}
                size={animal.id === pet ? 60 : 50}
              />
            </span>
          );
        })}
      </div>
      <ol className={styles.cells}>
        {Array.from({ length: YARD_CELLS }, (_, cell) => {
          const item = items[cell];
          const label = item
            ? `칸 ${cell + 1}, ${item.name}`
            : `칸 ${cell + 1}, 비어 있음`;
          return (
            <li key={cell} className={styles.cellItem}>
              <button
                type="button"
                className={styles.cell}
                data-front={cell >= 3}
                data-filled={item !== undefined}
                aria-label={placing ? `${label}, 여기에 놓기` : label}
                onClick={() => onCell(cell)}
              >
                {item && (
                  <span className={styles.art} aria-hidden="true">
                    <RewardArt
                      reward={item}
                      size={item.kind === 'big' ? 64 : 48}
                    />
                  </span>
                )}
                {placing &&
                  (item ? (
                    <span className={styles.swap} aria-hidden="true">
                      바꾸기
                    </span>
                  ) : (
                    <span className={styles.plus} aria-hidden="true">
                      +
                    </span>
                  ))}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
