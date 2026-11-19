// 주제 파일 → 한 판 목록(주제 설정의 한 판 단위대로: 스테이지 또는 카테고리). 첫 화면·문제 하나 화면이 같이 쓴다.
import { useMemo } from 'react';
import { AppError, ErrorCode } from '../errors/AppError.ts';
import { buildCategories } from '../lib/categories.ts';
import { buildStages, type Stage } from '../lib/stages.ts';
import type { QuizItem, QuizTopic } from '../types/quiz.ts';
import { useTopicFile, type LoadState } from './useQuizData.ts';

/** 주제 파일과 한 판 목록. 카테고리 단위 주제면 카테고리가 한 판(이름 있음). */
export type TopicRounds = {
  items: readonly QuizItem[];
  rounds: (Stage & { name?: string })[];
};

/** topic이 없으면 요청 없이 TOPIC_NOT_FOUND. */
export function useTopicRounds(topic: QuizTopic | undefined): {
  state: LoadState<TopicRounds>;
  retry: () => void;
} {
  const { state: fileState, retry } = useTopicFile(topic?.id);
  const state = useMemo<LoadState<TopicRounds>>(() => {
    if (fileState.status !== 'ready') return fileState;
    if (!topic) {
      return {
        status: 'error',
        error: new AppError(ErrorCode.TOPIC_NOT_FOUND),
      };
    }
    const { items } = fileState.data;
    const rounds = topic.round.byCategory
      ? buildCategories({ items })
      : buildStages({ items, stageSize: topic.round.stageSize });
    return { status: 'ready', data: { items, rounds } };
  }, [fileState, topic]);
  return { state, retry };
}

/** 한 판의 주소 조각(스테이지 /stages, 카테고리 /categories). */
export function roundSegment(topic: QuizTopic): 'stages' | 'categories' {
  return topic.round.byCategory ? 'categories' : 'stages';
}

/** 화면에 보일 한 판 이름("스테이지 3", 카테고리면 "연애"). */
export function roundLabel(round: Stage & { name?: string }): string {
  return round.name ?? `스테이지 ${round.no}`;
}
