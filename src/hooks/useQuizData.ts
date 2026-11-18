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

/** 여러 주제 파일을 읽은 결과. 일부 주제만 실패하면 나머지는 쓰고 실패한 주제를 알려 준다. */
export type TopicFilesResult = {
  files: Partial<Record<QuizTopicId, QuizTopicFile>>;
  /** 읽지 못한 주제(네트워크·파일 없음 등). */
  failed: QuizTopicId[];
};

/**
 * 여러 주제 파일을 한꺼번에 읽는다. 주제마다 따로 성공·실패를 정해, 한 주제가 실패해도 나머지는 쓴다.
 * 모두 실패했거나 새 버전(QUIZ_DATA_VERSION_MISMATCH)이면 error. 빈 목록이면 요청 없이 빈 결과.
 */
export function useTopicFiles(
  topicIds: readonly QuizTopicId[],
): LoadResult<TopicFilesResult> {
  // 배열이 렌더마다 새로 만들어져도 같은 목록이면 다시 읽지 않게 문자열 키로 바꾼다.
  const key = topicIds.join(',');
  return useLoad(
    useCallback(
      async (signal: AbortSignal) => {
        const ids = key === '' ? [] : (key.split(',') as QuizTopicId[]);
        const settled = await Promise.allSettled(
          ids.map((topicId) => fetchTopicFile({ topicId, signal })),
        );
        const result: TopicFilesResult = { files: {}, failed: [] };
        settled.forEach((outcome, index) => {
          const topicId = ids[index]!;
          if (outcome.status === 'fulfilled') {
            result.files[topicId] = outcome.value;
            return;
          }
          const error: unknown = outcome.reason;
          // 새 버전이 배포됐으면 일부만 보여 주지 않고 새로고침하게 한다. 취소는 그대로 넘긴다.
          if (
            isAbortError(error) ||
            (isAppError(error) &&
              error.code === ErrorCode.QUIZ_DATA_VERSION_MISMATCH.code)
          ) {
            throw error;
          }
          result.failed.push(topicId);
        });
        if (ids.length > 0 && result.failed.length === ids.length) {
          throw new AppError(ErrorCode.QUIZ_DATA_LOAD_FAILED);
        }
        return result;
      },
      [key],
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
