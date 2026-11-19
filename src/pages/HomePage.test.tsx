import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppRoutes, ProgressProvider, SettingsProvider } from '../App.tsx';
import { createProgressStore } from '../data/progressRepository.ts';
import { createSettingsStore } from '../data/settingsRepository.ts';
import * as repository from '../data/quizRepository.ts';

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

it('첫 화면의 주 행동은 "스테이지 1부터 시작하기"이고 누르면 스테이지 1 풀이로 간다', async () => {
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
  expect(
    await screen.findByText('넌센스 12문제, 스테이지 2개'),
  ).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: '푼 문제' })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  await user.click(
    screen.getByRole('button', { name: '스테이지 1부터 시작하기' }),
  );
  expect(await screen.findByText('문제 1')).toBeInTheDocument();
});

// Value: protects=⚙ 설정에서 효과음·배경음악을 켜고 끄고, Esc로 닫으면 ⚙로 포커스가 돌아온다; fails_when=설정 시트가 토글을 잃거나 닫힐 때 포커스를 놓치면; why_new=첫 화면 토글을 설정으로 옮김; seam=none; no_claim=실제 소리 재생
it('⚙ 설정 시트에서 효과음·배경음악을 켜고, Esc로 닫는다', async () => {
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
  const gear = await screen.findByRole('button', { name: '설정' });
  expect(
    screen.queryByRole('button', { name: '효과음·진동' }),
  ).not.toBeInTheDocument();
  await user.click(gear);
  const sound = screen.getByRole('button', { name: '효과음·진동' });
  expect(sound).toHaveAttribute('aria-pressed', 'false');
  await user.click(sound);
  expect(sound).toHaveAttribute('aria-pressed', 'true');
  await user.click(screen.getByRole('button', { name: '배경음악' }));
  expect(screen.getByRole('button', { name: '배경음악' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(gear).toHaveFocus();
});
