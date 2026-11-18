// /topics/:topicId에서 어떤 목록 화면을 보일지(docs/ui-mbti-play/spec.md "들어갈 수 있는 주제·한 판").
// 주제 id가 아니라 주제 설정의 한 판 단위(round.byCategory)로 고른다.
import { useParams } from 'react-router';
import { findCategoryTopic } from '../lib/quizTopics.ts';

/** 목록 화면 종류: 카테고리 단위 주제면 카테고리 목록, 아니면 스테이지 목록(없는 주제 에러도 여기서). */
export function useTopicListKind(): 'categories' | 'stages' {
  const { topicId } = useParams();
  return findCategoryTopic(topicId) ? 'categories' : 'stages';
}
