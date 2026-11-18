import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes, ProgressProvider, SettingsProvider } from '../App.tsx';
import {
  createProgressStore,
  type ProgressStore,
} from '../data/progressRepository.ts';
import {
  createSettingsStore,
  type SettingsStore,
} from '../data/settingsRepository.ts';
import * as repository from '../data/quizRepository.ts';
import { AppError, ErrorCode } from '../errors/AppError.ts';
import { PEST_LINES } from '../lib/pest.ts';
import type { QuizManifest, QuizTopicFile } from '../types/quiz.ts';

const MANIFEST: QuizManifest = {
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
};

// 넌센스 12문제 → 2개 스테이지(10 + 2). 2단계: 고생대(힌트 2개), 참새.
const NONSENSE: QuizTopicFile = {
  version: 1,
  topic: 'nonsense',
  items: [
    ...Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      question: `문제 ${i + 1}`,
      answer: `정답${i + 1}`,
    })),
    {
      id: '11',
      question: '지구가 제일 힘들었던 시기는?',
      answer: '고생대',
      hints: ['시대 이름이에요', '힘든 일을 겪다'],
    },
    { id: '12', question: '진짜 새는?', answer: '참새' },
  ],
};

let store: ProgressStore;
let settingsStore: SettingsStore;

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  store = createProgressStore({ storage: null });
  settingsStore = createSettingsStore({ storage: null });
  vi.spyOn(repository, 'fetchManifest').mockResolvedValue(MANIFEST);
  vi.spyOn(repository, 'fetchTopicFile').mockResolvedValue(NONSENSE);
});
afterEach(() => {
  vi.restoreAllMocks();
});

// 지금 주소 기록 항목의 key(뒤로 가기로 돌아왔는지 확인용).
function LocationKey() {
  return <output data-testid="location-key">{useLocation().key}</output>;
}

function renderAt(path: string) {
  const user = userEvent.setup();
  render(
    <ProgressProvider store={store}>
      <SettingsProvider store={settingsStore}>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
          <LocationKey />
        </MemoryRouter>
      </SettingsProvider>
    </ProgressProvider>,
  );
  return user;
}

// 입력창을 비우고 답을 쓴 뒤 Enter로 제출한다.
async function typeAnswer(
  user: ReturnType<typeof userEvent.setup>,
  answer: string,
) {
  const input = screen.getByRole('textbox', { name: '정답 입력' });
  await user.clear(input);
  await user.type(input, `${answer}{Enter}`);
}

// 맞힌 뒤 확인 자리의 "다음"(0.4초 뒤에 눌린다)을 누른다.
async function clickAdvance(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  const button = screen.getByRole('button', { name });
  await waitFor(() => expect(button).toBeEnabled(), { timeout: 2000 });
  await user.click(button);
}

// 오답 흔들림이 끝나 다시 쓸 수 있을 때까지 기다린다.
async function waitAnswering() {
  await waitFor(
    () =>
      expect(
        screen.getByRole('textbox', { name: '정답 입력' }),
      ).not.toHaveAttribute('readonly'),
    { timeout: 2000 },
  );
}

describe('첫 화면', () => {
  it('골드 30, 넌센스에 들어갈 수 있다', async () => {
    const user = renderAt('/');
    expect(screen.getByLabelText('보유 골드 30')).toBeInTheDocument();

    const nonsense = await screen.findByRole('button', { name: /넌센스/ });
    expect(nonsense).toHaveTextContent('12문제 중 0문제 풂');

    await user.click(nonsense);
    expect(
      await screen.findByRole('button', { name: /^1단계/ }),
    ).toBeInTheDocument();
  });

  it('데이터를 받지 못하면 에러와 다시 시도', async () => {
    vi.mocked(repository.fetchManifest)
      .mockRejectedValueOnce(new AppError(ErrorCode.QUIZ_DATA_LOAD_FAILED))
      .mockResolvedValueOnce(MANIFEST);
    const user = renderAt('/');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('문제를 불러오지 못했어요');
    await user.click(within(alert).getByRole('button', { name: '다시 시도' }));
    expect(
      await screen.findByRole('button', { name: /넌센스/ }),
    ).toBeInTheDocument();
  });
});

describe('스테이지 목록 → 풀이 → 결과', () => {
  it('맞히기·힌트·다음 후 결과, 목록에 진행률이 반영되고 저장된다', async () => {
    const user = renderAt('/topics/nonsense');
    await user.click(
      await screen.findByRole('button', { name: /^2단계, 2문제 중 0문제/ }),
    );

    // 1번째: 고생대. 무료 힌트 → 5골드 힌트 → 맞힘(+5)
    expect(
      await screen.findByText('지구가 제일 힘들었던 시기는?'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '힌트 무료' }));
    expect(screen.getByText('시대 이름이에요')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: '정답 입력' }),
    ).toHaveAccessibleDescription('정답 3글자');
    await user.click(screen.getByRole('button', { name: '힌트 5골드' }));
    expect(screen.getByText("첫 글자는 '고'예요")).toBeInTheDocument();
    expect(screen.getByLabelText('보유 골드 25')).toBeInTheDocument();
    await typeAnswer(user, '고생대');
    expect(screen.getByText('정답! 고생대 · 골드 +5')).toBeInTheDocument();
    await clickAdvance(user, '다음 ›');

    // 2번째(마지막): 결과 보기
    expect(screen.getByText('진짜 새는?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '결과 보기' }));
    const result = screen.getByRole('region', { name: '스테이지 결과' });
    expect(result).toHaveTextContent('이번에 2문제 중 1문제를 맞혔어요.');
    expect(result).toHaveTextContent('얻은 골드 5');
    expect(result).toHaveTextContent('스테이지 진행 1/2');

    await user.click(within(result).getByRole('button', { name: '목록으로' }));
    expect(
      await screen.findByRole('button', { name: /^2단계, 2문제 중 1문제/ }),
    ).toBeInTheDocument();
    expect(store.load()).toMatchObject({
      gold: 30,
      topics: { nonsense: { solved: ['11'], hintsOpened: { '11': 2 } } },
    });
  });

  it('틀리면 "틀렸어요" 후 쓴 답은 남기고 다시 쓸 수 있다. 띄어쓰기·확인 버튼으로도 맞힌다', async () => {
    const user = renderAt('/topics/nonsense/stages/2');
    await screen.findByText('지구가 제일 힘들었던 시기는?');
    const confirm = screen.getByRole('button', { name: '확인' });
    expect(confirm).toBeDisabled();

    await typeAnswer(user, '고대생');
    expect(screen.getByText('틀렸어요')).toBeInTheDocument();
    await waitAnswering();
    expect(screen.getByRole('textbox', { name: '정답 입력' })).toHaveValue(
      '고대생',
    );

    await user.clear(screen.getByRole('textbox', { name: '정답 입력' }));
    await user.type(
      screen.getByRole('textbox', { name: '정답 입력' }),
      '고 생 대',
    );
    await user.click(confirm);
    expect(screen.getByText('정답! 고생대 · 골드 +10')).toBeInTheDocument();
  });

  it('맞히면 확인 자리가 "다음 ›"이 되고, 0.4초 뒤 Enter로도 다음 문제로 간다', async () => {
    const user = renderAt('/topics/nonsense/stages/2');
    await screen.findByText('지구가 제일 힘들었던 시기는?');
    await typeAnswer(user, '고생대');
    // 맞힌 직후: 확인 연타로 넘어가지 않게 잠시 막혀 있고, 힌트 버튼은 숨는다.
    expect(screen.getByRole('button', { name: '다음 ›' })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: /힌트/ }),
    ).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(
      screen.getByText('지구가 제일 힘들었던 시기는?'),
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '다음 ›' })).toBeEnabled(),
    );
    await user.keyboard('{Enter}');
    expect(screen.getByText('진짜 새는?')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '정답 입력' })).toHaveFocus();
  });

  it('상태 줄은 피드백만 읽어 준다(글자 수는 입력창 설명으로)', async () => {
    const user = renderAt('/topics/nonsense/stages/2');
    await screen.findByText('지구가 제일 힘들었던 시기는?');
    // 보이는 글자 수(숨긴 설명 문구와 둘)는 살아 있는 영역 안에서 보조 기술에 숨긴다.
    const shown = screen
      .getAllByText('정답 3글자')
      .find((el) => el.closest('[aria-live]'));
    expect(shown).toHaveAttribute('aria-hidden', 'true');
    await typeAnswer(user, '고대생');
    expect(screen.getByText('틀렸어요').closest('[aria-live]')).not.toBeNull();
  });

  it('한글 조합 중 Enter는 제출하지 않는다', async () => {
    renderAt('/topics/nonsense/stages/2');
    await screen.findByText('지구가 제일 힘들었던 시기는?');
    const input = screen.getByRole('textbox', { name: '정답 입력' });
    // fireEvent는 기본 동작(제출)이 막혔으면 false를 돌려준다.
    expect(fireEvent.keyDown(input, { key: 'Enter', isComposing: true })).toBe(
      false,
    );
    expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(true);
  });

  it('다시 들어오면 못 푼 문제부터, 완료 스테이지는 다시 풀기(골드 없음)', async () => {
    store.save({
      version: 1,
      gold: 30,
      topics: { nonsense: { solved: ['11', '12'], hintsOpened: {} } },
    });
    const user = renderAt('/topics/nonsense/stages/2');
    expect(await screen.findByText('2단계 · 1 / 2')).toBeInTheDocument();
    expect(screen.getByText('다시 풀기')).toBeInTheDocument();
    await typeAnswer(user, '고생대');
    expect(screen.getByText('정답! 고생대')).toBeInTheDocument();
    expect(screen.getByLabelText('보유 골드 30')).toBeInTheDocument();
  });
});

describe('스테이지 풀이에서 친구한테 내기', () => {
  afterEach(() => localStorage.removeItem('qp_nickname'));

  it('지금 문제를 /q/<id>/ 링크로 보내고, 맞힌 직후면 결과를 붙인다', async () => {
    // 결과(h, r)는 보낸 사람 이름이 있을 때만 붙는다(shareLink 규칙).
    localStorage.setItem('qp_nickname', '준혁');
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: share,
      configurable: true,
    });
    const user = renderAt('/topics/nonsense/stages/2');
    expect(
      await screen.findByText('지구가 제일 힘들었던 시기는?'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: '친구한테 이 문제 내기' }),
    );
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const before = share.mock.calls[0]![0] as { text: string; url: string };
    expect(before.url).toMatch(/\/q\/11\/\?s=1&from=[^&]+$/);
    expect(before.text).not.toContain('고생대');

    await typeAnswer(user, '고생대');
    await user.click(
      screen.getByRole('button', { name: '친구한테 이 문제 내기' }),
    );
    await waitFor(() => expect(share).toHaveBeenCalledTimes(2));
    const after = share.mock.calls[1]![0] as { url: string };
    expect(after.url).toMatch(/\/q\/11\/\?s=1/);
    expect(after.url).toContain('r=s');
  });
});

describe('이전·다음 이동', () => {
  it('4문제 푼 스테이지는 5 / 10부터, 이전으로 맞힌 문제의 정답을 보고, 쓰던 답은 남는다', async () => {
    store.save({
      version: 1,
      gold: 30,
      topics: {
        nonsense: { solved: ['1', '2', '3', '4'], hintsOpened: {} },
      },
    });
    const user = renderAt('/topics/nonsense/stages/1');
    expect(await screen.findByText('1단계 · 5 / 10')).toBeInTheDocument();
    expect(screen.getByText('문제 5')).toBeInTheDocument();
    const input = () => screen.getByRole('textbox', { name: '정답 입력' });
    await user.type(input(), '쓰다만');

    await user.click(screen.getByRole('button', { name: '이전 문제' }));
    expect(screen.getByText('1단계 · 4 / 10')).toBeInTheDocument();
    expect(screen.getByText('정답! 정답4')).toBeInTheDocument();
    expect(input()).toHaveValue('정답4');
    // 옮겨 온 맞힌 문제는 확인 자리의 "다음 ›"을 바로 누를 수 있다.
    expect(screen.getByRole('button', { name: '다음 ›' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '다음 문제' }));
    expect(input()).toHaveValue('쓰다만');
  });

  it('1번에서는 이전이 막히고, 10번에서는 결과 보기', async () => {
    const user = renderAt('/topics/nonsense/stages/1');
    await screen.findByText('1단계 · 1 / 10');
    expect(screen.getByRole('button', { name: '이전 문제' })).toBeDisabled();
    for (let i = 0; i < 9; i += 1) {
      await user.click(screen.getByRole('button', { name: '다음 문제' }));
    }
    expect(screen.getByText('1단계 · 10 / 10')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '결과 보기' }));
    expect(
      screen.getByRole('region', { name: '스테이지 결과' }),
    ).toHaveTextContent('이번에 10문제 중 0문제를 맞혔어요.');
  });
});

describe('주소 에러', () => {
  it('없는 스테이지 번호는 "없는 스테이지예요" + 목록으로', async () => {
    const user = renderAt('/topics/nonsense/stages/99');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('없는 스테이지예요.');
    await user.click(
      within(alert).getByRole('button', { name: '스테이지 목록' }),
    );
    expect(
      await screen.findByRole('button', { name: /^1단계/ }),
    ).toBeInTheDocument();
  });

  it('들어갈 수 없는 주제는 요청 없이 "없는 주제예요"', async () => {
    renderAt('/topics/mbti/stages/1');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '없는 주제예요.',
    );
    expect(repository.fetchTopicFile).not.toHaveBeenCalled();
  });
});

describe('리뷰 반영', () => {
  it('목록에서 들어간 풀이 화면의 "← 목록"은 뒤로 가기(기록이 쌓이지 않음)', async () => {
    const user = renderAt('/topics/nonsense');
    await screen.findByRole('button', { name: /^2단계/ });
    const listKey = screen.getByTestId('location-key').textContent;

    await user.click(screen.getByRole('button', { name: /^2단계/ }));
    await screen.findByText('지구가 제일 힘들었던 시기는?');
    await user.click(screen.getByRole('button', { name: '스테이지 목록' }));

    await screen.findByRole('button', { name: /^2단계/ });
    expect(screen.getByTestId('location-key').textContent).toBe(listKey);
  });

  it('첫 화면의 푼 문제 수는 전체 문제 수를 넘지 않는다', async () => {
    store.save({
      version: 1,
      gold: 30,
      topics: {
        nonsense: {
          solved: Array.from({ length: 13 }, (_, i) => String(i + 1)),
          hintsOpened: {},
        },
      },
    });
    renderAt('/');
    expect(
      await screen.findByRole('button', { name: /넌센스/ }),
    ).toHaveTextContent('12문제 중 12문제 풂');
  });
});

describe('방해꾼', () => {
  // 말풍선은 무작위 문구라 그 종류의 문구 중 하나인지만 본다.
  const oneOf = (lines: readonly string[]) => (text: string) =>
    lines.includes(text);

  it('풀이 중에 있고, 오답에 비웃고, 누르면 잡힘 문구. 그동안 풀이는 그대로 되고 결과 화면에는 없다', async () => {
    const user = renderAt('/topics/nonsense/stages/2');
    await screen.findByText('지구가 제일 힘들었던 시기는?');
    const pest = screen.getByRole('button', { name: '방해꾼 쫓아내기' });

    await typeAnswer(user, '고대생');
    expect(screen.getByText(oneOf(PEST_LINES.wrong))).toBeInTheDocument();

    await user.click(pest);
    expect(screen.getByText(oneOf(PEST_LINES.caught))).toBeInTheDocument();

    await waitAnswering();
    await typeAnswer(user, '고생대');
    expect(screen.getByText('정답! 고생대 · 골드 +10')).toBeInTheDocument();
    await clickAdvance(user, '다음 ›');
    await user.click(screen.getByRole('button', { name: '결과 보기' }));

    expect(
      screen.getByRole('region', { name: '스테이지 결과' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '방해꾼 쫓아내기' }),
    ).not.toBeInTheDocument();
  });
});
