import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppRoutes, ProgressProvider, SettingsProvider } from '../App.tsx';
import { createProgressStore } from '../data/progressRepository.ts';
import { createSettingsStore } from '../data/settingsRepository.ts';
import * as repository from '../data/quizRepository.ts';

const ITEMS = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  question: `문제 ${i + 1}`,
  answer: `정답${i + 1}`,
}));

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(repository, 'fetchTopicFile').mockResolvedValue({
    version: 1,
    topic: 'nonsense',
    items: ITEMS,
  });
});

it('10번째 문제를 맞히면 "새 칭호! 말장난 꿈나무"', async () => {
  const saved = {
    version: 1,
    gold: 30,
    topics: {
      nonsense: {
        solved: ITEMS.slice(0, 9).map((it) => it.id),
        hintsOpened: {},
      },
    },
  };
  const memory = new Map([['quiz-progress', JSON.stringify(saved)]]);
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  };
  const user = userEvent.setup();
  render(
    <ProgressProvider store={createProgressStore({ storage })}>
      <SettingsProvider store={createSettingsStore({ storage: null })}>
        <MemoryRouter initialEntries={['/topics/nonsense/stages/1']}>
          <AppRoutes />
        </MemoryRouter>
      </SettingsProvider>
    </ProgressProvider>,
  );
  expect(await screen.findByText('문제 10')).toBeInTheDocument();
  await user.type(
    screen.getByRole('textbox', { name: '정답 입력' }),
    '정답10{Enter}',
  );
  expect(await screen.findByText('말장난 꿈나무')).toBeInTheDocument();
  expect(screen.getByText('새 칭호!')).toBeInTheDocument();
});
