// 기기의 "동작 줄이기" 설정 읽기. 움직임 hook(방해꾼, 놀이터)과 효과(동전, 숫자, 스크롤)가 같은 확인을 쓴다(설계 D44).
// 화면을 보는 도중 바뀌는 것까지 따라가려면 src/hooks/useReducedMotion.ts.

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** 기기에서 동작 줄이기를 켰는지. matchMedia가 없는 환경(테스트 등)에서는 false. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}
