// 풀이 화면 hook: 주소의 주제·스테이지 확인과 화면 이동. 실제 풀이는 useStageSession.
import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { AppError, ErrorCode } from '../errors/AppError.ts';
import type { StageTopic } from '../lib/quizTopics.ts';
import { parseStageNo, type Stage } from '../lib/stages.ts';
import type { LoadState } from './useQuizData.ts';
import { useTopicStages } from './useTopicStages.ts';

/** 풀이를 시작할 수 있는 값. */
export type StagePlayTarget = {
  topic: StageTopic;
  stage: Stage;
  stageCount: number;
  /** 주제 전체 문제 수(칭호). */
  itemCount: number;
};

/** 풀이 화면 상태와 화면 이동. */
export type StagePlayPageView = {
  state: LoadState<StagePlayTarget>;
  retry: () => void;
  goHome: () => void;
  goList: () => void;
  goNextStage: () => void;
};

/** 풀이 화면 hook(주소의 :topicId, :stageNo). 없는 스테이지면 STAGE_NOT_FOUND. */
export function useStagePlayPage(): StagePlayPageView {
  const navigate = useNavigate();
  const location = useLocation();
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
        stageCount: stages.length,
        itemCount: loaded.data.items.length,
      },
    };
  }, [loaded, stageNo]);

  const fromList = (location.state as { fromList?: boolean } | null)?.fromList;
  const listPath = topic ? `/topics/${topic.id}` : '/';
  return {
    state,
    retry,
    goHome: () => void navigate('/'),
    // 목록에서 왔으면 뒤로(기록을 쌓지 않음), 주소로 바로 왔으면 목록으로 바꿔 넣는다.
    goList: () =>
      void (fromList ? navigate(-1) : navigate(listPath, { replace: true })),
    goNextStage: () => {
      if (state.status !== 'ready') return;
      void navigate(`${listPath}/stages/${state.data.stage.no + 1}`, {
        replace: true,
        state: location.state,
      });
    },
  };
}
