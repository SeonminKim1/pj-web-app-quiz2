import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as repository from '../data/quizRepository.ts';
import { AppError, ErrorCode } from '../errors/AppError.ts';
import type { QuizManifest } from '../types/quiz.ts';
import { useManifest, useTopicFile } from './useQuizData.ts';

const MANIFEST: QuizManifest = { version: 1, topics: [] };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useManifest', () => {
  it('loading → ready', async () => {
    vi.spyOn(repository, 'fetchManifest').mockResolvedValue(MANIFEST);
    const { result } = renderHook(() => useManifest());

    expect(result.current.state.status).toBe('loading');
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'ready', data: MANIFEST }),
    );
  });

  it('실패하면 error, 다시 시도하면 다시 읽는다', async () => {
    const fetch = vi
      .spyOn(repository, 'fetchManifest')
      .mockRejectedValueOnce(new AppError(ErrorCode.QUIZ_DATA_LOAD_FAILED))
      .mockResolvedValueOnce(MANIFEST);
    const { result } = renderHook(() => useManifest());

    await waitFor(() => expect(result.current.state.status).toBe('error'));
    expect(result.current.state).toMatchObject({
      error: { code: ErrorCode.QUIZ_DATA_LOAD_FAILED.code },
    });

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('예상하지 못한 에러는 UNKNOWN_ERROR로 바꾼다', async () => {
    vi.spyOn(repository, 'fetchManifest').mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useManifest());
    await waitFor(() =>
      expect(result.current.state).toMatchObject({
        status: 'error',
        error: { code: ErrorCode.UNKNOWN_ERROR.code },
      }),
    );
  });

  it('화면을 떠나면 요청을 취소한다', () => {
    const fetch = vi
      .spyOn(repository, 'fetchManifest')
      .mockImplementation(() => new Promise(() => {}));
    const { unmount } = renderHook(() => useManifest());
    const signal = fetch.mock.calls[0]![0]!.signal!;

    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });
});

describe('useTopicFile', () => {
  it('들어갈 수 없는 주제(topicId 없음)는 요청 없이 TOPIC_NOT_FOUND', async () => {
    const fetch = vi.spyOn(repository, 'fetchTopicFile');
    const { result } = renderHook(() => useTopicFile(undefined));

    await waitFor(() =>
      expect(result.current.state).toMatchObject({
        status: 'error',
        error: { code: ErrorCode.TOPIC_NOT_FOUND.code },
      }),
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
