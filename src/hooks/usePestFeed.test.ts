import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PEST_LINES } from '../lib/pest.ts';
import { getPestAnimal } from '../lib/pestAnimals.ts';
import { usePest } from './usePest.ts';

const COVER_AT = getPestAnimal('rabbit').coverDelay.min;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('간식을 주면 기뻐하며 말하고, 가리던 중이면 내려와서 먹는다', () => {
  const { result } = renderHook(() =>
    usePest({ phase: 'answering', random: () => 0 }),
  );
  act(() => vi.advanceTimersByTime(COVER_AT));
  expect(result.current.behavior).toBe('covering');
  act(() => result.current.feed());
  expect(result.current.behavior).toBe('roaming');
  expect(result.current.mood).toBe('happy');
  expect(result.current.line).toBe(PEST_LINES.treat[0]);
  expect(result.current.fedId).toBe(1);
  act(() => result.current.feed());
  expect(result.current.fedId).toBe(2);
});
