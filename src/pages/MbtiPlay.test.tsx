import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes, ProgressProvider, SettingsProvider } from '../App.tsx';
import {
  createProgressStore,
  type ProgressStore,
} from '../data/progressRepository.ts';
import { createSettingsStore } from '../data/settingsRepository.ts';
import * as repository from '../data/quizRepository.ts';
import type { QuizManifest, QuizTopicFile } from '../types/quiz.ts';

const TYPES = [
  'ISTJ',
  'ISFJ',
  'INFJ',
  'INTJ',
  'ISTP',
  'ISFP',
  'INFP',
  'INTP',
  'ESTP',
  'ESFP',
  'ENFP',
  'ENTP',
  'ESTJ',
  'ESFJ',
  'ENFJ',
  'ENTJ',
];

// 카테고리 2개(일상, 연애) × 16유형.
const MBTI: QuizTopicFile = {
  version: 1,
  topic: 'mbti',
  items: ['일상', '연애'].flatMap((category, c) =>
    TYPES.map((answer, i) => ({
      id: String(c * 16 + i + 1),
      question: `${category} 상황 ${i + 1}`,
      answer,
      category,
      shareable: false,
    })),
  ),
};

const MANIFEST: QuizManifest = {
  version: 1,
  topics: [
    {
      id: 'mbti',
      label: 'MBTI',
      count: 32,
      file: 'mbti.json',
      playable: true,
      categories: [
        { name: '일상', count: 16 },
        { name: '연애', count: 16 },
      ],
    },
  ],
};

let store: ProgressStore;

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  store = createProgressStore({ storage: null });
  vi.spyOn(repository, 'fetchManifest').mockResolvedValue(MANIFEST);
  vi.spyOn(repository, 'fetchTopicFile').mockResolvedValue(MBTI);
});
afterEach(() => {
  vi.restoreAllMocks();
});

function renderAt(path: string) {
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

// 축 4개를 차례로 누른다(공개된 축은 건너뜀).
async function pick(user: ReturnType<typeof userEvent.setup>, type: string) {
  const groups = screen.getAllByRole('group', {
    name: /에너지 방향|인식|판단|생활 양식/,
  });
  for (const [index, letter] of [...type].entries()) {
    const button = within(groups[index]!).getByRole('button', {
      name: new RegExp(`^${letter}`),
    });
    if (!button.hasAttribute('disabled')) await user.click(button);
  }
}

describe('MBTI 카테고리 목록', () => {
  it('카테고리마다 진행률을 보이고, ⓘ로 MBTI 설명을 연다', async () => {
    const user = renderAt('/topics/mbti');
    const daily = await screen.findByRole('button', {
      name: '일상, 16문제 중 0문제 맞힘',
    });
    expect(daily).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /MBTI가 뭐예요/ }));
    const dialog = screen.getByRole('dialog', { name: 'MBTI가 뭐예요?' });
    expect(dialog).toHaveTextContent('외향');
    await user.click(within(dialog).getByRole('button', { name: '알겠어요' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('MBTI 풀이(카테고리 = 스테이지)', () => {
  it('4축을 골라 확인: 틀리면 맞은 축 수, 맞히면 골드 +10', async () => {
    const user = renderAt('/topics/mbti/categories/1');
    await screen.findByText('일상 상황 1');
    expect(screen.getByText(/일상 · 1 \/ 16/)).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: '확인' });
    expect(confirm).toBeDisabled();

    // 정답 ISTJ, ESFJ는 S·J 두 축이 맞다.
    await pick(user, 'ESFJ');
    await user.click(confirm);
    expect(
      await screen.findByText('틀렸어요 · 4개 중 2개 맞았어요'),
    ).toBeInTheDocument();
    // 흔들림이 끝나도 고른 값을 바꾸기 전까지 남는다.
    await waitFor(
      () =>
        expect(
          within(screen.getByRole('group', { name: '에너지 방향' })).getByRole(
            'button',
            { name: /^I/ },
          ),
        ).toBeEnabled(),
      { timeout: 2000 },
    );
    expect(
      screen.getByText('틀렸어요 · 4개 중 2개 맞았어요'),
    ).toBeInTheDocument();

    await pick(user, 'ISTJ');
    await user.click(screen.getByRole('button', { name: '확인' }));
    expect(
      await screen.findByText('정답! ISTJ · 골드 +10'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('보유 골드 40')).toBeInTheDocument();
    expect(store.load().topics.mbti?.solved).toEqual(['1']);
  });

  it('힌트를 열면 앞 축이 정답으로 고정된다', async () => {
    const user = renderAt('/topics/mbti/categories/1');
    await screen.findByText('일상 상황 1');
    await user.click(screen.getByRole('button', { name: '힌트 무료' }));
    expect(
      within(screen.getByRole('region', { name: '힌트' })).getByRole(
        'listitem',
      ),
    ).toHaveTextContent('E/I 축은 I 내향');

    const energy = screen.getByRole('group', {
      name: '에너지 방향, 힌트로 고정',
    });
    expect(within(energy).getByRole('button', { name: /^I/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(energy).getByRole('button', { name: /^E/ })).toBeDisabled();

    await pick(user, 'ISTJ');
    await user.click(screen.getByRole('button', { name: '확인' }));
    // 힌트를 연 문제는 +5.
    expect(await screen.findByText('정답! ISTJ · 골드 +5')).toBeInTheDocument();
  });

  it('공유 주소가 없는 주제는 공유 버튼을 숨기고, 칭호도 없다', async () => {
    renderAt('/topics/mbti/categories/2');
    await screen.findByText('연애 상황 1');
    expect(
      screen.queryByRole('button', { name: '친구한테 이 문제 내기' }),
    ).not.toBeInTheDocument();
  });

  it('없는 카테고리 번호는 "없는 카테고리예요"', async () => {
    renderAt('/topics/mbti/categories/9');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '없는 카테고리예요.',
    );
    expect(
      screen.getByRole('button', { name: '카테고리 목록' }),
    ).toBeInTheDocument();
  });
});
