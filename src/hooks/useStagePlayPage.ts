// 풀이 화면 hook: 주소의 주제·스테이지(또는 카테고리) 확인과 화면 이동. 실제 풀이는 useStageSession.
// 카테고리 단위 주제는 카테고리 하나를 스테이지 하나처럼 푼다(같은 풀이 화면).
import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { AppError, ErrorCode } from '../errors/AppError.ts';
import { parseCategoryNo } from '../lib/categories.ts';
import { parseStageNo, type Stage } from '../lib/stages.ts';
import type { QuizTopic } from '../types/quiz.ts';
import type { LoadResult, LoadState } from './useQuizData.ts';
import { useTopicCategories } from './useTopicCategories.ts';
import { useTopicStages } from './useTopicStages.ts';

/** 풀이를 시작할 수 있는 값. */
export type StagePlayTarget = {
  topic: QuizTopic;
  /** 풀 판(카테고리 단위 주제면 그 카테고리). */
  stage: Stage;
  /** 머리 줄 진행 표시 앞부분("3단계", "연애"). */
  stageLabel: string;
  stageCount: number;
  /** 주제 전체 문제 수(칭호). */
  itemCount: number;
};

/** 풀이 화면 상태와 화면 이동. */
export type StagePlayPageView = {
  state: LoadState<StagePlayTarget>;
  /** 목록으로 가는 버튼 이름("스테이지 목록", "카테고리 목록"). */
  listLabel: string;
  retry: () => void;
  goHome: () => void;
  goList: () => void;
  goNextStage: () => void;
};

/** 스테이지형 주제 풀이(주소의 :topicId, :stageNo). 없는 스테이지면 STAGE_NOT_FOUND. */
export function useStagePlayPage(): StagePlayPageView {
  const { topicId, stageNo } = useParams();
  const { state: loaded, retry, topic } = useTopicStages(topicId);
  const state = useMemo<LoadState<StagePlayTarget>>(() => {
    if (loaded.status !== 'ready') return loaded;
    const { stages } = loaded.data;
    const no = parseStageNo({ value: stageNo, stageCount: stages.length });
    const stage = no === undefined ? undefined : stages[no - 1];
    if (!stage) {
      return {
        status: 'error',
        error: new AppError(ErrorCode.STAGE_NOT_FOUND),
      };
    }
    return {
      status: 'ready',
      data: {
        topic: loaded.data.topic,
        stage,
        stageLabel: `${stage.no}단계`,
        stageCount: stages.length,
        itemCount: loaded.data.items.length,
      },
    };
  }, [loaded, stageNo]);
  return usePlayNavigation({
    load: { state, retry },
    topicId: topic?.id,
    segment: 'stages',
    listLabel: '스테이지 목록',
  });
}

/** 카테고리 단위 주제 풀이(주소의 :topicId, :categoryNo). 없는 카테고리면 CATEGORY_NOT_FOUND. */
export function useCategoryPlayPage(): StagePlayPageView {
  const { topicId, categoryNo } = useParams();
  const { state: loaded, retry, topic } = useTopicCategories(topicId);
  const state = useMemo<LoadState<StagePlayTarget>>(() => {
    if (loaded.status !== 'ready') return loaded;
    const { categories } = loaded.data;
    const no = parseCategoryNo({
      value: categoryNo,
      categoryCount: categories.length,
    });
    const category = no === undefined ? undefined : categories[no - 1];
    if (!category) {
      return {
        status: 'error',
        error: new AppError(ErrorCode.CATEGORY_NOT_FOUND),
      };
    }
    return {
      status: 'ready',
      data: {
        topic: loaded.data.topic,
        stage: category,
        stageLabel: category.name,
        stageCount: categories.length,
        itemCount: categories.reduce((sum, each) => sum + each.items.length, 0),
      },
    };
  }, [loaded, categoryNo]);
  return usePlayNavigation({
    load: { state, retry },
    topicId: topic?.id,
    segment: 'categories',
    listLabel: '카테고리 목록',
  });
}

// 목록·다음 판 이동(스테이지·카테고리 같은 규칙).
function usePlayNavigation({
  load: { state, retry },
  topicId,
  segment,
  listLabel,
}: {
  load: LoadResult<StagePlayTarget>;
  topicId: string | undefined;
  segment: 'stages' | 'categories';
  listLabel: string;
}): StagePlayPageView {
  const navigate = useNavigate();
  const location = useLocation();
  const fromList = (location.state as { fromList?: boolean } | null)?.fromList;
  const listPath = topicId ? `/topics/${topicId}` : '/';
  return {
    state,
    listLabel,
    retry,
    goHome: () => void navigate('/'),
    // 목록에서 왔으면 뒤로(기록을 쌓지 않음), 주소로 바로 왔으면 목록으로 바꿔 넣는다.
    goList: () =>
      void (fromList ? navigate(-1) : navigate(listPath, { replace: true })),
    goNextStage: () => {
      if (state.status !== 'ready') return;
      void navigate(`${listPath}/${segment}/${state.data.stage.no + 1}`, {
        replace: true,
        state: location.state,
      });
    },
  };
}
