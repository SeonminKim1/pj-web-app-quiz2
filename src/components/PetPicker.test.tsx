import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { AppRoutes, ProgressProvider, SettingsProvider } from '../App.tsx';
import { createProgressStore } from '../data/progressRepository.ts';
import { createSettingsStore } from '../data/settingsRepository.ts';
import * as repository from '../data/quizRepository.ts';

beforeEach(() => {
  vi.spyOn(repository, 'fetchManifest').mockResolvedValue({
    version: 1,
    topics: [
      {
        id: 'nonsense',
        label: '넌센스',
        count: 1,
        file: 'nonsense.json',
        playable: true,
      },
    ],
  });
  vi.spyOn(repository, 'fetchTopicFile').mockResolvedValue({
    version: 1,
    topic: 'nonsense',
    items: [{ id: '1', question: '문제 1', answer: '정답' }],
  });
});

it('첫 화면에서 방해꾼을 고르면 저장되고 버튼에 바로 보인다', async () => {
  const user = userEvent.setup();
  const settingsStore = createSettingsStore({ storage: null });
  render(
    <ProgressProvider store={createProgressStore({ storage: null })}>
      <SettingsProvider store={settingsStore}>
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      </SettingsProvider>
    </ProgressProvider>,
  );
  await user.click(
    screen.getByRole('button', { name: '방해꾼 바꾸기, 지금 토끼' }),
  );
  const rabbit = screen.getByRole('radio', { name: /토끼/ });
  expect(rabbit).toHaveAttribute('aria-checked', 'true');
  expect(rabbit).toHaveFocus();
  await user.click(screen.getByRole('radio', { name: /고양이/ }));
  expect(screen.getByRole('radio', { name: /고양이/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await user.click(screen.getByRole('button', { name: '다 골랐어요' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: '방해꾼 바꾸기, 지금 고양이' }),
  ).toBeInTheDocument();
});

it('간식은 무료로 아무 때나 줄 수 있고, 줄 때마다 기뻐하며 한마디 한다', async () => {
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
  await user.click(screen.getByRole('button', { name: /방해꾼 바꾸기/ }));
  expect(screen.getByText('토끼가 좋아하는 당근')).toBeInTheDocument();
  const give = screen.getByRole('button', { name: '주기' });
  await user.click(give);
  await user.click(give);
  expect(give).toBeEnabled();
  expect(screen.getByRole('status')).not.toHaveTextContent('좋아하는 당근');
  expect(document.querySelector('svg[data-mood="happy"]')).not.toBeNull();
  // 골드는 그대로.
  expect(screen.getByLabelText('보유 골드 30')).toBeInTheDocument();
});
