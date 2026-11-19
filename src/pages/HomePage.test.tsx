import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppRoutes, ProgressProvider, SettingsProvider } from '../App.tsx';
import { createProgressStore } from '../data/progressRepository.ts';
import { createSettingsStore } from '../data/settingsRepository.ts';
import * as repository from '../data/quizRepository.ts';
import { AppError, ErrorCode } from '../errors/AppError.ts';

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(repository, 'fetchManifest').mockResolvedValue({
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
  });
  vi.spyOn(repository, 'fetchTopicFile').mockResolvedValue({
    version: 1,
    topic: 'nonsense',
    items: Array.from({ length: 12 }, (_, i) => ({
      id: String(i + 1),
      question: `문제 ${i + 1}`,
      answer: `정답${i + 1}`,
    })),
  });
});
afterEach(() => vi.restoreAllMocks());

it('첫 화면의 주 행동은 "스테이지 1부터 시작하기"이고 누르면 스테이지 1 풀이로 간다', async () => {
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
  expect(
    await screen.findByText('넌센스 12문제, 스테이지 2개'),
  ).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: '푼 문제' })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  await user.click(
    screen.getByRole('button', { name: '스테이지 1부터 시작하기' }),
  );
  expect(await screen.findByText('문제 1')).toBeInTheDocument();
});

// Value: protects=⚙ 설정에서 효과음·배경음악을 켜고 끄고, Esc로 닫으면 ⚙로 포커스가 돌아온다; fails_when=설정 시트가 토글을 잃거나 닫힐 때 포커스를 놓치면; why_new=첫 화면 토글을 설정으로 옮김; seam=none; no_claim=실제 소리 재생
it('⚙ 설정 시트에서 효과음·배경음악을 켜고, Esc로 닫는다', async () => {
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
  const gear = await screen.findByRole('button', { name: '설정' });
  expect(
    screen.queryByRole('button', { name: '효과음·진동' }),
  ).not.toBeInTheDocument();
  await user.click(gear);
  const sound = screen.getByRole('button', { name: '효과음·진동' });
  expect(sound).toHaveAttribute('aria-pressed', 'false');
  await user.click(sound);
  expect(sound).toHaveAttribute('aria-pressed', 'true');
  await user.click(screen.getByRole('button', { name: '배경음악' }));
  expect(screen.getByRole('button', { name: '배경음악' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(gear).toHaveFocus();
});

// Value: protects=기억한 주제가 지금 없는 주제면 넌센스로 이어 풀고, 못 푼 첫 스테이지로 간다; fails_when=continueTopic의 넌센스 대체가 빠져 이어서 풀기 카드가 사라지거나 엉뚱한 스테이지로 가면; why_new=기존 테스트는 처음 시작·MBTI 기억만 봄; seam=none; no_claim=실제 localStorage
it('기억한 주제가 없어진 주제면 넌센스로 이어서 풀고, 못 푼 스테이지로 간다', async () => {
  const user = userEvent.setup();
  const settings = createSettingsStore({ storage: null });
  settings.save({ version: 1, pet: 'rabbit', lastTopic: 'gone' });
  const progress = createProgressStore({ storage: null });
  progress.save({
    version: 1,
    gold: 30,
    topics: {
      nonsense: {
        solved: Array.from({ length: 10 }, (_, i) => String(i + 1)),
        hintsOpened: {},
      },
    },
  });
  render(
    <ProgressProvider store={progress}>
      <SettingsProvider store={settings}>
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      </SettingsProvider>
    </ProgressProvider>,
  );
  expect(
    await screen.findByText('넌센스 · 스테이지 2 차례예요'),
  ).toBeInTheDocument();
  // Value: protects=넌센스(titles: true)를 이어서 풀 때 첫 화면 카드에 맞힌 수에 맞는 칭호와 다음 칭호까지 남은 수가 보인다; fails_when=HomePage의 칭호 줄이 빠지거나 titleFor에 다른 수를 넘기면; why_new=첫 화면 칭호를 보는 테스트가 없음; seam=none; no_claim=칭호 경계값(titles.test가 봄)
  expect(screen.getByText('말장난 꿈나무')).toBeInTheDocument();
  expect(screen.getByText('웃음 사냥꾼까지 20문제')).toBeInTheDocument();
  await user.click(
    screen.getByRole('button', { name: '이어서 풀기 · 스테이지 2' }),
  );
  expect(await screen.findByText('문제 11')).toBeInTheDocument();
});

// Value: protects=⚙ 설정 시트 바깥(어두운 배경)을 누르면 닫히고 ⚙로 포커스가 돌아오며, 시트 안을 누르면 안 닫힌다; fails_when=배경 onClick이 빠지거나 시트의 stopPropagation이 빠져 안을 눌러도 닫히면; why_new=기존 테스트는 Esc로 닫기만 봄; seam=none; no_claim=실제 터치 제스처·애니메이션
it('⚙ 설정 시트는 바깥을 누르면 닫히고, 안을 누르면 그대로다', async () => {
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
  const gear = await screen.findByRole('button', { name: '설정' });
  await user.click(gear);
  const dialog = screen.getByRole('dialog', { name: '설정' });
  await user.click(screen.getByRole('heading', { name: '설정' }));
  expect(dialog).toBeInTheDocument();
  await user.click(dialog.parentElement!);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(gear).toHaveFocus();
});

// Value: protects=이어서 풀 주제의 문제 파일을 못 받으면 카드 자리에 "다시 시도"가 보이고 누르면 카드가 돌아온다; fails_when=useHomePage가 문제 파일 에러를 버려 카드가 말없이 사라지면(리뷰 지적); why_new=첫 화면은 매니페스트 에러만 테스트함; seam=none; no_claim=실제 네트워크 끊김
it('이어서 풀 문제 파일을 못 받으면 다시 시도로 카드를 되살린다', async () => {
  const user = userEvent.setup();
  vi.mocked(repository.fetchTopicFile).mockRejectedValueOnce(
    new AppError(ErrorCode.QUIZ_DATA_LOAD_FAILED),
  );
  render(
    <ProgressProvider store={createProgressStore({ storage: null })}>
      <SettingsProvider store={createSettingsStore({ storage: null })}>
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      </SettingsProvider>
    </ProgressProvider>,
  );
  await user.click(await screen.findByRole('button', { name: '다시 시도' }));
  expect(
    await screen.findByRole('button', { name: '스테이지 1부터 시작하기' }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: '다시 시도' }),
  ).not.toBeInTheDocument();
});
