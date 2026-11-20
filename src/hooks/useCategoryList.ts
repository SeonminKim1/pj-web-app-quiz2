// 카테고리 목록 hook: 주제 파일 + 진행 → 스티커첩(칭호 카드 + 카테고리 칸).
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { buildAlbum, type Album } from '../lib/album.ts';
import { unseenRewards } from '../lib/progress.ts';
import { useProgress } from './useProgress.ts';
import type { LoadState } from './useQuizData.ts';
import { useTopicCategories } from './useTopicCategories.ts';

/** 카테고리 목록 상태와 동작. */
export type CategoryListView = {
  label: string;
  /** 4축 고르기 주제면 ⓘ MBTI 설명을 보여 준다. */
  showMbtiGuide: boolean;
  gold: number;
  state: LoadState<Album>;
  retry: () => void;
  /** 받았지만 아직 보여 주지 않은 보상("그동안 모은 스티커" 시트, D8). */
  unseen: string[];
  /** 시트를 닫으면 본 것으로 기록. */
  closeUnseen: () => void;
  openCategory: (no: number) => void;
  goHome: () => void;
};

/** 카테고리 목록 hook(주소의 :topicId). */
export function useCategoryList(): CategoryListView {
  const navigate = useNavigate();
  const { topicId } = useParams();
  const { state: loaded, retry, topic } = useTopicCategories(topicId);
  const { progress, markRewardsSeen } = useProgress();
  const unseen = useMemo(() => unseenRewards(progress), [progress]);

  const state = useMemo<LoadState<Album>>(() => {
    if (loaded.status !== 'ready') return loaded;
    return {
      status: 'ready',
      data: buildAlbum({
        topic: loaded.data.topic,
        rounds: loaded.data.categories,
        progress,
      }),
    };
  }, [loaded, progress]);

  return {
    label: topic?.label ?? '주제',
    showMbtiGuide: topic?.play[0] === 'mbtiAxes',
    gold: progress.gold,
    state,
    retry,
    // 목록이 다 읽힌 뒤에만(보상을 막 기록한 뒤) 보여 준다.
    unseen: state.status === 'ready' ? unseen : [],
    closeUnseen: () => markRewardsSeen(unseen),
    // 목록에서 들어간 보드는 "← 목록"을 누르면 뒤로 돌아온다(기록이 쌓이지 않게).
    openCategory: (no) =>
      void navigate(`/topics/${topic?.id ?? ''}/categories/${no}`, {
        state: { fromList: true },
      }),
    goHome: () => void navigate('/'),
  };
}
