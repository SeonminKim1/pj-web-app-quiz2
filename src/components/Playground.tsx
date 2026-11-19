import type { ReactElement, RefObject } from 'react';
import { TREAT_NAME } from '../lib/pestAnimals.ts';
import type { PetId } from '../types/settings.ts';
import styles from './Playground.module.css';
import { TreatIcon } from './TreatIcon.tsx';

type PlaygroundProps = {
  /** 움직임 계산이 놀이터 위치를 잰다(평소 다니는 곳). */
  playgroundRef: RefObject<HTMLDivElement | null>;
  /** 간식 주기(무료, 아무 때나). 없으면 버튼을 그리지 않는다. */
  onFeed?: () => void;
  animal?: PetId;
};

/** 풀이 화면 위쪽(머리 줄 아래) 놀이터 띠. 풀잎·꽃은 장식이라 보조 기술에 숨기고, 간식 버튼만 읽힌다. */
export function Playground({
  playgroundRef,
  onFeed,
  animal = 'rabbit',
}: PlaygroundProps): ReactElement {
  return (
    <div ref={playgroundRef} className={styles.playground}>
      {onFeed && (
        <button
          type="button"
          className={styles.feed}
          aria-label={`간식 주기(${TREAT_NAME[animal]})`}
          onClick={onFeed}
        >
          <span className={styles.bowl}>
            <TreatIcon animal={animal} size={30} />
          </span>
          <span className={styles.feedLabel}>간식</span>
        </button>
      )}
      <svg
        aria-hidden="true"
        className={styles.decor}
        viewBox="0 0 360 40"
        preserveAspectRatio="none"
        focusable="false"
      >
        {/* 풀잎·꽃 장식 */}
        {[24, 88, 150, 214, 280, 336].map((x) => (
          <path
            key={x}
            d={`M${x} 40 Q${x - 4} 28 ${x - 8} 22 M${x} 40 Q${x + 1} 26 ${x + 3} 18 M${x} 40 Q${x + 5} 30 ${x + 11} 25`}
            className={styles.grass}
          />
        ))}
        {[56, 186, 306].map((x) => (
          <g key={x} className={styles.flower}>
            <circle cx={x} cy={28} r={4} />
            <circle cx={x} cy={28} r={1.6} className={styles.flowerCenter} />
          </g>
        ))}
      </svg>
    </div>
  );
}
