// 첫 화면 hook: 주제 목록(manifest)과 보유 골드를 카드 표시값으로 바꾼다.
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { AppError } from '../errors/AppError.ts';
import { solvedSet } from '../lib/progress.ts';
import {
  findCategoryTopic,
  findStageTopic,
  isEnterableTopicId,
} from '../lib/quizTopics.ts';
import type { QuizTopic } from '../types/quiz.ts';
import { useProgress } from './useProgress.ts';
import { useManifest, type LoadState } from './useQuizData.ts';
import { useSettings } from './useSettings.ts';
import { roundLabel, roundSegment, useTopicRounds } from './useTopicRounds.ts';

/** 주제 카드 하나의 표시값. */
type TopicCardView = {
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
  /** 이어서 풀 곳(마지막으로 푼 주제, 없으면 넌센스. 문제 파일을 받은 뒤에만). */
  next: ContinueView | undefined;
  openNext: () => void;
  /** 이어서 풀 주제의 문제 파일을 못 받았을 때(카드 자리에 다시 시도). */
  nextError: AppError | undefined;
  retryNext: () => void;
};

/** 첫 화면의 "이어서 풀기". */
type ContinueView = {
  /** 이어서 풀 주제(이름, 칭호를 주는지). */
  topicLabel: string;
  titles: boolean;
  /** 못 푼 문제가 남은 첫 판(스테이지·카테고리) 번호와 이름. 다 풀었으면 undefined. */
  stageNo: number | undefined;
  stageName: string | undefined;
  /** 첫 판 이름("스테이지 1", "일상"): 아직 하나도 안 풀었을 때 "…부터 시작하기". */
  firstName: string;
  stageCount: number;
  solved: number;
  total: number;
};

const MAIN_TOPIC = 'nonsense';

// 이어서 풀 주제: 마지막으로 푼 주제가 지금 들어갈 수 있으면 그것, 아니면 넌센스.
function continueTopic(lastTopic: string | undefined): QuizTopic | undefined {
  return (
    findStageTopic(lastTopic) ??
    findCategoryTopic(lastTopic) ??
    findStageTopic(MAIN_TOPIC)
  );
}

/** 첫 화면 hook. */
export function useHomePage(): HomePageView {
  const navigate = useNavigate();
  const { state: manifest, retry } = useManifest();
  const { progress } = useProgress();
  const { settings } = useSettings();
  const topic = continueTopic(settings.lastTopic);

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

  const { state: rounds, retry: retryNext } = useTopicRounds(topic);
  const next = useMemo<ContinueView | undefined>(() => {
    if (rounds.status !== 'ready' || !topic) return undefined;
    const solvedIds = solvedSet({ progress, topicId: topic.id });
    const { items, rounds: list } = rounds.data;
    const at = list.findIndex((round) =>
      round.items.some((item) => !solvedIds.has(item.id)),
    );
    const current = at === -1 ? undefined : list[at];
    return {
      topicLabel: topic.label,
      titles: topic.titles,
      stageNo: current?.no,
      stageName: current ? roundLabel(current) : undefined,
      firstName: list[0] ? roundLabel(list[0]) : '스테이지 1',
      stageCount: list.length,
      solved: items.filter((item) => solvedIds.has(item.id)).length,
      total: items.length,
    };
  }, [rounds, progress, topic]);

  return {
    next,
    nextError: rounds.status === 'error' ? rounds.error : undefined,
    retryNext,
    openNext: () => {
      if (!topic) return;
      const list = `/topics/${topic.id}`;
      void navigate(
        next?.stageNo ? `${list}/${roundSegment(topic)}/${next.stageNo}` : list,
      );
    },
    gold: progress.gold,
    state,
    retry,
    openTopic: (id) => void navigate(`/topics/${id}`),
    goHome: () => void navigate('/'),
  };
}
