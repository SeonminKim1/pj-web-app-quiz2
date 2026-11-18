// 첫 화면 hook: 주제 목록(manifest)과 보유 골드를 카드 표시값으로 바꾼다.
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { solvedSet } from '../lib/progress.ts';
import { isEnterableTopicId } from '../lib/quizTopics.ts';
import { useProgress } from './useProgress.ts';
import { useManifest, type LoadState } from './useQuizData.ts';

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
};

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

  return {
    gold: progress.gold,
    state,
    retry,
    openTopic: (id) => void navigate(`/topics/${id}`),
    goHome: () => void navigate('/'),
  };
}
