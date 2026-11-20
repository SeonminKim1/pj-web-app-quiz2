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

// 머리 줄 진행 칸(문제마다 한 칸): 맞힌 칸과 지금 칸 표시.
function navCells() {
  const nav = screen.getByRole('group', { name: '문제 이동' });
  const cells = [...nav.querySelectorAll('[class*="cell"]')];
  return {
    count: cells.length,
    solved: cells.map((c) => c.hasAttribute('data-solved')),
    current: cells.findIndex((c) => c.hasAttribute('data-current')),
  };
}

describe('첫 화면', () => {
  it('골드 30, 넌센스에 들어갈 수 있다', async () => {
    const user = renderAt('/');
    expect(screen.getByLabelText('보유 골드 30')).toBeInTheDocument();

    const nonsense = await screen.findByRole('button', { name: /넌센스/ });
    expect(nonsense).toHaveTextContent('12문제 중 0문제 풂');

    await user.click(nonsense);
    expect(
      await screen.findByRole('button', { name: /^스테이지 1/ }),
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

describe('개인정보처리방침', () => {
  it('첫 화면 아래 링크로 들어가고, 처음으로 돌아온다', async () => {
    const user = renderAt('/');
    await user.click(screen.getByRole('link', { name: '개인정보처리방침' }));
    expect(
      screen.getByRole('heading', { level: 1, name: '개인정보처리방침' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '기기에만 저장하는 정보' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: '← 처음으로' }));
    expect(
      await screen.findByRole('button', { name: /넌센스/ }),
    ).toBeInTheDocument();
  });
});

describe('스테이지 목록 → 풀이 → 결과', () => {
  it('맞히기·힌트·다음 후 결과, 목록에 진행률이 반영되고 저장된다', async () => {
    const user = renderAt('/topics/nonsense');
    await user.click(
      await screen.findByRole('button', {
        name: /^스테이지 2, 2문제 중 0문제/,
      }),
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
    // 공개된 글자는 글자 칸으로 따로 보인다.
    expect(
      screen
        .getAllByRole('listitem')
        .some((li) => li.textContent?.includes('첫 글자는 고예요')),
    ).toBe(true);
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
      await screen.findByRole('button', {
        name: /^스테이지 2, 2문제 중 1문제/,
      }),
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
    // 주관식은 흔들리는 동안만 "틀렸어요"(4축 고르기처럼 남기지 않는다).
    expect(screen.queryByText('틀렸어요')).not.toBeInTheDocument();

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
    // Value: protects=이번에 맞힌 문제의 진행 칸이 바로 맞힘으로 바뀌고 다음 문제로 가도 남는다; fails_when=solvedMarks가 이번 판 earned를 보지 않거나 진행 칸에 solved를 넘기지 않으면; why_new=진행 칸은 FINDING-004에서 새로 생김(QuestionNav 단독 테스트는 연결을 못 본다); seam=none; no_claim=칸 색·크기(CSS)
    expect(navCells()).toEqual({
      count: 2,
      solved: [false, false],
      current: 0,
    });
    await typeAnswer(user, '고생대');
    expect(navCells().solved).toEqual([true, false]);
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
    expect(navCells()).toEqual({ count: 2, solved: [true, false], current: 1 });
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
    expect(await screen.findByText('스테이지 2 · 1 / 2')).toBeInTheDocument();
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
    expect(await screen.findByText('스테이지 1 · 5 / 10')).toBeInTheDocument();
    expect(screen.getByText('문제 5')).toBeInTheDocument();
    // Value: protects=들어오기 전에 푼 문제의 진행 칸이 처음부터 맞힘으로 보이고 머리 줄에 게임 이름이 있다; fails_when=solvedMarks가 solvedBefore를 빼먹거나 제목에서 주제 이름이 빠지면; why_new=진행 칸·게임 이름은 FINDING-004에서 새로 생김; seam=none; no_claim=칸 색(CSS)
    expect(navCells()).toEqual({
      count: 10,
      solved: [
        true,
        true,
        true,
        true,
        false,
        false,
        false,
        false,
        false,
        false,
      ],
      current: 4,
    });
    expect(document.querySelector('header')).toHaveTextContent(
      '넌센스스테이지 1',
    );
    const input = () => screen.getByRole('textbox', { name: '정답 입력' });
    await user.type(input(), '쓰다만');

    await user.click(screen.getByRole('button', { name: '이전 문제' }));
    expect(screen.getByText('스테이지 1 · 4 / 10')).toBeInTheDocument();
    expect(screen.getByText('정답! 정답4')).toBeInTheDocument();
    expect(input()).toHaveValue('정답4');
    // 옮겨 온 맞힌 문제는 확인 자리의 "다음 ›"을 바로 누를 수 있다.
    expect(screen.getByRole('button', { name: '다음 ›' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '다음 문제' }));
    expect(input()).toHaveValue('쓰다만');
  });

  it('1번에서는 이전이 막히고, 10번에서는 결과 보기', async () => {
    const user = renderAt('/topics/nonsense/stages/1');
    await screen.findByText('스테이지 1 · 1 / 10');
    expect(screen.getByRole('button', { name: '이전 문제' })).toBeDisabled();
    for (let i = 0; i < 9; i += 1) {
      await user.click(screen.getByRole('button', { name: '다음 문제' }));
    }
    expect(screen.getByText('스테이지 1 · 10 / 10')).toBeInTheDocument();
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
      await screen.findByRole('button', { name: /^스테이지 1/ }),
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
    await screen.findByRole('button', { name: /^스테이지 2/ });
    const listKey = screen.getByTestId('location-key').textContent;

    await user.click(screen.getByRole('button', { name: /^스테이지 2/ }));
    await screen.findByText('지구가 제일 힘들었던 시기는?');
    await user.click(screen.getByRole('button', { name: '스테이지 목록' }));

    await screen.findByRole('button', { name: /^스테이지 2/ });
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
    const user = renderAt('/');
    expect(
      await screen.findByRole('button', { name: /넌센스/ }),
    ).toHaveTextContent('12문제 중 12문제 풂');

    // Value: protects=다 풀면 이어서 풀기 카드가 "다 풀었어요"·"다시 풀어 보기"이고 누르면 스테이지 목록으로; fails_when=다 푼 뒤 stageNo 없음 분기가 깨져 없는 스테이지로 가거나 문구가 틀리면; why_new=다 푼 상태의 첫 화면은 테스트가 없었음; seam=none; no_claim=칭호 문구
    expect(screen.getByText('넌센스 다 풀었어요')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: '푼 문제' }),
    ).toHaveAttribute('aria-valuenow', '12');
    await user.click(screen.getByRole('button', { name: '다시 풀어 보기' }));
    expect(
      await screen.findByRole('button', {
        name: /^스테이지 1, 10문제 중 10문제 풂, 분홍 리본 받음/,
      }),
    ).toBeInTheDocument();
  });

  // Value: protects=⚙ 설정이 첫 화면 밖 모든 머리 줄(목록·풀이·문제 하나·개인정보)에 있다; fails_when=어느 화면 머리 줄에서 SettingsButton이 빠지면; why_new=⚙ 테스트는 첫 화면만 봄; seam=none; no_claim=360px 배치(design-review가 봄)
  it.each([
    ['스테이지 목록', '/topics/nonsense', /^스테이지 1/],
    [
      '스테이지 풀이',
      '/topics/nonsense/stages/2',
      '지구가 제일 힘들었던 시기는?',
    ],
    ['문제 하나', '/q/11/', '지구가 제일 힘들었던 시기는?'],
    ['개인정보처리방침', '/privacy', '개인정보처리방침'],
  ] as const)('%s 머리 줄에 ⚙ 설정이 있고 열린다', async (_, path, ready) => {
    // 문제 하나 모드는 공유 대상(shareable) 문제만 연다.
    vi.mocked(repository.fetchTopicFile).mockResolvedValue({
      ...NONSENSE,
      items: NONSENSE.items.map((item) => ({ ...item, shareable: true })),
    });
    const user = renderAt(path);
    if (typeof ready === 'string') {
      await screen.findAllByText(ready);
    } else {
      await screen.findByRole('button', { name: ready });
    }
    await user.click(screen.getByRole('button', { name: '설정' }));
    expect(screen.getByRole('dialog', { name: '설정' })).toBeInTheDocument();
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

// Value: protects=판을 다 푼 순간 결과 화면 제목 아래에 "새 보상!" 카드가 한 번 뜨고(D6), 본 것으로 기록돼 목록에서 "모은 스티커" 시트가 다시 뜨지 않는다; fails_when=풀이 화면이 맞힐 때 보상을 먼저 기록해 카드가 사라지거나(OV2), 본 표시를 안 남기면; why_new=보상 카드가 새로 생김; seam=none; no_claim=붙는 움직임·효과음
describe('스티커 보상', () => {
  it('스테이지를 다 풀면 새 보상 카드, 목록 칸은 받은 스티커', async () => {
    const user = renderAt('/topics/nonsense/stages/2');
    await screen.findByText('지구가 제일 힘들었던 시기는?');
    await typeAnswer(user, '고생대');
    await clickAdvance(user, '다음 ›');
    await typeAnswer(user, '참새');
    await clickAdvance(user, '결과 보기 ›');
    const result = screen.getByRole('region', { name: '스테이지 결과' });
    expect(result).toHaveTextContent(
      '새 보상!분홍 털실 공놀이터 물건스티커첩 2번 칸에 붙었어요',
    );
    // 처음엔 빈 읽기 칸에 다음 차례에 글을 넣어야 화면 읽기 프로그램이 읽는다.
    await waitFor(() =>
      expect(within(result).getByRole('status')).toHaveTextContent(
        '새 보상 분홍 털실 공',
      ),
    );
    expect(store.load()).toMatchObject({
      earnedRewards: ['item-yarn-pink'],
      seenRewards: ['item-yarn-pink'],
    });

    await user.click(within(result).getByRole('button', { name: '목록으로' }));
    expect(
      await screen.findByRole('button', {
        name: /^스테이지 2, 2문제 중 2문제 풂, 분홍 털실 공 받음/,
      }),
    ).toHaveAttribute('data-flash', 'true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('이미 받은 스테이지를 다시 풀면 보상 카드가 없다', async () => {
    store.save({
      version: 1,
      gold: 30,
      topics: { nonsense: { solved: ['11', '12'], hintsOpened: {} } },
      earnedRewards: ['item-yarn-pink'],
      seenRewards: ['item-yarn-pink'],
    });
    const user = renderAt('/topics/nonsense/stages/2');
    await screen.findByText('지구가 제일 힘들었던 시기는?');
    await typeAnswer(user, '고생대');
    await clickAdvance(user, '다음 ›');
    await typeAnswer(user, '참새');
    await clickAdvance(user, '결과 보기 ›');
    const result = screen.getByRole('region', { name: '스테이지 결과' });
    expect(result).toHaveTextContent('스테이지 완료!');
    expect(within(result).queryByText('새 보상!')).not.toBeInTheDocument();
  });

  // Value: protects=업데이트 전부터 푼 사용자는 목록을 처음 열 때 "그동안 모은 스티커" 시트를 한 번 보고, 확인하면 다시 안 뜬다(D8); fails_when=보상을 기록하지 않거나(시트 없음) 확인을 본 것으로 남기지 않으면(매번 뜸); why_new=새 시트; seam=none; no_claim=시트 그림 줄 모양
  it('예전에 푼 스테이지의 보상은 목록에서 한 번 모아 보여 준다', async () => {
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
    const user = renderAt('/topics/nonsense');
    const sheet = await screen.findByRole('dialog', {
      name: '그동안 모은 스티커 1장을 받았어요',
    });
    expect(within(sheet).getByRole('img')).toHaveAccessibleName('분홍 리본');
    await user.click(within(sheet).getByRole('button', { name: '확인' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(store.load()).toMatchObject({
      earnedRewards: ['hat-ribbon-pink'],
      seenRewards: ['hat-ribbon-pink'],
    });
    expect(
      screen.getByRole('button', { name: /^스테이지 1, .*분홍 리본 받음/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('스티커 1 / 2장')).toBeInTheDocument();
  });

  // Value: protects=판을 끝낸 순간 칭호가 올랐으면 결과 화면에 "새 칭호: 말장난 꿈나무" 줄이 보인다; fails_when=StageResult에 newTitle을 넘기지 않거나 칭호 비교를 풀이 전후가 아닌 값으로 하면; why_new=칭호 테스트는 풀이 화면 알림(TitleToast)만 봄; seam=none; no_claim=칭호가 안 바뀐 판에서 줄이 없는지
  it('판을 끝내며 칭호가 오르면 결과 화면에 새 칭호 줄', async () => {
    store.save({
      version: 1,
      gold: 30,
      topics: {
        nonsense: {
          solved: Array.from({ length: 9 }, (_, i) => String(i + 1)),
          hintsOpened: {},
        },
      },
    });
    const user = renderAt('/topics/nonsense/stages/1');
    await screen.findByText('문제 10');
    await typeAnswer(user, '정답10');
    await clickAdvance(user, '결과 보기 ›');
    const result = screen.getByRole('region', { name: '스테이지 결과' });
    expect(result).toHaveTextContent('새 칭호: 말장난 꿈나무');
  });

  // Value: protects=보상을 받은 판에 문제가 늘어 덜 푼 상태가 되면 목록 칸이 받은 스티커를 유지하며 "새 문제 N개"를 보이고 읽어 준다(D4); fails_when=earned를 지금 다 풀었는지만으로 계산하거나(스티커가 사라짐) 늘어난 문제 수 표시를 빠뜨리면; why_new=목록 칸 테스트는 다 푼 칸·처음 칸만 봄; seam=none; no_claim=칸 배치·색
  it('받은 판에 문제가 늘면 칸에 받은 스티커와 "새 문제 1개"', async () => {
    store.save({
      version: 1,
      gold: 30,
      topics: {
        nonsense: {
          solved: Array.from({ length: 9 }, (_, i) => String(i + 1)),
          hintsOpened: {},
        },
      },
      earnedRewards: ['hat-ribbon-pink'],
      seenRewards: ['hat-ribbon-pink'],
    });
    renderAt('/topics/nonsense');
    const cell = await screen.findByRole('button', { name: /^스테이지 1,/ });
    expect(cell).toHaveAccessibleName(
      expect.stringContaining('분홍 리본 받음'),
    );
    expect(cell).toHaveAccessibleName(expect.stringContaining('새 문제 1개'));
    expect(within(cell).getByText('새 문제 1개')).toBeInTheDocument();
  });

  // Value: protects=새 보상 칸 반짝임은 결과 화면에서 돌아온 첫 목록에서만 나고, 다시 목록에 오면 나지 않는다(D7); fails_when=StickerAlbum이 반짝임 값을 쓰고 지우지 않으면(목록에 올 때마다 반짝임); why_new=기존 테스트는 첫 반짝임만 봄; seam=none; no_claim=반짝임 애니메이션 모양
  it('새 보상 칸 반짝임은 한 번만', async () => {
    const user = renderAt('/topics/nonsense/stages/2');
    await screen.findByText('지구가 제일 힘들었던 시기는?');
    await typeAnswer(user, '고생대');
    await clickAdvance(user, '다음 ›');
    await typeAnswer(user, '참새');
    await clickAdvance(user, '결과 보기 ›');
    const result = screen.getByRole('region', { name: '스테이지 결과' });
    await user.click(within(result).getByRole('button', { name: '목록으로' }));
    const cellName = /^스테이지 2, 2문제 중 2문제 풂, 분홍 털실 공 받음/;
    expect(
      await screen.findByRole('button', { name: cellName }),
    ).toHaveAttribute('data-flash', 'true');

    await user.click(screen.getByRole('button', { name: /^스테이지 1,/ }));
    await screen.findByText('문제 1');
    await user.click(screen.getByRole('button', { name: /목록/ }));
    expect(
      await screen.findByRole('button', { name: cellName }),
    ).toHaveAttribute('data-flash', 'false');
  });
});

// Value: protects=목록을 거치지 않고 다음 스테이지로 가면 지난 판의 반짝임이 나중 목록에서 다시 나오지 않는다(D7, 리뷰 지적 rewardFlash.ts:3); fails_when=새 세션이 남은 반짝임을 지우지 않으면(다음 판을 하다 목록에 가면 지난 칸이 반짝임); why_new=기존 반짝임 테스트는 바로 목록으로 가는 길만 봄; seam=none; no_claim=CSS 애니메이션
describe('반짝임 정리', () => {
  it('다음 스테이지로 바로 가면 지난 판 칸은 반짝이지 않는다', async () => {
    store.save({
      version: 1,
      gold: 30,
      topics: {
        nonsense: {
          solved: Array.from({ length: 9 }, (_, i) => String(i + 1)),
          hintsOpened: {},
        },
      },
      earnedRewards: [],
      seenRewards: [],
    });
    const user = renderAt('/topics/nonsense/stages/1');
    await screen.findByText('문제 10');
    await typeAnswer(user, '정답10');
    await clickAdvance(user, '결과 보기 ›');
    const result = screen.getByRole('region', { name: '스테이지 결과' });
    expect(result).toHaveTextContent('분홍 리본');
    await user.click(
      within(result).getByRole('button', { name: '다음 스테이지' }),
    );
    await screen.findByText('지구가 제일 힘들었던 시기는?');
    await user.click(screen.getByRole('button', { name: '스테이지 목록' }));
    expect(
      await screen.findByRole('button', { name: /^스테이지 1,/ }),
    ).toHaveAttribute('data-flash', 'false');
  });
});

// Value: protects=넌센스 목록의 "모은 스티커" 시트는 넌센스 스티커만 보이고 다른 주제 스티커를 본 것으로 처리하지 않는다(리뷰 지적 useStageList.ts:30); fails_when=시트가 주제 구분 없이 안 본 보상을 모두 보이면; why_new=시트 테스트는 한 주제만 씀; seam=none; no_claim=MBTI 목록 쪽 시트(같은 필터)
describe('모은 스티커 시트의 주제', () => {
  it('다른 주제(MBTI) 스티커만 남았으면 넌센스 목록에 시트가 뜨지 않는다', async () => {
    store.save({
      version: 1,
      gold: 30,
      topics: {},
      earnedRewards: ['hat-straw-sky'],
      seenRewards: [],
    });
    renderAt('/topics/nonsense');
    await screen.findByRole('button', { name: /^스테이지 1,/ });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(store.load().seenRewards).toEqual([]);
  });
});
