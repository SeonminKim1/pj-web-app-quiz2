import { render, screen, within } from '@testing-library/react';
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

// ── 모자 줄(설계 D9·D10·D23·D29) ──

// 넌센스 10문제(스테이지 1, 보상 분홍 리본) + MBTI는 빈 파일. 주제마다 다른 파일을 준다(OV2-6).
function mockTopicFiles(): void {
  vi.spyOn(repository, 'fetchTopicFile').mockImplementation(
    async ({ topicId }) =>
      topicId === 'mbti'
        ? { version: 1, topic: 'mbti', items: [] }
        : {
            version: 1,
            topic: 'nonsense',
            items: Array.from({ length: 10 }, (_, i) => ({
              id: String(i + 1),
              question: `문제 ${i + 1}`,
              answer: '정답',
            })),
          },
  );
}

function renderHome(progressStore = createProgressStore({ storage: null })) {
  const user = userEvent.setup();
  render(
    <ProgressProvider store={progressStore}>
      <SettingsProvider store={createSettingsStore({ storage: null })}>
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      </SettingsProvider>
    </ProgressProvider>,
  );
  return user;
}

async function openSheet(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', { name: '방해꾼 바꾸기, 지금 토끼' }),
  );
  return screen.getByRole('dialog', { name: '누가 방해할까요?' });
}

// Value: protects=모자가 하나도 없을 때 안내 한 줄과 잠긴 모자 30개, "없음"이 골라져 있다(D10); fails_when=안내가 빠지거나 잠긴 모자를 씌울 수 있으면; why_new=모자 줄이 새로 생김; seam=none; no_claim=흐린 모습의 색
it('모자가 없으면 안내 한 줄, 모든 모자가 잠겨 있고 눌러도 씌우지 않는다', async () => {
  mockTopicFiles();
  const store = createProgressStore({ storage: null });
  const user = renderHome(store);
  const sheet = await openSheet(user);
  expect(sheet).toHaveTextContent('스테이지를 다 풀면 모자가 생겨요');
  const hats = within(sheet).getByRole('radiogroup', { name: '모자' });
  expect(within(hats).getByRole('radio', { name: '없음' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  expect(within(hats).getAllByRole('radio', { name: /^잠김, / })).toHaveLength(
    30,
  );
  await user.click(
    within(hats).getByRole('radio', { name: '잠김, 4스테이지' }),
  );
  expect(within(sheet).getByRole('status')).toHaveTextContent(
    '4스테이지를 다 풀면 받아요',
  );
  // 받침에 따라 을/를(OV2-9).
  await user.click(
    within(hats).getByRole('radio', { name: '잠김, MBTI 일상' }),
  );
  expect(within(sheet).getByRole('status')).toHaveTextContent(
    'MBTI 일상을 다 풀면 받아요',
  );
  await user.click(
    within(hats).getByRole('radio', { name: '잠김, MBTI 연애' }),
  );
  expect(within(sheet).getByRole('status')).toHaveTextContent(
    'MBTI 연애를 다 풀면 받아요',
  );
  expect(store.load().equipped).toBeUndefined();
});

// Value: protects=목록을 안 연 예전 사용자도 시트를 열면 깬 판의 모자가 풀리고(D29), 누르면 바로 씌우고 "없음"으로 벗긴다(D9); fails_when=시트가 주제를 읽어 기록하지 않거나, 씌운 모자가 미리보기·저장에 안 남으면; why_new=모자 줄이 새로 생김; seam=none; no_claim=모자 그림이 동물에 어울리는지(T1)
it('목록을 안 열었어도 시트를 열면 깬 판의 모자가 풀리고, 누르면 씌우고 없음으로 벗긴다', async () => {
  mockTopicFiles();
  const store = createProgressStore({ storage: null });
  store.save({
    version: 1,
    gold: 30,
    topics: {
      nonsense: {
        solved: Array.from({ length: 10 }, (_, i) => String(i + 1)),
        hintsOpened: {},
      },
    },
  });
  const user = renderHome(store);
  const sheet = await openSheet(user);
  const ribbon = await within(sheet).findByRole('radio', { name: '분홍 리본' });
  await user.click(ribbon);
  expect(ribbon).toHaveAttribute('aria-checked', 'true');
  expect(store.load().equipped).toEqual({ rabbit: 'hat-ribbon-pink' });
  expect(
    sheet.querySelector('[data-part="hat"][data-reward="hat-ribbon-pink"]'),
  ).not.toBeNull();
  await user.click(within(sheet).getByRole('radio', { name: '없음' }));
  expect(store.load().equipped).toBeUndefined();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  // 첫 화면 방해꾼 버튼의 얼굴에는 모자가 없다(벗겼으니).
  expect(document.querySelector('[data-part="hat"]')).toBeNull();
});
