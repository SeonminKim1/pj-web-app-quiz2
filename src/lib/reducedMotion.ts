// 기기의 "동작 줄이기" 설정 읽기. 움직임 hook(방해꾼, 놀이터)이 같은 확인을 쓴다(설계 D44).

/** 기기에서 동작 줄이기를 켰는지. matchMedia가 없는 환경(테스트 등)에서는 false. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
