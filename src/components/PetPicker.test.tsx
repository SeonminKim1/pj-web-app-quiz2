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

// ── Step 8에서 빠졌던 계획 테스트(D29, D23) ──

const NONSENSE_STAGE1 = {
  version: 1,
  topic: 'nonsense',
  items: Array.from({ length: 10 }, (_, i) => ({
    id: String(i + 1),
    question: `문제 ${i + 1}`,
    answer: '정답',
  })),
} as const;

function savedProgress(mbtiSolved: string[] = []) {
  const store = createProgressStore({ storage: null });
  store.save({
    version: 1,
    gold: 30,
    topics: {
      nonsense: {
        solved: Array.from({ length: 10 }, (_, i) => String(i + 1)),
        hintsOpened: {},
      },
      ...(mbtiSolved.length > 0
        ? { mbti: { solved: mbtiSolved, hintsOpened: {} } }
        : {}),
    },
  });
  return store;
}

// Value: protects=시트를 열지 않은 첫 화면은 이어 풀 주제 파일만 받는다(D29: 첫 화면이 매번 다른 주제를 받지 않게); fails_when=첫 화면이 모든 주제를 읽도록 바뀌면; why_new=요청 수를 보는 테스트가 없음; seam=none; no_claim=실제 네트워크·캐시(fetch 모킹)
it('시트를 열지 않으면 첫 화면은 이어 풀 주제 파일만 받는다', async () => {
  const fetch = vi
    .spyOn(repository, 'fetchTopicFile')
    .mockResolvedValue(NONSENSE_STAGE1);
  renderHome(savedProgress());
  await screen.findByText('넌센스 다 풀었어요');
  expect(fetch.mock.calls.map(([{ topicId }]) => topicId)).toEqual([
    'nonsense',
  ]);
});

// Value: protects=시트를 열면 MBTI 카테고리를 다 푼 모자도 풀린다(D29, 넌센스만 보던 테스트의 빈 곳); fails_when=시트가 다른 주제를 읽지 않거나 카테고리 보상을 기록하지 않으면; why_new=기존 테스트는 MBTI 파일이 비어 있었음; seam=none; no_claim=실제 MBTI 데이터 형식(최소 픽스처)
it('시트를 열면 다 푼 MBTI 카테고리의 모자도 풀린다', async () => {
  vi.spyOn(repository, 'fetchTopicFile').mockImplementation(
    async ({ topicId }) =>
      topicId === 'mbti'
        ? {
            version: 1,
            topic: 'mbti',
            items: [
              {
                id: 'm1',
                question: '일상 문제',
                answer: 'ENFP',
                category: '일상',
              },
            ],
          }
        : NONSENSE_STAGE1,
  );
  const user = renderHome(savedProgress(['m1']));
  const sheet = await openSheet(user);
  // 일상 카테고리 보상 = 하늘 밀짚모자.
  expect(
    await within(sheet).findByRole('radio', { name: '하늘 밀짚모자' }),
  ).toBeInTheDocument();
});

// Value: protects=다른 주제 파일을 못 받아도 시트는 그대로 쓸 수 있다(D29 실패 모드); fails_when=주제 읽기 실패가 시트를 에러 화면으로 바꾸거나 기록된 모자까지 잠그면; why_new=실패 경로 테스트가 없음; seam=none; no_claim=오프라인 감지 UI(없음)
it('다른 주제 파일을 못 받아도 시트에서 모자를 씌울 수 있다', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(repository, 'fetchTopicFile').mockImplementation(
    async ({ topicId }) => {
      if (topicId === 'mbti') throw new Error('offline');
      return NONSENSE_STAGE1;
    },
  );
  const store = savedProgress();
  const user = renderHome(store);
  const sheet = await openSheet(user);
  await user.click(
    await within(sheet).findByRole('radio', { name: '분홍 리본' }),
  );
  expect(store.load().equipped).toEqual({ rabbit: 'hat-ribbon-pink' });
  expect(
    within(sheet).getByRole('radio', { name: '잠김, MBTI 일상' }),
  ).toBeInTheDocument();
});

// Value: protects=Tab이 시트 밖(뒤의 ⚙ 등)으로 나가지 않는다(D23 useModalSheet); fails_when=시트가 useModalSheet를 쓰지 않거나 Tab 순환이 깨지면; why_new=Esc만 보던 테스트의 빈 곳; seam=none; no_claim=스크린 리더 가상 커서
it('Tab은 시트 안에서만 돈다', async () => {
  mockTopicFiles();
  const user = renderHome();
  const sheet = await openSheet(user);
  within(sheet).getByRole('button', { name: '다 골랐어요' }).focus();
  await user.tab();
  expect(sheet).toContainElement(document.activeElement as HTMLElement);
  await user.tab({ shift: true });
  expect(document.activeElement).toBe(
    within(sheet).getByRole('button', { name: '다 골랐어요' }),
  );
});

// Value: protects=시트를 닫으면 포커스가 첫 화면 방해꾼 버튼으로 돌아온다(useModalSheet 계약, red-team p1#1); fails_when=HomePage가 닫을 때 포커스를 되돌리지 않아 body로 떨어지면; why_new=닫은 뒤 포커스를 보는 테스트가 없음; seam=none; no_claim=스크린 리더 가상 커서
it('시트를 닫으면 포커스가 방해꾼 버튼으로 돌아온다', async () => {
  mockTopicFiles();
  const user = renderHome();
  await openSheet(user);
  await user.keyboard('{Escape}');
  expect(
    screen.getByRole('button', { name: '방해꾼 바꾸기, 지금 토끼' }),
  ).toHaveFocus();
});
