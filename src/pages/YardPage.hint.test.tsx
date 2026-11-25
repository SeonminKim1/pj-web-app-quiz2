import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppRoutes, ProgressProvider, SettingsProvider } from '../App.tsx';
import { createProgressStore } from '../data/progressRepository.ts';
import { createSettingsStore } from '../data/settingsRepository.ts';
import * as repository from '../data/quizRepository.ts';

beforeEach(() => {
  vi.spyOn(repository, 'fetchManifest').mockResolvedValue({
    version: 1,
    topics: [],
  });
});
afterEach(() => vi.restoreAllMocks());

// Value: protects=물건이 모두 놓였을 때 찬 칸을 누르면 없는 "놓기" 버튼을 가리키지 않고 스테이지로 안내한다(/design-review FINDING-003); fails_when=찬 칸이 언제나 "놓기" 안내를 띄우면; why_new=막다른 안내 회귀; seam=none; no_claim=안내 문구 모양
it('놓을 물건이 없으면 찬 칸을 눌러도 스테이지로 안내한다', async () => {
  const store = createProgressStore({ storage: null });
  store.save({ version: 1, gold: 30, topics: {} });
  const user = userEvent.setup();
  render(
    <ProgressProvider store={store}>
      <SettingsProvider store={createSettingsStore({ storage: null })}>
        <MemoryRouter initialEntries={['/playground']}>
          <AppRoutes />
        </MemoryRouter>
      </SettingsProvider>
    </ProgressProvider>,
  );
  const yard = screen.getByRole('region', { name: '놀이터 마당' });
  await user.click(
    within(yard).getByRole('button', { name: '칸 1, 모래 놀이통' }),
  );
  expect(screen.getByText('스테이지를 깨면 물건이 생겨요')).toBeInTheDocument();
  expect(screen.queryByText(/놓기.*눌러요/)).not.toBeInTheDocument();
});
