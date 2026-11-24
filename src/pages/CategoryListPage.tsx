import { SettingsButton } from '../components/SettingsButton.tsx';
import type { ReactElement } from 'react';
import { DataErrorView } from '../components/DataErrorView.tsx';
import { MbtiGuideButton } from '../components/MbtiGuide.tsx';
import { GoldBadge, LoadingView } from '../components/StatusViews.tsx';
import { StickerAlbum } from '../components/StickerAlbum.tsx';
import { CollectedSheet } from '../components/CollectedSheet.tsx';
import { useCategoryList } from '../hooks/useCategoryList.ts';
import styles from './Page.module.css';

/** 카테고리 목록: 카테고리마다 진행률·완료, 잠금 없이 아무 카테고리나 고른다. */
export function CategoryListPage(): ReactElement {
  const {
    label,
    showMbtiGuide,
    gold,
    state,
    retry,
    unseen,
    closeUnseen,
    openCategory,
    goHome,
  } = useCategoryList();
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.back} onClick={goHome}>
          ← 처음으로
        </button>
        <h1>{label}</h1>
        <span className={styles.headerEnd}>
          <GoldBadge gold={gold} />
          <SettingsButton />
        </span>
      </header>
      {showMbtiGuide && (
        <div className={styles.topicIntro}>
          <MbtiGuideButton />
        </div>
      )}
      {state.status === 'loading' && <LoadingView />}
      {state.status === 'error' && (
        <DataErrorView error={state.error} onRetry={retry} onHome={goHome} />
      )}
      {state.status === 'ready' && (
        <StickerAlbum
          album={state.data}
          size="large"
          verb="맞힘"
          onSelect={openCategory}
        />
      )}
      {unseen.length > 0 && (
        <CollectedSheet rewardIds={unseen} onClose={closeUnseen} />
      )}
    </main>
  );
}
