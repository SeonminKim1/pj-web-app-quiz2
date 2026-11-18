import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppRoutes, ProgressProvider, SettingsProvider } from '../App.tsx';
import { createProgressStore } from '../data/progressRepository.ts';
import { createSettingsStore } from '../data/settingsRepository.ts';
import * as repository from '../data/quizRepository.ts';

vi.mock('../components/petScene.ts', () => ({
  createPetScene: () => {
    throw new Error('WebGL 없음(테스트)');
  },
}));

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(repository, 'fetchManifest').mockResolvedValue({
    version: 1,
    topics: [
      {
        id: 'nonsense',
        label: '넌센스',
        count: 12,
        file: 'nonsense.json',
        playable: true,
      },
    ],
  });
  vi.spyOn(repository, 'fetchTopicFile').mockResolvedValue({
    version: 1,
    topic: 'nonsense',
    items: Array.from({ length: 12 }, (_, i) => ({
      id: String(i + 1),
      question: `문제 ${i + 1}`,
      answer: `정답${i + 1}`,
    })),
  });
});
afterEach(() => vi.restoreAllMocks());

it('첫 화면의 주 행동은 "1단계부터 시작하기"이고 누르면 1단계 풀이로 간다', async () => {
  const user = userEvent.setup();
  render(
    <ProgressProvider store={createProgressStore({ storage: null })}>
      <SettingsProvider store={createSettingsStore({ storage: null })}>
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      </SettingsProvider>
    </ProgressProvider>,
  );
  expect(await screen.findByText('넌센스 12문제, 2단계')).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: '푼 문제' })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  await user.click(screen.getByRole('button', { name: '1단계부터 시작하기' }));
  expect(await screen.findByText('문제 1')).toBeInTheDocument();
});
