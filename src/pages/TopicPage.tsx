import type { ReactElement } from 'react';
import { useTopicListKind } from '../hooks/useTopicPage.ts';
import { CategoryListPage } from './CategoryListPage.tsx';
import { StageListPage } from './StageListPage.tsx';

/** 주제 화면(/topics/:topicId): 한 판 단위에 맞는 목록(스테이지 / 카테고리). */
export function TopicPage(): ReactElement {
  return useTopicListKind() === 'categories' ? (
    <CategoryListPage />
  ) : (
    <StageListPage />
  );
}
