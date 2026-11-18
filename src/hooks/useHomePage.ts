// 첫 화면 hook: 주제 목록(manifest)과 보유 골드를 카드 표시값으로 바꾼다.
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { solvedSet } from '../lib/progress.ts';
import { isEnterableTopicId } from '../lib/quizTopics.ts';
import { useProgress } from './useProgress.ts';
import { useManifest, type LoadState } from './useQuizData.ts';
import { useTopicStages } from './useTopicStages.ts';

/** 주제 카드 하나의 표시값. */
export type TopicCardView = {
  id: string;
  label: string;
  /** 예: "546문제 중 12문제 풂". */
  detail: string;
  enterable: boolean;
};

/** 첫 화면 상태와 동작. */
export type HomePageView = {
  gold: number;
  state: LoadState<TopicCardView[]>;
  retry: () => void;
  openTopic: (id: string) => void;
  goHome: () => void;
  /** 이어서 풀 곳(넌센스 문제 파일을 받은 뒤에만). */
  next: ContinueView | undefined;
  openNext: () => void;
};

/** 첫 화면의 "이어서 풀기". */
export type ContinueView = {
  /** 못 푼 문제가 남은 첫 스테이지(다 풀었으면 undefined). */
  stageNo: number | undefined;
  stageCount: number;
  solved: number;
  total: number;
};

const MAIN_TOPIC = 'nonsense';

/** 첫 화면 hook. */
export function useHomePage(): HomePageView {
  const navigate = useNavigate();
  const { state: manifest, retry } = useManifest();
  const { progress } = useProgress();

  const state = useMemo<LoadState<TopicCardView[]>>(() => {
    if (manifest.status !== 'ready') return manifest;
    return {
      status: 'ready',
      data: manifest.data.topics
        .filter((info) => info.playable)
        .map((info) => {
          // 데이터에서 빠진 문제를 예전에 풀었어도 전체 수를 넘지 않게 한다.
          const solved = Math.min(
            solvedSet({ progress, topicId: info.id }).size,
            info.count,
          );
          return {
            id: info.id,
            label: info.label,
            detail: `${info.count}문제 중 ${solved}문제 풂`,
            enterable: isEnterableTopicId(info.id),
          };
        }),
    };
  }, [manifest, progress]);

  const { state: stages } = useTopicStages(MAIN_TOPIC);
  const next = useMemo<ContinueView | undefined>(() => {
    if (stages.status !== 'ready') return undefined;
    const solvedIds = solvedSet({ progress, topicId: MAIN_TOPIC });
    const { items, stages: list } = stages.data;
    const at = list.findIndex((stage) =>
      stage.items.some((item) => !solvedIds.has(item.id)),
    );
    return {
      stageNo: at === -1 ? undefined : at + 1,
      stageCount: list.length,
      solved: items.filter((item) => solvedIds.has(item.id)).length,
      total: items.length,
    };
  }, [stages, progress]);

  return {
    next,
    openNext: () =>
      void navigate(
        next?.stageNo
          ? `/topics/${MAIN_TOPIC}/stages/${next.stageNo}`
          : `/topics/${MAIN_TOPIC}`,
      ),
    gold: progress.gold,
    state,
    retry,
    openTopic: (id) => void navigate(`/topics/${id}`),
    goHome: () => void navigate('/'),
  };
}
