import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ProgressProvider, SettingsProvider } from '../App.tsx';
import { createProgressStore } from '../data/progressRepository.ts';
import { createSettingsStore } from '../data/settingsRepository.ts';
import { useSettings } from './useSettings.ts';

describe('설정 상태', () => {
  it('처음엔 토끼, 고르면 바로 저장하고 같은 동물은 다시 저장하지 않는다', () => {
    const store = createSettingsStore({ storage: null });
    const save = vi.spyOn(store, 'save');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ProgressProvider store={createProgressStore({ storage: null })}>
        <SettingsProvider store={store}>
          <MemoryRouter>{children}</MemoryRouter>
        </SettingsProvider>
      </ProgressProvider>
    );
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.settings.pet).toBe('rabbit');

    act(() => result.current.choosePet('dog'));
    expect(result.current.settings.pet).toBe('dog');
    expect(store.load()).toEqual({ version: 1, pet: 'dog' });
    act(() => result.current.choosePet('dog'));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('배경음악은 처음엔 꺼져 있고, 켜고 끄면 바로 저장한다', () => {
    const store = createSettingsStore({ storage: null });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ProgressProvider store={createProgressStore({ storage: null })}>
        <SettingsProvider store={store}>
          <MemoryRouter>{children}</MemoryRouter>
        </SettingsProvider>
      </ProgressProvider>
    );
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.settings.music).toBeUndefined();

    act(() => result.current.setMusic(true));
    expect(store.load()).toEqual({ version: 1, pet: 'rabbit', music: true });
    act(() => result.current.setMusic(false));
    expect(store.load()).toEqual({ version: 1, pet: 'rabbit', music: false });
  });

  it('SettingsProvider 밖에서 쓰면 바로 알린다', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSettings())).toThrow(
      'useSettings는 SettingsProvider 안에서만 쓸 수 있어요',
    );
    vi.restoreAllMocks();
  });
});
