// 놀이터 마당(설계 D18, D33): 하늘 띠 + 풀밭 위 3열 × 2줄 칸, 칸마다 놓인 물건, 서 있는 동물 네 마리.
// 동물은 useYardMotion이 움직인다(D34, D40): 좋아하는 물건 옆(여러 개면 칸 번호가 가장 작은 곳, D39)에
// 머물다 돌아다니고 돌아온다. 움직임 줄이기면 그 자리(없으면 아래쪽)에 서 있다. 동물은 누를 수 없다(장식).
// 놓기 모드(D17): 위에 "어느 칸에 놓을까요?" + 취소, 빈 칸은 "+", 찬 칸은 "바꾸기".
import { useEffect, useRef, type ReactElement } from 'react';
import {
  useYardMotion,
  type YardAnimalInput,
  type YardMotion,
} from '../hooks/useYardMotion.ts';
import { PEST_ANIMALS } from '../lib/pestAnimals.ts';
import { figurePose, YARD_PET_SIZE } from '../lib/pestMotion.ts';
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

/** 동물이 머무는 칸: 좋아하는 물건이 놓인 가장 앞 번호 칸, 없으면 undefined(아래쪽 줄의 차례 자리). */
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
  const yardRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLOListElement>(null);
  // 고른 방해꾼은 아래 줄 맨 끝 자리(PR ③과 같은 순서).
  const animals: YardAnimalInput[] = [...PEST_ANIMALS]
    .sort((a, b) => (a.id === pet ? 1 : b.id === pet ? -1 : 0))
    .map((animal, slot) => ({
      id: animal.id,
      slot,
      size: animal.id === pet ? YARD_PET_SIZE.front : YARD_PET_SIZE.other,
      home: standingCell(items, animal.id),
      front: animal.id === pet,
    }));
  const motion = useYardMotion({ yardRef, layerRef, animals });
  return (
    <section
      ref={yardRef}
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
        {animals.map((animal) => (
          <YardAnimal
            key={animal.id}
            animal={animal}
            motion={motion}
            hat={hatOf(animal.id)}
          />
        ))}
      </div>
      <ol ref={layerRef} className={styles.cells}>
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

/** 마당 동물 하나. 위치·겹침 순서·몸 모양은 프레임마다 style로만 바꾼다(리렌더 없음). */
function YardAnimal({
  animal,
  motion,
  hat,
}: {
  animal: YardAnimalInput;
  motion: YardMotion;
  hat: Reward | undefined;
}): ReactElement {
  const outerRef = useRef<HTMLSpanElement>(null);
  const figureRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let flip = 1;
    return motion.subscribe(animal.id, (frame) => {
      const outer = outerRef.current;
      if (outer) {
        outer.style.transform = `translate(${frame.x - frame.size / 2}px, ${frame.y - frame.size - frame.hop}px)`;
        outer.style.zIndex = String(frame.z);
        outer.style.visibility = 'visible';
      }
      const figure = figureRef.current;
      if (figure) {
        const pose = figurePose({ hop: frame.hop, facing: frame.facing, flip });
        flip = pose.flip;
        figure.style.transform = `scale(${pose.sx * flip}, ${pose.sy})`;
      }
    });
  }, [motion, animal.id]);
  return (
    <span
      ref={outerRef}
      className={styles.animal}
      data-by-item={animal.home !== undefined}
      data-front={animal.front}
    >
      <span ref={figureRef} className={styles.figure}>
        <PetPortrait
          animal={animal.id}
          hat={hat}
          mood={animal.front ? 'smug' : 'idle'}
          size={animal.size}
        />
      </span>
    </span>
  );
}
