import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { stubReducedMotion } from '../test/reducedMotion.ts';
import { useReducedMotion } from './useReducedMotion.ts';

afterEach(() => vi.unstubAllGlobals());

// Value: protects=화면을 보는 도중 동작 줄이기를 켜고 끄면 바로 따라간다; fails_when=처음 한 번만 읽으면; why_new=새 hook; seam=none; no_claim=실제 OS 설정 화면
it('동작 줄이기 설정이 바뀌면 값이 바로 바뀐다', () => {
  const media = stubReducedMotion(false);
  const { result, unmount } = renderHook(() => useReducedMotion());
  expect(result.current).toBe(false);
  act(() => media.set(true));
  expect(result.current).toBe(true);
  act(() => media.set(false));
  expect(result.current).toBe(false);
  unmount();
});

// Value: protects=matchMedia가 없는 환경에서도 깨지지 않고 false; fails_when=matchMedia를 그냥 부르면; why_new=새 hook; seam=none; no_claim=none beyond protects
it('matchMedia가 없으면 false', () => {
  const { result } = renderHook(() => useReducedMotion());
  expect(result.current).toBe(false);
});
