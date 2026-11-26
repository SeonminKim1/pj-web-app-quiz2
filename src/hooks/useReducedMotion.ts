// 기기의 "동작 줄이기" 설정을 따라가는 hook. 화면을 보는 도중에 설정을 바꿔도 바로 반영한다.
import { useSyncExternalStore } from 'react';
import {
  prefersReducedMotion,
  REDUCED_MOTION_QUERY,
} from '../lib/reducedMotion.ts';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
    return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  // 테스트의 가짜 matchMedia처럼 이벤트가 없으면 처음 값만 쓴다.
  if (typeof query.addEventListener !== 'function') return () => {};
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** 동작 줄이기를 켰는지. 설정이 바뀌면 다시 그린다. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
