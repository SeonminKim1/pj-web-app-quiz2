import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppRoutes, ProgressProvider, SettingsProvider } from '../App.tsx';
import {
  createProgressStore,
  type ProgressStore,
} from '../data/progressRepository.ts';
import { createSettingsStore } from '../data/settingsRepository.ts';
import * as repository from '../data/quizRepository.ts';
import type { Progress } from '../types/progress.ts';

let store: ProgressStore;

beforeEach(() => {
  store = createProgressStore({ storage: null });
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
  vi.spyOn(repository, 'fetchTopicFile').mockImplementation(
    async ({ topicId }) => ({
      version: 1,
      topic: topicId,
      items: [],
    }),
  );
});
afterEach(() => vi.restoreAllMocks());

function renderAt(path: string, progress?: Partial<Progress>) {
  store.save({ version: 1, gold: 30, topics: {}, ...progress });
  const user = userEvent.setup();
  render(
    <ProgressProvider store={store}>
      <SettingsProvider store={createSettingsStore({ storage: null })}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </SettingsProvider>
    </ProgressProvider>,
  );
  return user;
}

const yard = () => screen.getByRole('region', { name: '놀이터 마당' });

// Value: protects=처음 열면 기본 물건이 1번 칸에 있고, 새 물건이 없으면 상점 탭으로 연다(D14, D38); fails_when=기본 물건이 안 보이거나 처음 탭 규칙이 바뀌면; why_new=놀이터 화면이 새로 생김; seam=none; no_claim=마당 그림 배치
it('처음 열면 기본 물건이 1번 칸, 새 물건이 없으면 상점 탭', () => {
  renderAt('/playground');
  expect(
    within(yard()).getByRole('button', { name: '칸 1, 모래 놀이통' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: '상점' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

// Value: protects=안 본 물건 보상이 있으면 내 물건 탭으로 열고, 열면 본 것으로 기록해 첫 화면 점이 꺼진다(D38); fails_when=본 것 기록을 빼먹어 점이 안 꺼지면; why_new=새 규칙; seam=none; no_claim=점 그림
it('새 물건이 있으면 내 물건 탭으로 열고 본 것으로 기록한다', async () => {
  renderAt('/playground', {
    earnedRewards: ['item-yarn-pink', 'hat-ribbon-pink'],
  });
  expect(screen.getByRole('tab', { name: '내 물건' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(screen.getByRole('list', { name: '내 물건' })).toHaveTextContent(
    '분홍 털실 공',
  );
  await waitFor(() =>
    expect(store.load().seenRewards).toEqual(['item-yarn-pink']),
  );
});

// Value: protects=사기 → 골드 100 빠짐 → 바로 놓기 → 빈 칸에 놓이고 저장된다(D16, D17, D37); fails_when=골드가 안 빠지거나 놓기 모드가 안 열리거나 저장이 안 되면; why_new=상점이 새로 생김; seam=none; no_claim=알림 3초 타이머
it('상점에서 사서 바로 놓으면 골드가 빠지고 칸에 저장된다', async () => {
  const user = renderAt('/playground', { gold: 250 });
  await user.click(screen.getByRole('button', { name: '노랑 풍선, 100골드' }));
  const sheet = screen.getByRole('dialog', {
    name: '노랑 풍선을 100골드에 살까요?',
  });
  await user.click(within(sheet).getByRole('button', { name: '사기' }));
  expect(store.load()).toMatchObject({
    gold: 150,
    ownedItems: ['item-balloon-yellow'],
  });
  await user.click(screen.getByRole('button', { name: '바로 놓기' }));
  expect(within(yard()).getByRole('status')).toHaveTextContent(
    '어느 칸에 놓을까요?',
  );
  await user.click(
    within(yard()).getByRole('button', {
      name: '칸 2, 비어 있음, 여기에 놓기',
    }),
  );
  expect(store.load().placed).toEqual({
    '0': 'big-sandbox',
    '1': 'item-balloon-yellow',
  });
  expect(
    within(yard()).getByRole('button', { name: '칸 2, 노랑 풍선' }),
  ).toBeInTheDocument();
});

// Value: protects=골드가 모자라면 이유를 보여 주고 사기가 막힌다(D16); fails_when=모자란 골드로 사지거나 안내가 빠지면; why_new=새 시트; seam=none; no_claim=none beyond protects
it('골드가 모자라면 "골드 N 모자라요"와 막힌 사기', async () => {
  const user = renderAt('/playground', { gold: 30 });
  await user.click(screen.getByRole('button', { name: '노랑 연, 100골드' }));
  const sheet = screen.getByRole('dialog');
  expect(sheet).toHaveTextContent('골드 70 모자라요');
  expect(within(sheet).getByRole('button', { name: '사기' })).toBeDisabled();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

// Value: protects=놓인 칸에 다른 물건을 놓으면 바뀌고 원래 물건은 내 물건으로 돌아간다(D17); fails_when=바꾸기가 한 물건을 두 칸에 남기면; why_new=새 규칙; seam=none; no_claim=none beyond protects
it('찬 칸에 놓으면 바꾸고, 원래 물건은 다시 놓을 수 있다', async () => {
  const user = renderAt('/playground', {
    earnedRewards: ['item-yarn-pink'],
    seenRewards: ['item-yarn-pink'],
  });
  await user.click(screen.getByRole('tab', { name: '내 물건' }));
  await user.click(screen.getByRole('button', { name: '분홍 털실 공 놓기' }));
  await user.click(
    within(yard()).getByRole('button', {
      name: '칸 1, 모래 놀이통, 여기에 놓기',
    }),
  );
  expect(store.load().placed).toEqual({ '0': 'item-yarn-pink' });
  expect(
    screen.getByRole('button', { name: '모래 놀이통 놓기' }),
  ).toBeInTheDocument();
});

// Value: protects=좋아하는 물건이 놓이면 그 동물이 그 옆에 선다(D39, 움직임은 PR ④); fails_when=likedBy를 마당에서 안 쓰면; why_new=새 규칙; seam=none; no_claim=움직임
it('고양이는 놓인 털실 공 옆에 선다', () => {
  renderAt('/playground', {
    earnedRewards: ['item-yarn-mint'],
    seenRewards: ['item-yarn-mint'],
    placed: { '4': 'item-yarn-mint' },
  });
  const cat = yard()
    .querySelector('[data-animal="cat"]')!
    .closest('[data-by-item]')!;
  expect(cat.getAttribute('data-by-item')).toBe('true');
  const dog = yard()
    .querySelector('[data-animal="dog"]')!
    .closest('[data-by-item]')!;
  expect(dog.getAttribute('data-by-item')).toBe('false');
});

// Value: protects=놓을 물건이 없을 때 빈 칸을 누르면 스테이지로 안내한다(D14); fails_when=아무 반응이 없으면; why_new=새 빈 상태; seam=none; no_claim=none beyond protects
it('놓을 물건이 없으면 빈 칸에서 스테이지로 안내한다', async () => {
  const user = renderAt('/playground');
  await user.click(
    within(yard()).getByRole('button', { name: '칸 2, 비어 있음' }),
  );
  expect(screen.getByText('스테이지를 깨면 물건이 생겨요')).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: '스테이지 하러 가기' }),
  ).toBeInTheDocument();
});

// Value: protects=새 보상을 못 읽어도 마당은 쓰고 한 줄로 알린다(D15); fails_when=오류 화면으로 바뀌거나 아무 안내가 없으면; why_new=새 실패 경로; seam=none; no_claim=실제 네트워크
it('보상을 못 읽으면 한 줄 안내와 다시', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(repository, 'fetchTopicFile').mockRejectedValue(
    new Error('offline'),
  );
  renderAt('/playground');
  expect(
    await screen.findByText(/새 보상을 확인하지 못했어요/),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '다시' })).toBeInTheDocument();
  expect(yard()).toBeInTheDocument();
});

// Value: protects=첫 화면 놀이터 버튼에 안 본 물건이 있으면 점, 놀이터를 다녀오면 꺼진다(D20, D38); fails_when=점이 꺼지지 않거나 안 켜지면; why_new=새 입구; seam=none; no_claim=점 위치
it('첫 화면 놀이터 버튼: 새 물건 점, 다녀오면 꺼진다', async () => {
  const user = renderAt('/', { earnedRewards: ['big-slide'] });
  await user.click(screen.getByRole('link', { name: '놀이터, 새 물건 있음' }));
  await user.click(await screen.findByRole('link', { name: '첫 화면으로' }));
  expect(
    await screen.findByRole('link', { name: '놀이터' }),
  ).toBeInTheDocument();
});
