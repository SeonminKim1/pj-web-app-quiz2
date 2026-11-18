import type { ReactElement } from 'react';
import { CategoryGrid } from '../components/CategoryGrid.tsx';
import { DataErrorView } from '../components/DataErrorView.tsx';
import { GoldBadge, LoadingView } from '../components/StatusViews.tsx';
import { useCategoryList } from '../hooks/useCategoryList.ts';
import styles from './Page.module.css';

/** 카테고리 목록: 카테고리마다 진행률·완료, 잠금 없이 아무 카테고리나 고른다. */
export function CategoryListPage(): ReactElement {
  const { label, gold, state, retry, openCategory, goHome } = useCategoryList();
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={goHome}>
          ← 처음으로
        </button>
        <h1>{label}</h1>
        <GoldBadge gold={gold} />
      </header>
      {state.status === 'loading' && <LoadingView />}
      {state.status === 'error' && (
        <DataErrorView error={state.error} onRetry={retry} onHome={goHome} />
      )}
      {state.status === 'ready' && (
        <CategoryGrid categories={state.data} onSelect={openCategory} />
      )}
    </main>
  );
}
