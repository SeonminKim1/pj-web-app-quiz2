import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
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
      shareable: true,
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

function renderAt(
  path: string,
  settings: SettingsStore = createSettingsStore({ storage: null }),
) {
  const user = userEvent.setup();
  render(
    <ProgressProvider store={store}>
      <SettingsProvider store={settings}>
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
    name: /^(에너지 방향|정보 인식|결정 방식|생활 양식)/,
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
    // Value: protects=MBTI 카테고리 목록(/topics/mbti) 머리 줄에도 ⚙ 설정이 있고 열린다; fails_when=MBTI 카테고리 목록 화면만 SettingsButton을 빠뜨리면; why_new=⚙ 머리 줄 테스트는 넌센스 화면만 봄; seam=none; no_claim=360px 배치
    await user.click(screen.getByRole('button', { name: '설정' }));
    expect(screen.getByRole('dialog', { name: '설정' })).toBeInTheDocument();
  });

  // Value: protects=설명 시트(aria-modal)에서 Tab이 시트 밖으로 나가지 않고, 밖에 포커스가 있어도 Esc로 닫힌다; fails_when=시트 전용 onKeyDown만 남거나 Tab 가두기가 빠지면; why_new=기존 테스트는 버튼으로 닫기만 봄; seam=none; no_claim=실제 스크린리더 동작
  // Value: protects=설명 시트 밖에 포커스가 있어도 Shift+Tab이 시트 안으로 돌아온다; fails_when=Shift 분기의 !sheet.contains(active)가 빠지면 뒤 화면으로 빠져나감; why_new=기존 테스트는 시트 안에서 앞으로 Tab만 봄; seam=none; no_claim=실제 스크린리더
  it('설명 시트: 포커스가 시트 밖이어도 Shift+Tab은 시트 안으로 돌아온다', async () => {
    const user = renderAt('/topics/mbti');
    await screen.findByRole('button', { name: /^일상/ });
    await user.click(screen.getByRole('button', { name: /MBTI가 뭐예요/ }));
    const dialog = screen.getByRole('dialog');
    (document.activeElement as HTMLElement | null)?.blur();
    expect(dialog).not.toContainElement(document.activeElement as HTMLElement);
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it('설명 시트: Tab은 시트 안에서 돌고, Esc로 닫혀 ⓘ 버튼으로 포커스가 돌아온다', async () => {
    const user = renderAt('/topics/mbti');
    await screen.findByRole('button', { name: /^일상/ });
    const open = screen.getByRole('button', { name: /MBTI가 뭐예요/ });
    await user.click(open);
    const done = screen.getByRole('button', { name: '알겠어요' });
    done.focus();
    await user.tab();
    expect(screen.getByRole('dialog')).toContainElement(
      document.activeElement as HTMLElement,
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(open).toHaveFocus();
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
    // 축 하나를 바꾸면 그 오답 문구는 사라진다.
    await user.click(
      within(screen.getByRole('group', { name: '에너지 방향' })).getByRole(
        'button',
        { name: /^I/ },
      ),
    );
    expect(screen.queryByText(/4개 중/)).not.toBeInTheDocument();
    expect(screen.getByText('축마다 한 글자씩 골라요')).toBeInTheDocument();

    await pick(user, 'ISTJ');
    await user.click(screen.getByRole('button', { name: '확인' }));
    expect(
      await screen.findByText('정답! ISTJ · 골드 +10'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('보유 골드 40')).toBeInTheDocument();
    expect(store.load().topics.mbti?.solved).toEqual(['1']);
  });

  // Value: protects=오답 뒤 힌트로 축이 고정되면 낸 적 없는 답의 오답 문구("4개 중 4개")를 보이지 않는다; fails_when=missedInput을 채점한 값이 아니라 원래 입력으로 기억하면; why_new=리뷰가 찾은 결함(힌트 후 오답 문구); seam=none; no_claim=흔들림 애니메이션
  it('오답 뒤 힌트로 축이 고정되면 그 오답 문구는 사라진다', async () => {
    const user = renderAt('/topics/mbti/categories/1');
    await screen.findByText('일상 상황 1');
    // 정답 ISTJ, ESTJ는 E만 틀렸다(4개 중 3개).
    await pick(user, 'ESTJ');
    await user.click(screen.getByRole('button', { name: '확인' }));
    expect(
      await screen.findByText('틀렸어요 · 4개 중 3개 맞았어요'),
    ).toBeInTheDocument();
    await waitFor(
      () =>
        expect(screen.getByRole('button', { name: '힌트 무료' })).toBeEnabled(),
      { timeout: 2000 },
    );
    await user.click(screen.getByRole('button', { name: '힌트 무료' }));
    expect(screen.queryByText(/4개 중/)).not.toBeInTheDocument();
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

  // Value: protects=스테이지 화면 공유 통계 키가 m<id>; fails_when=useShare가 analytics.shared에 shareKey 대신 id를 넘기면(MBTI 17이 넌센스 17로 집계); why_new=기존 테스트는 URL만 보고 통계 키는 보지 않음; seam=none(기존 analytics 스파이 관례); no_claim=timing 값
  it('공유 버튼은 MBTI 주소(/m/<id>/)로 보낸다', async () => {
    const { analytics } = await import('../lib/analyticsInstance.ts');
    const shared = vi.spyOn(analytics, 'shared');
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: share,
      configurable: true,
    });
    const user = renderAt('/topics/mbti/categories/2');
    await screen.findByText('연애 상황 1');
    await user.click(
      screen.getByRole('button', { name: '친구한테 이 문제 내기' }),
    );
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const sent = share.mock.calls[0]![0] as { text: string; url: string };
    expect(sent.url).toMatch(/\/m\/17\/\?s=1$/);
    expect(sent.text).not.toContain('ISTJ');
    await waitFor(() => expect(shared).toHaveBeenCalled());
    expect(shared.mock.calls[0]![0]).toBe('m17');
  });

  it('공유 주소(/m/<id>/)로 들어와 4축으로 풀고, 카테고리를 이어 푼다', async () => {
    const user = renderAt('/m/18/');
    expect(await screen.findByText('연애 상황 2')).toBeInTheDocument();
    await pick(user, 'ISFJ');
    await user.click(screen.getByRole('button', { name: '확인' }));
    expect(
      await screen.findByRole('heading', { name: /정답! ISFJ/ }),
    ).toBeInTheDocument();
    expect(store.load().topics.mbti?.solved).toEqual(['18']);

    await user.click(
      screen.getByRole('button', { name: '이 문제가 든 스테이지 계속하기' }),
    );
    expect(await screen.findByText(/연애 · 1 \/ 16/)).toBeInTheDocument();
  });

  // Value: protects=카테고리 풀이 화면의 ← 버튼 이름("카테고리 목록")과 목록으로 돌아가기; fails_when=useCategoryPlayPage가 listLabel이나 목록 주소를 잘못 넘기면(스테이지 목록 이름, /topics/mbti/stages로 감); why_new=기존에는 에러 화면의 버튼 이름만 봄; seam=none; no_claim=브라우저 뒤로 가기 기록
  it('← 카테고리 목록을 누르면 카테고리 목록으로 돌아간다', async () => {
    const user = renderAt('/topics/mbti/categories/1');
    await screen.findByText('일상 상황 1');
    await user.click(screen.getByRole('button', { name: '카테고리 목록' }));
    expect(
      await screen.findByRole('button', { name: /^연애, 16문제 중/ }),
    ).toBeInTheDocument();
  });

  // Value: protects=MBTI를 풀다 첫 화면에 오면 "이어서 풀기"가 MBTI의 못 푼 카테고리로 간다; fails_when=첫 화면이 넌센스만 이어 주거나 마지막 주제를 기억하지 않으면; why_new=사용자가 겪은 버그(MBTI 이어서 풀기 안 됨); seam=none; no_claim=실제 localStorage
  it('MBTI를 풀다 첫 화면에 오면 이어서 풀기가 MBTI 다음 카테고리로 간다', async () => {
    const settings = createSettingsStore({ storage: null });
    // 일상 16문제를 다 풀어 둔다.
    store.save({
      version: 1,
      gold: 30,
      topics: {
        mbti: {
          solved: Array.from({ length: 16 }, (_, i) => String(i + 1)),
          hintsOpened: {},
        },
      },
    });
    renderAt('/topics/mbti/categories/2', settings);
    await screen.findByText('연애 상황 1');
    cleanup();

    const user = renderAt('/', settings);
    const go = await screen.findByRole('button', {
      name: '이어서 풀기 · 연애',
    });
    expect(screen.getByText('MBTI · 연애 차례예요')).toBeInTheDocument();
    // Value: protects=MBTI(titles: false)를 이어서 풀 때 첫 화면 카드에 넌센스 칭호가 나오지 않는다; fails_when=HomePage가 next?.titles 확인 없이 아무 주제에나 titleFor를 그리면(16문제면 말장난 꿈나무); why_new=칭호 숨김을 보는 테스트가 없음; seam=none; no_claim=풀이 중 칭호 알림(MBTI 칭호 테스트가 봄)
    expect(screen.queryByText('말장난 꿈나무')).not.toBeInTheDocument();
    expect(screen.queryByText(/까지 \d+문제$/)).not.toBeInTheDocument();
    await user.click(go);
    expect(await screen.findByText(/연애 · 1 \/ 16/)).toBeInTheDocument();
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

// Value: protects=카테고리 판의 "다음 스테이지"가 /categories/<n+1>로 간다; fails_when=usePlayNavigation이 segment 대신 'stages'를 쓰면(→ /topics/mbti/stages/2 → 목록으로 튕김); why_new=기존 테스트는 카테고리 결과 화면·다음 판 이동을 거치지 않음; seam=none; no_claim=결과 화면 진행률 문구
describe('MBTI 카테고리 끝까지', () => {
  it('마지막 문제를 맞히고 다음 스테이지로 가면 다음 카테고리(연애)를 푼다', async () => {
    store.save({
      version: 1,
      gold: 30,
      topics: {
        mbti: {
          solved: Array.from({ length: 15 }, (_, i) => String(i + 1)),
          hintsOpened: {},
        },
      },
    });
    const user = renderAt('/topics/mbti/categories/1');
    expect(await screen.findByText(/일상 · 16 \/ 16/)).toBeInTheDocument();
    await pick(user, 'ENTJ');
    await user.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByText(/정답! ENTJ/)).toBeInTheDocument();
    // 진행 표시 옆 ›(결과 보기)는 맞힌 직후에도 바로 누를 수 있다.
    await user.click(screen.getByRole('button', { name: '결과 보기' }));
    await user.click(
      await screen.findByRole('button', { name: '다음 스테이지' }),
    );
    expect(await screen.findByText(/연애 · 1 \/ 16/)).toBeInTheDocument();
  });
});

// Value: protects=칭호가 없는 주제(titles:false)는 맞혀도 칭호 알림이 안 뜬다; fails_when=StagePlayPage가 useTitleUp에 enabled를 넘기지 않거나 useTitleUp이 enabled를 무시하면("새 칭호! 말장난 꿈나무"가 MBTI에 뜸); why_new=기존 MBTI 테스트는 10문제 문턱을 넘지 않음; seam=none; no_claim=넌센스 칭호 표시
describe('MBTI 칭호', () => {
  it('10문제째를 맞혀도 넌센스 칭호 알림을 띄우지 않는다', async () => {
    store.save({
      version: 1,
      gold: 30,
      topics: {
        mbti: {
          solved: Array.from({ length: 9 }, (_, i) => String(i + 1)),
          hintsOpened: {},
        },
      },
    });
    const user = renderAt('/topics/mbti/categories/1');
    expect(await screen.findByText(/일상 · 10 \/ 16/)).toBeInTheDocument();
    await pick(user, 'ESFP');
    await user.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByText(/정답! ESFP/)).toBeInTheDocument();
    expect(store.load().topics.mbti?.solved).toHaveLength(10);
    expect(screen.queryByText('새 칭호!')).not.toBeInTheDocument();
  });
});

// Value: protects=/m/ 공유 착지·공유 풀이 통계 키가 m<id>(넌센스 id와 안 겹침); fails_when=useQuestionPage·QuestionPage가 shareKey 대신 item.id/id를 넘기면(MBTI 18이 넌센스 18로 집계); why_new=shareKey 단위 테스트는 있지만 화면이 그 키를 쓰는지는 검사하지 않음; seam=none(기존 analytics 스파이 관례); no_claim=analytics 전송 형식
describe('MBTI 공유 통계 키', () => {
  it('/m/18/?s=1 착지와 풀이를 m18로 센다', async () => {
    const { analytics } = await import('../lib/analyticsInstance.ts');
    const landed = vi.spyOn(analytics, 'landed');
    const track = vi.spyOn(analytics, 'track');
    // 실제 앱처럼 창 주소에도 쿼리를 둔다(useQuestionPage는 location.search를 읽는다).
    window.history.replaceState(null, '', '/m/18/?s=1');
    const user = renderAt('/m/18/?s=1');
    expect(await screen.findByText('연애 상황 2')).toBeInTheDocument();
    expect(landed).toHaveBeenCalledWith('m18');
    await pick(user, 'ISFJ');
    await user.click(screen.getByRole('button', { name: '확인' }));
    await screen.findByRole('heading', { name: /정답! ISFJ/ });
    expect(track).toHaveBeenCalledWith('solve_from_share', 'm18');
    expect(landed).not.toHaveBeenCalledWith('18');
  });
});

// Value: protects=문제 하나 화면(/m/)의 오답: 맞은 축 수 문구와 "포기하고 정답 보기"; fails_when=QuestionPage가 matchedAxes 문구를 빼거나 submit이 4축 값(selection) 대신 비어 있는 경로로 missedOnce를 못 세면; why_new=기존 /m/ 테스트는 정답 경로만, 오답 문구는 스테이지 화면에서만 검사; seam=none; no_claim=포기 후 정답 공개 화면
describe('MBTI 문제 하나 오답', () => {
  it('틀리면 맞은 축 수를 보이고 포기 버튼이 열린다', async () => {
    const user = renderAt('/m/18/');
    expect(await screen.findByText('연애 상황 2')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '포기하고 정답 보기' }),
    ).not.toBeInTheDocument();
    // 정답 ISFJ, ESTP는 S 한 축만 맞다.
    await pick(user, 'ESTP');
    await user.click(screen.getByRole('button', { name: '확인' }));
    expect(
      await screen.findByText('틀렸어요 · 4개 중 1개 맞았어요'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: '포기하고 정답 보기' }),
    ).toBeInTheDocument();
  });
});
