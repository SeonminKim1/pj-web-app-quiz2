// 주소의 주제 id → 카테고리 단위 주제 설정 + 주제 파일 + 카테고리 목록(useTopicStages와 짝).
import { useMemo } from 'react';
import { AppError, ErrorCode } from '../errors/AppError.ts';
import { buildCategories, type Category } from '../lib/categories.ts';
import { findCategoryTopic, type CategoryTopic } from '../lib/quizTopics.ts';
import {
  useTopicFile,
  type LoadResult,
  type LoadState,
} from './useQuizData.ts';

/** 카테고리 단위 주제의 읽은 결과. */
export type TopicCategories = {
  topic: CategoryTopic;
  categories: Category[];
};

/** 들어갈 수 없는 주제(또는 스테이지형 주제)면 요청 없이 TOPIC_NOT_FOUND. */
export function useTopicCategories(
  topicId: string | undefined,
): LoadResult<TopicCategories> & { topic: CategoryTopic | undefined } {
  const topic = findCategoryTopic(topicId);
  const { state: fileState, retry } = useTopicFile(topic?.id);
  const state = useMemo<LoadState<TopicCategories>>(() => {
    if (fileState.status !== 'ready') return fileState;
    if (!topic) {
      return {
        status: 'error',
        error: new AppError(ErrorCode.TOPIC_NOT_FOUND),
      };
    }
    return {
      status: 'ready',
      data: {
        topic,
        categories: buildCategories({ items: fileState.data.items }),
      },
    };
  }, [fileState, topic]);
  return { state, retry, topic };
}
