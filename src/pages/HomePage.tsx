import type { ReactElement } from 'react';
import { AppIcon } from '../components/AppIcon.tsx';
import { DataErrorView } from '../components/DataErrorView.tsx';
import { GoldBadge, LoadingView } from '../components/StatusViews.tsx';
import { TopicCard } from '../components/TopicCard.tsx';
import { useHomePage } from '../hooks/useHomePage.ts';
import styles from './Page.module.css';

/** 첫 화면: 앱 아이콘·로고, 보유 골드, 주제 카드(들어갈 수 없는 주제는 "준비 중"). */
export function HomePage(): ReactElement {
  const { gold, state, retry, openTopic, goHome } = useHomePage();
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroGold}>
          <GoldBadge gold={gold} />
        </span>
        <AppIcon size={72} />
        <h1 className={styles.logo}>
          퀴즈 <span className={styles.logoAccent}>놀이터</span>
        </h1>
      </header>
      {state.status === 'loading' && <LoadingView />}
      {state.status === 'error' && (
        <DataErrorView error={state.error} onRetry={retry} onHome={goHome} />
      )}
      {state.status === 'ready' && (
        <ul className={styles.list}>
          {state.data.map((card) => (
            <li key={card.id}>
              <TopicCard
                label={card.label}
                detail={card.detail}
                enterable={card.enterable}
                onSelect={() => openTopic(card.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
