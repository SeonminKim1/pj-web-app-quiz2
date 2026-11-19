import { useState, type ReactElement } from 'react';
import { Link } from 'react-router';
import { AppIcon } from '../components/AppIcon.tsx';
import { PetPicker } from '../components/PetPicker.tsx';
import { PetPortrait } from '../components/PetPortrait.tsx';
import { SettingsButton } from '../components/SettingsButton.tsx';
import { useSettings } from '../hooks/useSettings.ts';
import { PEST_ANIMALS, getPestAnimal } from '../lib/pestAnimals.ts';
import { DataErrorView } from '../components/DataErrorView.tsx';
import { GoldBadge, LoadingView } from '../components/StatusViews.tsx';
import { TopicCard } from '../components/TopicCard.tsx';
import { useHomePage } from '../hooks/useHomePage.ts';
import { titleFor } from '../lib/titles.ts';
import styles from './Page.module.css';

/** 첫 화면: 앱 아이콘·로고, 보유 골드, 주제 카드(들어갈 수 없는 주제는 "준비 중"). */
export function HomePage(): ReactElement {
  const { gold, state, retry, openTopic, goHome, next, openNext } =
    useHomePage();
  const { settings, choosePet } = useSettings();
  const [picking, setPicking] = useState(false);
  // 칭호는 칭호를 주는 주제(넌센스)를 이어서 풀 때만.
  const title = next?.titles ? titleFor(next) : undefined;
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <button
          type="button"
          className={styles.heroPet}
          aria-label={`방해꾼 바꾸기, 지금 ${getPestAnimal(settings.pet).label}`}
          onClick={() => setPicking(true)}
        >
          <PetPortrait animal={settings.pet} headOnly size={28} />
          방해꾼
        </button>
        <span className={styles.heroGold}>
          <GoldBadge gold={gold} />
          <SettingsButton />
        </span>
        <AppIcon size={72} />
        <h1 className={styles.logo}>
          게임 <span className={styles.logoAccent}>놀이터</span>
        </h1>
      </header>
      {next && (
        <section className={styles.continue} aria-label="이어서 풀기">
          {/* 카드 위에 올라앉은 방해꾼들(장식). 고른 동물이 맨 앞에서 으쓱. */}
          <div className={styles.parade} aria-hidden="true">
            {[...PEST_ANIMALS]
              .sort((a, b) =>
                a.id === settings.pet ? -1 : b.id === settings.pet ? 1 : 0,
              )
              .map((animal, i) => (
                <span key={animal.id} style={{ zIndex: 4 - i }}>
                  <PetPortrait
                    animal={animal.id}
                    mood={i === 0 ? 'smug' : 'idle'}
                    size={i === 0 ? 60 : 46}
                  />
                </span>
              ))}
          </div>
          {title && (
            <p className={styles.title}>
              <span className={styles.titleName}>{title.name}</span>
              {title.next && (
                <span className={styles.titleNext}>
                  {title.next.name}까지 {title.next.remaining}문제
                </span>
              )}
            </p>
          )}
          <p className={styles.continueStatus}>
            {next.stageNo
              ? next.solved === 0
                ? `${next.topicLabel} ${next.total}문제, 스테이지 ${next.stageCount}개`
                : `${next.topicLabel} · ${next.stageName} 차례예요`
              : `${next.topicLabel} 다 풀었어요`}
          </p>
          <div
            className={styles.continueBar}
            role="progressbar"
            aria-label="푼 문제"
            aria-valuemin={0}
            aria-valuemax={next.total}
            aria-valuenow={next.solved}
          >
            <span
              style={{
                // 조금이라도 풀었으면 보이게(546문제 중 2문제는 0.4%라 안 보인다).
                width:
                  next.solved === 0
                    ? 0
                    : `max(10px, ${(next.solved / next.total) * 100}%)`,
              }}
            />
          </div>
          <p className={styles.continueCount}>
            {next.solved} / {next.total}문제
          </p>
          <button
            type="button"
            className={styles.continueButton}
            onClick={openNext}
          >
            {next.stageNo
              ? next.solved === 0
                ? `${next.firstName}부터 시작하기`
                : `이어서 풀기 · ${next.stageName}`
              : '다시 풀어 보기'}
          </button>
        </section>
      )}
      {state.status === 'loading' && <LoadingView />}
      {state.status === 'error' && (
        <DataErrorView error={state.error} onRetry={retry} onHome={goHome} />
      )}
      {state.status === 'ready' && (
        <>
          <h2 className={styles.sectionLabel}>스테이지 고르기</h2>
          <ul className={styles.list} aria-label="주제">
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
        </>
      )}
      <footer className={styles.footer}>
        <Link to="/privacy">개인정보처리방침</Link>
      </footer>
      {picking && (
        <PetPicker
          current={settings.pet}
          onChoose={choosePet}
          onClose={() => setPicking(false)}
        />
      )}
    </main>
  );
}
