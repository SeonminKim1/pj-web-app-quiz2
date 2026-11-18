// 스테이지 목록 hook: 주제 파일 + 진행 → 스테이지 칸 표시값.
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { solvedSet } from '../lib/progress.ts';
import { stageProgress } from '../lib/stages.ts';
import { useProgress } from './useProgress.ts';
import type { LoadState } from './useQuizData.ts';
import { useTopicStages } from './useTopicStages.ts';

/** 스테이지 칸 하나의 표시값. */
export type StageCellView = {
  no: number;
  solvedCount: number;
  total: number;
  completed: boolean;
};

/** 스테이지 목록 상태와 동작. */
export type StageListView = {
  label: string;
  gold: number;
  state: LoadState<StageCellView[]>;
  retry: () => void;
  openStage: (no: number) => void;
  goHome: () => void;
};

/** 스테이지 목록 hook(주소의 :topicId). */
export function useStageList(): StageListView {
  const navigate = useNavigate();
  const { topicId } = useParams();
  const { state: loaded, retry, topic } = useTopicStages(topicId);
  const { progress } = useProgress();

  const state = useMemo<LoadState<StageCellView[]>>(() => {
    if (loaded.status !== 'ready') return loaded;
    const solved = solvedSet({ progress, topicId: loaded.data.topic.id });
    return {
      status: 'ready',
      data: loaded.data.stages.map((stage) => ({
        no: stage.no,
        ...stageProgress({ stage, solved }),
      })),
    };
  }, [loaded, progress]);

  return {
    label: topic?.label ?? '주제',
    gold: progress.gold,
    state,
    retry,
    // 목록에서 들어간 풀이 화면은 "목록"을 누르면 뒤로 돌아온다(기록이 쌓이지 않게).
    openStage: (no) =>
      void navigate(`/topics/${topic?.id ?? ''}/stages/${no}`, {
        state: { fromList: true },
      }),
    goHome: () => void navigate('/'),
  };
}
