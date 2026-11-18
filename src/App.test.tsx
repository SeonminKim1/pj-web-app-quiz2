import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import * as repository from './data/quizRepository.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

// 앱이 import·렌더링되고 첫 화면 제목이 보이는지 확인하는 스모크 테스트(데이터 요청은 가짜).
describe('App', () => {
  it('첫 화면이 렌더링된다', async () => {
    vi.spyOn(repository, 'fetchManifest').mockResolvedValue({
      version: 1,
      topics: [],
    });
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole('list')).toBeInTheDocument();
  });
});
