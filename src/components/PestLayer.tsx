import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import type { PestMotion } from '../hooks/usePestMotion.ts';
import type { PestBehavior, PestMood } from '../lib/pest.ts';
import styles from './PestLayer.module.css';
import { PetPortrait } from './PetPortrait.tsx';
import type { PetId } from '../types/settings.ts';

type PestLayerProps = {
  /** 놀이 영역(이 상자 안에서만 토끼가 움직인다). */
  areaRef: RefObject<HTMLDivElement | null>;
  behavior: PestBehavior;
  mood: PestMood;
  dizzy: boolean;
  line: string | undefined;
  motion: PestMotion;
  /** 놀이 영역에 들어가는 풀이 화면(문제·입력창·힌트·버튼). */
  children: ReactNode;
  /** 고른 방해꾼 동물. 기본 토끼. */
  animal?: PetId;
};

/**
 * 방해꾼 층(spec "배치와 그리기"). 풀이 화면 위에 동물 그림(2D SVG, 터치 통과)을 겹치고,
 * 동물을 따라다니는 투명 버튼이 탭·끌기·키보드를 받는다.
 * 움직임: 위치는 프레임마다 transform, 뛰는 높이로 늘어나고 내려앉을 때 납작해지기,
 * 가는 방향 보기. 깜빡임·숨쉬기·표정이 바뀔 때 통통 튀기는 CSS 애니메이션(PestLayer.module.css).
 */
export function PestLayer({
  areaRef,
  behavior,
  mood,
  dizzy,
  line,
  motion,
  children,
  animal = 'rabbit',
}: PestLayerProps): ReactElement {
  const hitRef = useRef<HTMLButtonElement>(null);
  const jellyRef = useRef<HTMLDivElement>(null);
  const figureRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const bubbleSize = useRef({ width: 0, height: 0 });

  // 말풍선 크기는 문구가 바뀔 때만 잰다.
  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    bubbleSize.current = bubble
      ? { width: bubble.offsetWidth, height: bubble.offsetHeight }
      : { width: 0, height: 0 };
  }, [line]);

  // 프레임마다 그림·잡는 영역·말풍선 위치만 바꾼다(리렌더 없음).
  useEffect(() => {
    let flip = 1;
    return motion.subscribe((frame) => {
      const { x, y, hop, size, area, facing } = frame;
      const left = x - size / 2;
      const top = y - size - hop;
      for (const el of [hitRef.current, jellyRef.current]) {
        if (!el) continue;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.transform = `translate(${left}px, ${top}px)`;
      }
      const bubble = bubbleRef.current;
      if (bubble) {
        // 머리 위, 놀이 영역 밖으로 나가지 않게 안쪽으로 민다.
        // 크기는 문구가 바뀔 때 한 번만 잰 값을 쓴다(프레임마다 레이아웃을 다시 계산하지 않게).
        const { width, height } = bubbleSize.current;
        let bx = Math.min(
          Math.max(0, x - width / 2),
          Math.max(0, area.width - width),
        );
        let by = top - height - 4;
        if (by < 0) {
          // 머리 위에 자리가 없으면 얼굴을 가리지 않게 옆에 띄운다(넓은 쪽).
          const right = x + size / 2 + 4;
          bx =
            right + width <= area.width
              ? right
              : Math.max(0, x - size / 2 - 4 - width);
          by = Math.max(0, top + size * 0.15);
        }
        bubble.style.transform = `translate(${bx}px, ${by}px)`;
      }
      const figure = figureRef.current;
      if (figure) {
        // 가는 쪽을 본다(옆으로 움직일 때만 바꿔서 떨리지 않게).
        const side = Math.sin(facing);
        if (side > 0.35) flip = 1;
        else if (side < -0.35) flip = -1;
        // 뜨면 길쭉, 땅에 닿을 때 살짝 납작(transform-origin은 발밑).
        const stretch = Math.min(hop, 12) / 12;
        const sy = hop > 0.5 ? 1 + 0.08 * stretch : 1;
        const sx = hop > 0.5 ? 1 - 0.05 * stretch : 1;
        figure.style.transform = `scale(${sx * flip}, ${sy})`;
      }
    });
  }, [motion]);

  return (
    <div ref={areaRef} className={styles.area}>
      {children}
      <div
        ref={jellyRef}
        className={styles.jelly}
        data-testid="pest-2d"
        data-behavior={behavior}
        data-dizzy={dizzy}
        aria-hidden="true"
      >
        <div ref={figureRef} className={styles.figure}>
          {/* 표정이 바뀌면 새로 그려서 "통" 튀는 애니메이션을 다시 시작한다. */}
          <div key={mood} className={styles.pop}>
            <PetPortrait animal={animal} mood={mood} />
          </div>
        </div>
      </div>
      <button
        ref={hitRef}
        type="button"
        className={styles.hit}
        aria-label="방해꾼 쫓아내기"
        data-behavior={behavior}
        {...motion.handlers}
      />
      {line && (
        <span ref={bubbleRef} className={styles.bubble} aria-hidden="true">
          {line}
        </span>
      )}
    </div>
  );
}
