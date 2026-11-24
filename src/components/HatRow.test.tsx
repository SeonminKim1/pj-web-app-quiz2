import { render, screen, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { ProgressProvider } from '../App.tsx';
import { createProgressStore } from '../data/progressRepository.ts';
import * as repository from '../data/quizRepository.ts';
import { HatRow } from './HatRow.tsx';

beforeEach(() => {
  vi.spyOn(repository, 'fetchTopicFile').mockImplementation(
    async ({ topicId }) => ({ version: 1, topic: topicId, items: [] }),
  );
});

// Value: protects=받은 모자가 "없음" 바로 뒤에 먼저 나온다(design-review FINDING-001: 가진 모자를 찾으려고 스크롤하지 않게); fails_when=모자를 표 순서대로만 늘어놓아 MBTI 모자가 잠긴 모자 뒤에 묻히면; why_new=모자 순서를 보는 테스트가 없음; seam=none; no_claim=스크롤 위치
it('받은 모자를 "없음" 바로 뒤에 먼저 놓는다', () => {
  const store = createProgressStore({ storage: null });
  store.save({
    version: 1,
    gold: 30,
    topics: {},
    earnedRewards: ['hat-crown-sky', 'hat-straw-pink'],
  });
  render(
    <ProgressProvider store={store}>
      <HatRow animal="rabbit" />
    </ProgressProvider>,
  );
  const radios = within(
    screen.getByRole('radiogroup', { name: '모자' }),
  ).getAllByRole('radio');
  expect(
    radios
      .slice(0, 4)
      .map((radio) => radio.getAttribute('aria-label') ?? radio.textContent),
  ).toEqual(['없음', '분홍 밀짚모자', '하늘 왕관', '잠김, 1스테이지']);
});
