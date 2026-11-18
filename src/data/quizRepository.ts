// 퀴즈 데이터 받기(public/data/quiz/). 실패·형식 불일치를 AppError로 바꾼다(spec "에러 케이스(공통)").
import { AppError, ErrorCode } from '../errors/AppError.ts';
import { QUIZ_DATA_VERSION, getQuizTopicFileName } from '../lib/quizTopics.ts';
import type {
  QuizManifest,
  QuizTopicFile,
  QuizTopicId,
} from '../types/quiz.ts';
import { isRecord } from '../lib/records.ts';

/** fetch와 같은 모양(테스트에서 가짜를 넣는다). */
export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

const DATA_PATH = `${import.meta.env.BASE_URL}data/quiz/`;

/** manifest를 받는다. 받지 못하면 QUIZ_DATA_LOAD_FAILED, 버전이 다르면 QUIZ_DATA_VERSION_MISMATCH. */
export async function fetchManifest({
  signal,
  fetchFn = fetch,
}: {
  signal?: AbortSignal;
  fetchFn?: FetchFn;
} = {}): Promise<QuizManifest> {
  const value = await fetchJson({
    url: `${DATA_PATH}manifest.json`,
    signal,
    fetchFn,
  });
  if (!isRecord(value) || !Array.isArray(value.topics)) {
    throw new AppError(ErrorCode.QUIZ_DATA_LOAD_FAILED);
  }
  ensureVersion(value.version);
  return value as QuizManifest;
}

/** 주제 파일을 받는다. 다른 주제의 파일이거나 형식이 틀리면 QUIZ_DATA_LOAD_FAILED. */
export async function fetchTopicFile({
  topicId,
  signal,
  fetchFn = fetch,
}: {
  topicId: QuizTopicId;
  signal?: AbortSignal;
  fetchFn?: FetchFn;
}): Promise<QuizTopicFile> {
  const value = await fetchJson({
    url: `${DATA_PATH}${getQuizTopicFileName(topicId)}`,
    signal,
    fetchFn,
  });
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new AppError(ErrorCode.QUIZ_DATA_LOAD_FAILED);
  }
  ensureVersion(value.version);
  if (value.topic !== topicId) {
    throw new AppError(ErrorCode.QUIZ_DATA_LOAD_FAILED);
  }
  return value as QuizTopicFile;
}

/**
 * 요청이 화면을 떠나 취소된 것인지(이 경우 화면에 에러를 보이지 않는다).
 * 실행 환경마다 DOMException 클래스가 다를 수 있어 instanceof 대신 이름으로 본다.
 */
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  );
}

// JSON을 받는다. 네트워크 실패·HTTP 오류·JSON 아님은 QUIZ_DATA_LOAD_FAILED. 취소는 그대로 던진다.
async function fetchJson({
  url,
  signal,
  fetchFn,
}: {
  url: string;
  signal: AbortSignal | undefined;
  fetchFn: FetchFn;
}): Promise<unknown> {
  try {
    const response = await fetchFn(url, { signal });
    if (!response.ok) {
      throw new AppError(ErrorCode.QUIZ_DATA_LOAD_FAILED, {
        cause: `HTTP ${response.status}`,
      });
    }
    return await response.json();
  } catch (error) {
    if (signal?.aborted || isAbortError(error) || error instanceof AppError) {
      throw error;
    }
    throw new AppError(ErrorCode.QUIZ_DATA_LOAD_FAILED, { cause: error });
  }
}

function ensureVersion(version: unknown): void {
  if (version !== QUIZ_DATA_VERSION) {
    throw new AppError(ErrorCode.QUIZ_DATA_VERSION_MISMATCH);
  }
}
