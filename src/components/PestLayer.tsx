import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import type { PestMotion } from '../hooks/usePestMotion.ts';
import type { PestBehavior, PestMood } from '../lib/pest.ts';
import styles from './PestLayer.module.css';
import { PetPortrait } from './PetPortrait.tsx';
import type { PetScene } from './petScene.ts';
import type { PetId } from '../types/settings.ts';

/** 3D 장면 모듈 불러오기(테스트에서 바꿔 넣는다). */
export type LoadPetScene = () => Promise<typeof import('./petScene.ts')>;

const loadPetScene: LoadPetScene = () => import('./petScene.ts');

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
  loadScene?: LoadPetScene;
  /** 고른 방해꾼 동물. 기본 토끼. */
  animal?: PetId;
};

/**
 * 방해꾼 층(spec "배치와 그리기"). 풀이 화면 위에 3D 캔버스(터치 통과)를 겹치고,
 * 동물을 따라다니는 투명 버튼이 탭·끌기·키보드를 받는다. 3D를 못 쓰면 그 동물의 2D 그림으로 그린다.
 */
export function PestLayer({
  areaRef,
  behavior,
  mood,
  dizzy,
  line,
  motion,
  children,
  loadScene = loadPetScene,
  animal = 'rabbit',
}: PestLayerProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitRef = useRef<HTMLButtonElement>(null);
  const jellyRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const sceneRef = useRef<PetScene | undefined>(undefined);
  const [mode, setMode] = useState<'loading' | '3d' | '2d'>('loading');
  const bubbleSize = useRef({ width: 0, height: 0 });

  // 말풍선 크기는 문구가 바뀔 때만 잰다.
  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    bubbleSize.current = bubble
      ? { width: bubble.offsetWidth, height: bubble.offsetHeight }
      : { width: 0, height: 0 };
  }, [line]);

  // 그릴 때 쓰는 최신 반응 값(프레임마다 렌더하지 않으므로 ref로 읽는다).
  const look = useRef({ behavior, mood, dizzy });
  useEffect(() => {
    look.current = { behavior, mood, dizzy };
  });

  // 3D 장면은 따로 불러온다. 실패하거나 WebGL이 없으면 그 동물의 2D 그림.
  useEffect(() => {
    let cancelled = false;
    let scene: PetScene | undefined;
    loadScene()
      .then(({ createPetScene }) => {
        const canvas = canvasRef.current;
        const area = areaRef.current?.getBoundingClientRect();
        if (cancelled || !canvas || !area) return;
        scene = createPetScene({
          canvas,
          area: { width: area.width, height: area.height },
          animal,
          // 그리는 중 WebGL이 끊기면 2D로 바꾼다.
          onContextLost: () => {
            if (cancelled) return;
            console.warn('3D 방해꾼 연결이 끊겨 2D로 그려요');
            sceneRef.current = undefined;
            setMode('2d');
          },
        });
        sceneRef.current = scene;
        setMode('3d');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.warn('3D 방해꾼을 그릴 수 없어 2D로 그려요', error);
        setMode('2d');
      });
    return () => {
      cancelled = true;
      sceneRef.current = undefined;
      scene?.dispose();
    };
  }, [areaRef, loadScene, animal]);

  // 프레임마다 캔버스·잡는 영역·말풍선 위치만 바꾼다.
  useEffect(() => {
    let lastArea = '';
    return motion.subscribe((frame) => {
      const { x, y, hop, size, area } = frame;
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
        const bx = Math.min(
          Math.max(0, x - width / 2),
          Math.max(0, area.width - width),
        );
        const by = Math.max(0, top - height - 4);
        bubble.style.transform = `translate(${bx}px, ${by}px)`;
      }
      const scene = sceneRef.current;
      if (scene) {
        const key = `${area.width}x${area.height}`;
        if (key !== lastArea) {
          lastArea = key;
          scene.resize(area);
        }
        scene.render({ ...frame, ...look.current });
      }
    });
  }, [motion, mode]);

  return (
    <div ref={areaRef} className={styles.area}>
      {children}
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        hidden={mode !== '3d'}
        aria-hidden="true"
      />
      {mode !== '3d' && (
        <div
          ref={jellyRef}
          className={styles.jelly}
          data-testid="pest-2d"
          aria-hidden="true"
        >
          <PetPortrait animal={animal} mood={mood} />
        </div>
      )}
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
