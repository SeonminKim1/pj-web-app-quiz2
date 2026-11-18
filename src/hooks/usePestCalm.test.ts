import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getPestAnimal } from '../lib/pestAnimals.ts';
import { usePest } from './usePest.ts';

const COVER_AT = getPestAnimal('rabbit').coverDelay.min;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('간식을 먹는 중(calm)이면 시간이 지나도 문제를 가리러 가지 않는다', () => {
  const { result, rerender } = renderHook(
    ({ calm }) => usePest({ phase: 'answering', random: () => 0, calm }),
    { initialProps: { calm: true } },
  );
  act(() => vi.advanceTimersByTime(COVER_AT * 3));
  expect(result.current.behavior).toBe('roaming');
  // 간식이 떨어지면 다시 평소대로.
  rerender({ calm: false });
  act(() => vi.advanceTimersByTime(COVER_AT));
  expect(result.current.behavior).toBe('covering');
});
