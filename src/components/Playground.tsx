import type { ReactElement, RefObject } from 'react';
import styles from './Playground.module.css';

type PlaygroundProps = {
  /** 움직임 계산이 놀이터 위치를 잰다(평소 다니는 곳). */
  playgroundRef: RefObject<HTMLDivElement | null>;
};

/** 풀이 화면 위쪽(머리 줄 아래) 놀이터 띠(docs/ui-play-layout/spec.md "놀이터"). 장식이라 보조 기술에는 숨긴다. */
export function Playground({ playgroundRef }: PlaygroundProps): ReactElement {
  return (
    <div ref={playgroundRef} className={styles.playground} aria-hidden="true">
      <svg
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
