import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes, ProgressProvider, SettingsProvider } from '../App.tsx';
import { createProgressStore } from '../data/progressRepository.ts';
import { createSettingsStore } from '../data/settingsRepository.ts';
import * as repository from '../data/quizRepository.ts';
import { analytics } from '../lib/analyticsInstance.ts';
import type { QuizTopicFile } from '../types/quiz.ts';

vi.mock('../components/petScene.ts', () => ({
  createPetScene: () => {
    throw new Error('WebGL 없음(테스트)');
  },
}));

const NONSENSE: QuizTopicFile = {
  version: 1,
  topic: 'nonsense',
  items: [
    ...Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      question: `문제 ${i + 1}`,
      answer: `정답${i + 1}`,
      shareable: false,
    })),
    {
      id: '11',
      question: '지구가 제일 힘들었던 시기는?',
      answer: '고생대',
      hints: ['시대 이름이에요', '힘든 일을 겪다'],
      shareable: true,
    },
    { id: '12', question: '진짜 새는?', answer: '참새', shareable: false },
    {
      id: '13',
      question: '뽑으면 우는 식물은?',
      answer: '우엉',
      shareable: true,
    },
  ],
};

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(repository, 'fetchTopicFile').mockResolvedValue(NONSENSE);
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
  document.getElementById('q-data')?.remove();
});

function inlineData(item: object) {
  const script = document.createElement('script');
  script.type = 'application/json';
  script.id = 'q-data';
  script.textContent = JSON.stringify(item);
  document.head.append(script);
}

function renderAt(path: string) {
  // 실제 앱(BrowserRouter)처럼 창 주소에도 쿼리를 둔다.
  window.history.replaceState(null, '', path);
  const user = userEvent.setup();
  render(
    <ProgressProvider store={createProgressStore({ storage: null })}>
      <SettingsProvider store={createSettingsStore({ storage: null })}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </SettingsProvider>
    </ProgressProvider>,
  );
  return user;
}

async function answer(user: ReturnType<typeof userEvent.setup>, text: string) {
  const input = await screen.findByRole('textbox', { name: '정답 입력' });
  await user.clear(input);
  await user.type(input, `${text}{Enter}`);
}

describe('/q/:id 문제 하나 모드', () => {
  it('공유 링크: 배너 두 줄, 착지를 세고 주소창에서 쿼리를 지운다', async () => {
    const landed = vi.spyOn(analytics, 'landed');
    renderAt('/q/11/?s=1&from=%EC%A4%80%ED%98%81&h=1&r=s');
    expect(
      await screen.findByText('지구가 제일 힘들었던 시기는?'),
    ).toBeInTheDocument();
    expect(screen.getByText('📨 준혁이 낸 문제')).toBeInTheDocument();
    expect(screen.getByText('준혁은 힌트 1개로 맞힘')).toBeInTheDocument();
    expect(landed).toHaveBeenCalledWith('11');
    expect(window.location.search).toBe('');
  });

  it('문제에서 열 수 없는 h는 결과 줄을 보이지 않는다', async () => {
    // 13번은 문장 힌트가 없어 열 수 있는 단계가 1개뿐이다.
    renderAt('/q/13/?s=1&from=a&h=3&r=s');
    expect(await screen.findByText('📨 a가 낸 문제')).toBeInTheDocument();
    expect(screen.queryByText(/힌트 3개로/)).not.toBeInTheDocument();
  });

  it('공유 대상이 아니거나 없는 문제는 "쉬는 중"', async () => {
    renderAt('/q/12/');
    expect(
      await screen.findByRole('heading', { name: '이 문제는 쉬는 중이에요' }),
    ).toBeInTheDocument();
  });

  it('맞히면 결과 화면: 비교 문구와 내기·계속하기, 처음 공유는 닉네임 시트', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: share,
      configurable: true,
    });
    const shared = vi.spyOn(analytics, 'shared');
    const user = renderAt('/q/11/?s=1&from=%EB%AF%BC%EC%A7%80&h=2&r=s');
    await answer(user, '고생대');
    expect(
      await screen.findByRole('heading', { name: '정답! 고생대' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('민지보다 힌트를 2개 덜 썼어요. 다른 친구는 어떨까?'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: '친구한테 이 문제 내기' }),
    );
    const dialog = screen.getByRole('dialog', {
      name: '친구에게 뭐라고 보일까요?',
    });
    expect(dialog).toBeInTheDocument();
    await user.type(
      screen.getByRole('textbox', { name: /보내는 이름/ }),
      '준혁',
    );
    await user.click(
      screen.getByRole('button', { name: '이 이름으로 보내기' }),
    );

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const sent = share.mock.calls[0]![0] as { text: string; url: string };
    expect(sent.text).toBe(
      '🐰 이 문제 풀 수 있어? 지구가 제일 힘들었던 시기는?',
    );
    expect(sent.text).not.toContain('고생대');
    expect(sent.url).toContain('/q/11/?s=1&from=');
    expect(sent.url).toContain('&h=0&r=s');
    expect(shared).toHaveBeenCalledWith('11', 'post');
    expect(
      await screen.findByRole('button', { name: '또 내기' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '보내는 이름: 준혁 · 바꾸기' }),
    ).toBeInTheDocument();
  });

  it('공유 시트를 닫으면(AbortError) 세지 않는다', async () => {
    const abort = Object.assign(new Error('cancel'), { name: 'AbortError' });
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(abort),
      configurable: true,
    });
    const shared = vi.spyOn(analytics, 'shared');
    const user = renderAt('/q/11/');
    await screen.findByText('지구가 제일 힘들었던 시기는?');
    await user.click(
      screen.getByRole('button', { name: '친구한테 이 문제 내기' }),
    );
    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    expect(shared).not.toHaveBeenCalled();
  });

  it('첫 오답 뒤 "포기하고 정답 보기" → 확인 → 정답 공개', async () => {
    const user = renderAt('/q/11/');
    expect(
      await screen.findByText('지구가 제일 힘들었던 시기는?'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '포기하고 정답 보기' }),
    ).not.toBeInTheDocument();
    await answer(user, '신생대');
    await user.click(
      await screen.findByRole('button', { name: '포기하고 정답 보기' }),
    );
    await user.click(screen.getByRole('button', { name: '볼래요' }));
    expect(
      screen.getByRole('heading', { name: '정답은 "고생대"' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('이 문제, 다른 친구도 걸릴까?'),
    ).toBeInTheDocument();
  });

  it('#q-data가 있으면 전체 파일을 받기 전에 바로 그린다', async () => {
    vi.spyOn(repository, 'fetchTopicFile').mockReturnValue(
      new Promise(() => {}),
    );
    inlineData({
      id: '13',
      question: '뽑으면 우는 식물은?',
      answer: '우엉',
      shareable: true,
    });
    renderAt('/q/13/');
    expect(await screen.findByText('뽑으면 우는 식물은?')).toBeInTheDocument();
  });

  it('전체 파일을 못 받아도 #q-data로 풀 수 있다', async () => {
    vi.spyOn(repository, 'fetchTopicFile').mockRejectedValue(
      new Error('offline'),
    );
    inlineData({
      id: '13',
      question: '뽑으면 우는 식물은?',
      answer: '우엉',
      shareable: true,
    });
    const user = renderAt('/q/13/');
    await answer(user, '우엉');
    expect(
      await screen.findByRole('heading', { name: '정답! 우엉' }),
    ).toBeInTheDocument();
  });

  it('#q-data의 id가 주소와 다르면 쓰지 않는다', async () => {
    inlineData({
      id: '11',
      question: '다른 문제',
      answer: 'x',
      shareable: true,
    });
    renderAt('/q/13/');
    expect(await screen.findByText('뽑으면 우는 식물은?')).toBeInTheDocument();
    expect(screen.queryByText('다른 문제')).not.toBeInTheDocument();
  });

  it('주소로 바로 열면(s=1 없음) "친구가 낸 문제" 배너가 없다', async () => {
    renderAt('/q/11/');
    expect(await screen.findByText('지구가 제일 힘들었던 시기는?')).toBeInTheDocument();
    expect(screen.queryByText(/낸 문제/)).not.toBeInTheDocument();
  });
});
