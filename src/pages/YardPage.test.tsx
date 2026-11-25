import { act, render, screen, waitFor, within } from '@testing-library/react';
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

function renderAt(
  path: string | { pathname: string; state: unknown },
  progress?: Partial<Progress>,
) {
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

// Value: protects=놓기 모드의 취소는 아무 칸도 바꾸지 않고 모드를 끝낸다(D17); fails_when=취소가 모드를 못 끄거나 배치를 저장하면; why_new=취소 버튼을 누르는 테스트가 없음; seam=none; no_claim=Esc 키(구현 없음)
it('놓기 모드에서 취소하면 배치가 그대로다', async () => {
  const user = renderAt('/playground', {
    earnedRewards: ['item-yarn-pink'],
    seenRewards: ['item-yarn-pink'],
  });
  await user.click(screen.getByRole('tab', { name: '내 물건' }));
  await user.click(screen.getByRole('button', { name: '분홍 털실 공 놓기' }));
  await user.click(within(yard()).getByRole('button', { name: '취소' }));
  expect(within(yard()).queryByRole('status')).not.toBeInTheDocument();
  expect(
    within(yard()).getByRole('button', { name: '칸 2, 비어 있음' }),
  ).toBeInTheDocument();
  expect(store.load().placed).toBeUndefined();
});

// Value: protects=주소 상태로 넘어온 물건이 가진 물건이 아니면 놓기 모드로 열지 않는다(F7 가드); fails_when=ownedYardItems 확인을 빼서 안 가진 물건을 놓게 되면; why_new=결과 카드 테스트는 가진 물건만 넘김; seam=none; no_claim=뒤로 가기
it('가지지 않은 물건을 놓으라고 넘어오면 놓기 모드가 아니다', () => {
  renderAt({ pathname: '/playground', state: { place: 'item-yarn-pink' } });
  expect(within(yard()).queryByRole('status')).not.toBeInTheDocument();
  expect(
    within(yard()).getByRole('button', { name: '칸 2, 비어 있음' }),
  ).toBeInTheDocument();
});

// Value: protects=보상 읽기 실패 줄의 "다시"가 실제로 다시 읽고, 성공하면 줄이 사라진다(D15, F6); fails_when=다시가 아무것도 안 하거나 성공 뒤에도 줄이 남으면; why_new=기존 테스트는 줄과 버튼이 보이는지만 봄; seam=none; no_claim=실제 네트워크
it('보상 읽기 실패 뒤 다시를 누르면 다시 읽고 줄이 사라진다', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const fetch = vi
    .spyOn(repository, 'fetchTopicFile')
    .mockRejectedValue(new Error('offline'));
  const user = renderAt('/playground');
  await screen.findByText(/새 보상을 확인하지 못했어요/);
  fetch.mockImplementation(async ({ topicId }) => ({
    version: 1,
    topic: topicId,
    items: [],
  }));
  const calls = fetch.mock.calls.length;
  await user.click(screen.getByRole('button', { name: '다시' }));
  await waitFor(() =>
    expect(
      screen.queryByText(/새 보상을 확인하지 못했어요/),
    ).not.toBeInTheDocument(),
  );
  expect(fetch.mock.calls.length).toBeGreaterThan(calls);
});

// Value: protects=놀이터 모자 탭에서 받은 모자를 누르면 고른 방해꾼에게 씌워 저장된다(D13, HatRow 재사용); fails_when=모자 탭이 HatRow를 안 그리거나 다른 동물에 씌우면; why_new=놀이터 모자 탭 테스트가 없음; seam=none; no_claim=마당 그림의 모자 모양
it('모자 탭에서 받은 모자를 누르면 방해꾼에게 씌운다', async () => {
  const user = renderAt('/playground', { earnedRewards: ['hat-crown-sky'] });
  await user.click(screen.getByRole('tab', { name: '모자' }));
  await user.click(screen.getByRole('radio', { name: '하늘 왕관' }));
  expect(Object.values(store.load().equipped ?? {})).toEqual(['hat-crown-sky']);
  expect(screen.getByRole('radio', { name: '하늘 왕관' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});

// Value: protects=이미 산 상점 물건은 다시 사는 버튼 대신 "가짐 · 놓기", 놓인 물건은 "빼기"로 칸을 비운다(D16, D17, ship D2); fails_when=가진 물건에 값 버튼이 다시 나오거나 빼기가 칸을 안 비우거나 저장을 안 하면; why_new=가짐·빼기 분기 테스트가 없음; seam=none; no_claim=카드 모양
it('산 물건은 가짐 · 놓기, 놓인 물건은 빼기로 칸을 비운다', async () => {
  const user = renderAt('/playground', {
    ownedItems: ['item-balloon-yellow'],
    placed: { '0': 'big-sandbox' },
  });
  expect(
    screen.queryByRole('button', { name: '노랑 풍선, 100골드' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: '노랑 풍선 가짐 · 놓기' }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole('tab', { name: '내 물건' }));
  const mine = screen.getByRole('list', { name: '내 물건' });
  await user.click(
    within(mine).getByRole('button', { name: '모래 놀이통 빼기, 칸 1' }),
  );
  expect(
    within(yard()).getByRole('button', { name: '칸 1, 비어 있음' }),
  ).toBeInTheDocument();
  expect(store.load().placed).toEqual({});
  expect(
    within(mine).getByRole('button', { name: '모래 놀이통 놓기' }),
  ).toBeInTheDocument();
});

// Value: protects=놓기 모드에서 Esc를 누르면 아무 칸도 바꾸지 않고 모드를 끝낸다(D23); fails_when=Esc 처리를 빼거나 모드가 끝날 때 리스너를 안 지우면; why_new=취소 버튼 테스트만 있음; seam=none; no_claim=시트가 열린 상태의 Esc
it('놓기 모드에서 Esc를 누르면 취소된다', async () => {
  const user = renderAt('/playground', {
    earnedRewards: ['item-yarn-pink'],
    seenRewards: ['item-yarn-pink'],
  });
  await user.click(screen.getByRole('tab', { name: '내 물건' }));
  await user.click(screen.getByRole('button', { name: '분홍 털실 공 놓기' }));
  expect(within(yard()).getByRole('status')).toHaveTextContent(
    '어느 칸에 놓을까요?',
  );
  await user.keyboard('{Escape}');
  expect(within(yard()).queryByRole('status')).not.toBeInTheDocument();
  expect(store.load().placed).toBeUndefined();
});

// Value: protects=놀이터 탭은 왼쪽·오른쪽 화살표로 옮기고 끝에서 돌아가며, 고른 탭만 Tab 순서에 있다(D23); fails_when=화살표 처리나 tabIndex가 빠지면; why_new=탭 키보드 테스트가 없음; seam=none; no_claim=스크린 리더 낭독
it('탭은 화살표로 옮긴다', async () => {
  const user = renderAt('/playground');
  const shop = screen.getByRole('tab', { name: '상점' });
  expect(shop).toHaveAttribute('tabindex', '0');
  shop.focus();
  await user.keyboard('{ArrowRight}');
  const hats = screen.getByRole('tab', { name: '모자' });
  expect(hats).toHaveAttribute('aria-selected', 'true');
  expect(hats).toHaveFocus();
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('tab', { name: '내 물건' })).toHaveFocus();
  await user.keyboard('{ArrowLeft}');
  expect(screen.getByRole('tab', { name: '모자' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(shop).toHaveAttribute('tabindex', '-1');
});

// Value: protects=놓을 물건이 남았을 때 칸을 누르면 내 물건 탭으로 바꾸고 "놓기" 안내를 보인다(D14, D17); fails_when=onCell의 pick 분기나 탭 바꾸기가 빠지면; why_new=빈 물건 분기만 테스트됨; seam=none; no_claim=안내 문구 모양
it('놓을 물건이 남았으면 칸을 누를 때 내 물건 탭과 놓기 안내', async () => {
  const user = renderAt('/playground', {
    earnedRewards: ['item-yarn-pink'],
    seenRewards: ['item-yarn-pink'],
  });
  expect(screen.getByRole('tab', { name: '상점' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await user.click(
    within(yard()).getByRole('button', { name: '칸 2, 비어 있음' }),
  );
  expect(screen.getByRole('tab', { name: '내 물건' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(screen.getByText('놓을 물건의 “놓기”를 눌러요')).toBeInTheDocument();
});

// Value: protects=산 알림 "…을 샀어요 · 바로 놓기"는 3초 뒤 사라진다(D16); fails_when=타이머나 정리를 빼서 알림이 남으면; why_new=알림 타이머 테스트가 없음; seam=none; no_claim=사라지는 움직임
it('산 알림은 3초 뒤 사라진다', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  try {
    store.save({ version: 1, gold: 200, topics: {} });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ProgressProvider store={store}>
        <SettingsProvider store={createSettingsStore({ storage: null })}>
          <MemoryRouter initialEntries={['/playground']}>
            <AppRoutes />
          </MemoryRouter>
        </SettingsProvider>
      </ProgressProvider>,
    );
    await user.click(
      screen.getByRole('button', { name: '노랑 털실 공, 100골드' }),
    );
    await user.click(screen.getByRole('button', { name: '사기' }));
    expect(screen.getByText('노랑 털실 공을 샀어요')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText('노랑 털실 공을 샀어요')).not.toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

// Value: protects=놓기 모드에서 사기 시트를 열고 Esc를 누르면 시트만 닫히고 놓기 모드는 남는다(D23, 적대 리뷰); fails_when=문서 Esc 처리가 시트 여부를 안 보고 놓기를 끄면; why_new=시트와 놓기 모드가 함께인 Esc 테스트가 없음; seam=none; no_claim=포커스 되돌리기
it('놓기 모드에서 사기 시트의 Esc는 시트만 닫는다', async () => {
  const user = renderAt('/playground', {
    earnedRewards: ['item-yarn-pink'],
    seenRewards: ['item-yarn-pink'],
  });
  await user.click(screen.getByRole('tab', { name: '내 물건' }));
  await user.click(screen.getByRole('button', { name: '분홍 털실 공 놓기' }));
  await user.click(screen.getByRole('tab', { name: '상점' }));
  await user.click(
    screen.getByRole('button', { name: '노랑 털실 공, 100골드' }),
  );
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(within(yard()).getByRole('status')).toHaveTextContent(
    '어느 칸에 놓을까요?',
  );
});
