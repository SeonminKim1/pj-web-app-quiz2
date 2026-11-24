import { SettingsButton } from '../components/SettingsButton.tsx';
import type { ReactElement } from 'react';
import { DataErrorView } from '../components/DataErrorView.tsx';
import { GoldBadge, LoadingView } from '../components/StatusViews.tsx';
import { StickerAlbum } from '../components/StickerAlbum.tsx';
import { CollectedSheet } from '../components/CollectedSheet.tsx';
import { useStageList } from '../hooks/useStageList.ts';
import styles from './Page.module.css';

/** 스테이지 목록: 스테이지마다 진행률·완료 표시, 잠금 없이 아무 스테이지나 고른다. */
export function StageListPage(): ReactElement {
  const { label, gold, state, retry, unseen, closeUnseen, openStage, goHome } =
    useStageList();
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
      {state.status === 'loading' && <LoadingView />}
      {state.status === 'error' && (
        <DataErrorView error={state.error} onRetry={retry} onHome={goHome} />
      )}
      {state.status === 'ready' && (
        <StickerAlbum
          album={state.data}
          size="small"
          verb="풂"
          onSelect={openStage}
        />
      )}
      {unseen.length > 0 && (
        <CollectedSheet rewardIds={unseen} onClose={closeUnseen} />
      )}
    </main>
  );
}
