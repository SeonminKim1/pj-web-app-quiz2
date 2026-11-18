import { describe, expect, it } from 'vitest';
import { ErrorCode } from '../errors/AppError.ts';
import {
  fetchManifest,
  fetchTopicFile,
  isAbortError,
  type FetchFn,
} from './quizRepository.ts';

// URL → 응답을 돌려주는 가짜 fetch. 받은 URL을 기록한다.
function fakeFetch(
  routes: Record<string, { status?: number; body: unknown }>,
): FetchFn & { calls: string[] } {
  const calls: string[] = [];
  const fn = (async (url: string) => {
    calls.push(url);
    const route = routes[url];
    if (!route) return new Response('not found', { status: 404 });
    const body =
      typeof route.body === 'string' ? route.body : JSON.stringify(route.body);
    return new Response(body, { status: route.status ?? 200 });
  }) as FetchFn & { calls: string[] };
  fn.calls = calls;
  return fn;
}

const MANIFEST = {
  version: 1,
  topics: [
    {
      id: 'nonsense',
      label: '넌센스',
      count: 1,
      file: 'nonsense.json',
      playable: true,
    },
  ],
};
const NONSENSE = {
  version: 1,
  topic: 'nonsense',
  items: [{ id: '1', question: 'q', answer: 'a' }],
};

describe('fetchManifest', () => {
  it('/data/quiz/manifest.json을 받는다', async () => {
    const fetchFn = fakeFetch({
      '/data/quiz/manifest.json': { body: MANIFEST },
    });
    await expect(fetchManifest({ fetchFn })).resolves.toEqual(MANIFEST);
    expect(fetchFn.calls).toEqual(['/data/quiz/manifest.json']);
  });

  it('HTTP 오류·네트워크 실패·JSON 아님은 QUIZ_DATA_LOAD_FAILED', async () => {
    const notFound = fakeFetch({});
    await expect(fetchManifest({ fetchFn: notFound })).rejects.toMatchObject({
      code: ErrorCode.QUIZ_DATA_LOAD_FAILED.code,
    });
    const offline: FetchFn = () =>
      Promise.reject(new TypeError('Failed to fetch'));
    await expect(fetchManifest({ fetchFn: offline })).rejects.toMatchObject({
      code: ErrorCode.QUIZ_DATA_LOAD_FAILED.code,
    });
    const html = fakeFetch({ '/data/quiz/manifest.json': { body: '<html>' } });
    await expect(fetchManifest({ fetchFn: html })).rejects.toMatchObject({
      code: ErrorCode.QUIZ_DATA_LOAD_FAILED.code,
    });
  });

  it('버전이 다르면 QUIZ_DATA_VERSION_MISMATCH', async () => {
    const fetchFn = fakeFetch({
      '/data/quiz/manifest.json': { body: { ...MANIFEST, version: 2 } },
    });
    await expect(fetchManifest({ fetchFn })).rejects.toMatchObject({
      code: ErrorCode.QUIZ_DATA_VERSION_MISMATCH.code,
    });
  });

  it('취소는 AbortError 그대로 던진다(화면에 에러를 보이지 않기 위해)', async () => {
    const controller = new AbortController();
    controller.abort();
    const aborting: FetchFn = (_url, init) =>
      Promise.reject(
        init?.signal?.reason ?? new DOMException('aborted', 'AbortError'),
      );
    const error = await fetchManifest({
      fetchFn: aborting,
      signal: controller.signal,
    }).catch((e: unknown) => e);
    expect(isAbortError(error)).toBe(true);
  });
});

describe('fetchTopicFile', () => {
  it('주제 파일을 받는다', async () => {
    const fetchFn = fakeFetch({
      '/data/quiz/nonsense.json': { body: NONSENSE },
    });
    await expect(
      fetchTopicFile({ topicId: 'nonsense', fetchFn }),
    ).resolves.toEqual(NONSENSE);
  });

  it('다른 주제의 파일이거나 items가 없으면 QUIZ_DATA_LOAD_FAILED', async () => {
    const wrongTopic = fakeFetch({
      '/data/quiz/nonsense.json': { body: { ...NONSENSE, topic: 'mbti' } },
    });
    await expect(
      fetchTopicFile({ topicId: 'nonsense', fetchFn: wrongTopic }),
    ).rejects.toMatchObject({ code: ErrorCode.QUIZ_DATA_LOAD_FAILED.code });
    const noItems = fakeFetch({
      '/data/quiz/nonsense.json': { body: { version: 1, topic: 'nonsense' } },
    });
    await expect(
      fetchTopicFile({ topicId: 'nonsense', fetchFn: noItems }),
    ).rejects.toMatchObject({ code: ErrorCode.QUIZ_DATA_LOAD_FAILED.code });
  });
});
