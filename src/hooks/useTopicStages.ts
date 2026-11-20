// 주소의 주제 id → 주제 설정 + 주제 파일 + 스테이지 목록. 스테이지 목록·풀이 화면이 같이 쓴다.
import { useMemo } from 'react';
import { AppError, ErrorCode } from '../errors/AppError.ts';
import { findStageTopic, type StageTopic } from '../lib/quizTopics.ts';
import { buildStages, type Stage } from '../lib/stages.ts';
import type { QuizItem } from '../types/quiz.ts';
import { useClaimRewards } from './useClaimRewards.ts';
import {
  useTopicFile,
  type LoadResult,
  type LoadState,
} from './useQuizData.ts';

/** 스테이지형 주제의 읽은 결과. */
export type TopicStages = {
  topic: StageTopic;
  items: readonly QuizItem[];
  stages: Stage[];
};

/** 들어갈 수 없는 주제면 요청 없이 TOPIC_NOT_FOUND. */
export function useTopicStages(
  topicId: string | undefined,
): LoadResult<TopicStages> & { topic: StageTopic | undefined } {
  const topic = findStageTopic(topicId);
  const { state: fileState, retry } = useTopicFile(topic?.id);
  const state = useMemo<LoadState<TopicStages>>(() => {
    if (fileState.status === 'loading') return fileState;
    if (fileState.status === 'error') return fileState;
    if (!topic) {
      return {
        status: 'error',
        error: new AppError(ErrorCode.TOPIC_NOT_FOUND),
      };
    }
    const items = fileState.data.items;
    return {
      status: 'ready',
      data: {
        topic,
        items,
        stages: buildStages({ items, stageSize: topic.round.stageSize }),
      },
    };
  }, [fileState, topic]);
  useClaimRewards(
    useMemo(
      () =>
        state.status === 'ready'
          ? { topic: state.data.topic, rounds: state.data.stages }
          : undefined,
      [state],
    ),
  );
  return { state, retry, topic };
}
