// 카테고리 목록 hook: 주제 파일 + 진행 → 카테고리 칸 표시값.
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { solvedSet } from '../lib/progress.ts';
import { stageProgress } from '../lib/stages.ts';
import { useProgress } from './useProgress.ts';
import type { LoadState } from './useQuizData.ts';
import { useTopicCategories } from './useTopicCategories.ts';

/** 카테고리 칸 하나의 표시값. */
export type CategoryCellView = {
  no: number;
  name: string;
  solvedCount: number;
  total: number;
  completed: boolean;
};

/** 카테고리 목록 상태와 동작. */
export type CategoryListView = {
  label: string;
  gold: number;
  state: LoadState<CategoryCellView[]>;
  retry: () => void;
  openCategory: (no: number) => void;
  goHome: () => void;
};

/** 카테고리 목록 hook(주소의 :topicId). */
export function useCategoryList(): CategoryListView {
  const navigate = useNavigate();
  const { topicId } = useParams();
  const { state: loaded, retry, topic } = useTopicCategories(topicId);
  const { progress } = useProgress();

  const state = useMemo<LoadState<CategoryCellView[]>>(() => {
    if (loaded.status !== 'ready') return loaded;
    const solved = solvedSet({ progress, topicId: loaded.data.topic.id });
    return {
      status: 'ready',
      data: loaded.data.categories.map((category) => ({
        no: category.no,
        name: category.name,
        ...stageProgress({ stage: category, solved }),
      })),
    };
  }, [loaded, progress]);

  return {
    label: topic?.label ?? '주제',
    gold: progress.gold,
    state,
    retry,
    // 목록에서 들어간 보드는 "← 목록"을 누르면 뒤로 돌아온다(기록이 쌓이지 않게).
    openCategory: (no) =>
      void navigate(`/topics/${topic?.id ?? ''}/categories/${no}`, {
        state: { fromList: true },
      }),
    goHome: () => void navigate('/'),
  };
}
