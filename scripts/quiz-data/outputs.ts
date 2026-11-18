// 생성 파일 내용 만들기(spec "생성 파일"): manifest와 앱이 읽는 주제 파일.
import {
  PLAYABLE_MIN_COUNT,
  QUIZ_DATA_VERSION,
  QUIZ_TOPICS,
  getQuizTopicFileName,
} from '../../src/lib/quizTopics.ts';
import type {
  QuizCategoryInfo,
  QuizItem,
  QuizManifest,
  QuizTopic,
  QuizTopicFile,
} from '../../src/types/quiz.ts';
import { validateQuizData, type Problem, type RawFiles } from './check.ts';

/** 생성 결과: manifest와 파일 이름 → 주제 파일. */
export type QuizOutputs = {
  manifest: QuizManifest;
  topicFiles: Record<string, QuizTopicFile>;
};

/**
 * 주제 파일을 검사하고, 통과하면 생성 파일 내용을 만든다. 위반이 있으면 quiz_data_invalid로 실패한다.
 * readProblems: 파일을 읽다 생긴 위반(깨진 JSON). 검사 위반과 함께 보고한다.
 */
export function buildQuizOutputs({
  files,
  readProblems = [],
}: {
  files: RawFiles;
  readProblems?: readonly Problem[];
}): QuizOutputs {
  validateQuizData({ files, readProblems });
  const topicFiles: Record<string, QuizTopicFile> = {};
  const topics = QUIZ_TOPICS.map((topic) => {
    const file = getQuizTopicFileName(topic.id);
    // 검사를 통과했으므로 QuizItem 배열이다.
    const raw = files[file] as QuizItem[];
    // 앱에는 shareable을 채워서 넘기고, 빌드 전용 필드(ogText·allowAnswerInCard)는 넣지 않는다.
    const items = raw.map(
      ({ ogText: _og, allowAnswerInCard: _allow, ...item }) => ({
        ...item,
        shareable: item.shareable === true,
      }),
    );
    topicFiles[file] = { version: QUIZ_DATA_VERSION, topic: topic.id, items };
    const categories = topic.round.byCategory
      ? summarizeCategories(items)
      : undefined;
    return {
      id: topic.id,
      label: topic.label,
      count: items.length,
      file,
      playable: isPlayable({
        topic,
        count: items.length,
        categoryCount: categories?.length ?? 0,
      }),
      ...(categories ? { categories } : {}),
    };
  });
  return { manifest: { version: QUIZ_DATA_VERSION, topics }, topicFiles };
}

/** 플레이할 수 없는 주제 경고(카테고리 단위가 아닌 주제가 30문제 미만). */
export function playableWarnings(manifest: QuizManifest): string[] {
  return manifest.topics
    .filter((topic) => !topic.playable)
    .map(
      (topic) =>
        `${topic.label}(${topic.id}) ${topic.count}문제: ${PLAYABLE_MIN_COUNT}문제 미만이라 앱에 나오지 않아요`,
    );
}

// 카테고리 단위 주제는 카테고리가 하나 이상 있어야 한다(검사도 막지만 한 번 더 방어).
// 카테고리마다 size문제는 검사가 보장한다. 그 밖의 주제는 30문제 이상.
function isPlayable({
  topic,
  count,
  categoryCount,
}: {
  topic: QuizTopic;
  count: number;
  categoryCount: number;
}): boolean {
  return topic.round.byCategory
    ? categoryCount > 0
    : count >= PLAYABLE_MIN_COUNT;
}

// 카테고리별 문제 수. 순서는 주제 파일에 처음 나온 순서.
function summarizeCategories(items: readonly QuizItem[]): QuizCategoryInfo[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const name = item.category ?? '';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => ({ name, count }));
}
