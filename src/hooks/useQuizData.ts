// 퀴즈 데이터 읽기 hook. 화면을 떠나면 요청을 취소하고, 실패하면 다시 시도할 수 있다.
import { useCallback, useEffect, useState } from 'react';
import {
  fetchManifest,
  fetchTopicFile,
  isAbortError,
} from '../data/quizRepository.ts';
import { AppError, ErrorCode, isAppError } from '../errors/AppError.ts';
import type {
  QuizManifest,
  QuizTopicFile,
  QuizTopicId,
} from '../types/quiz.ts';

/** 읽기 상태. */
export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: AppError };

/** 읽기 결과와 다시 시도. */
export type LoadResult<T> = {
  state: LoadState<T>;
  retry: () => void;
};

/** manifest를 읽는다. */
export function useManifest(): LoadResult<QuizManifest> {
  return useLoad(useCallback((signal) => fetchManifest({ signal }), []));
}

/** 주제 파일을 읽는다. topicId가 없으면(들어갈 수 없는 주제) 요청 없이 TOPIC_NOT_FOUND. */
export function useTopicFile(
  topicId: QuizTopicId | undefined,
): LoadResult<QuizTopicFile> {
  return useLoad(
    useCallback(
      (signal: AbortSignal) =>
        topicId
          ? fetchTopicFile({ topicId, signal })
          : Promise.reject(new AppError(ErrorCode.TOPIC_NOT_FOUND)),
      [topicId],
    ),
  );
}

// load가 바뀌거나 retry를 부르면 다시 읽는다. 취소된 요청의 결과로는 상태를 바꾸지 않는다.
// 결과를 (load, attempt)와 함께 두고, 지금 요청의 결과가 아니면 loading으로 본다(effect에서 바로 setState하지 않음).
function useLoad<T>(load: (signal: AbortSignal) => Promise<T>): LoadResult<T> {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<
    { load: typeof load; attempt: number; state: LoadState<T> } | undefined
  >(undefined);

  useEffect(() => {
    const controller = new AbortController();
    const settle = (state: LoadState<T>): void => {
      if (!controller.signal.aborted) setResult({ load, attempt, state });
    };
    load(controller.signal).then(
      (data) => settle({ status: 'ready', data }),
      (error: unknown) => {
        if (isAbortError(error)) return;
        settle({
          status: 'error',
          error: isAppError(error)
            ? error
            : new AppError(ErrorCode.UNKNOWN_ERROR, { cause: error }),
        });
      },
    );
    return () => controller.abort();
  }, [load, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  const state: LoadState<T> =
    result && result.load === load && result.attempt === attempt
      ? result.state
      : { status: 'loading' };
  return { state, retry };
}
