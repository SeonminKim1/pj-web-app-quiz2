import type { ReactElement } from 'react';
import { AnswerInput } from '../components/AnswerInput.tsx';
import { DataErrorView } from '../components/DataErrorView.tsx';
import { HintPanel } from '../components/HintPanel.tsx';
import { PestLayer } from '../components/PestLayer.tsx';
import { QuestionNav } from '../components/QuestionNav.tsx';
import { Playground } from '../components/Playground.tsx';
import { StageResult } from '../components/StageResult.tsx';
import { GoldBadge, LoadingView } from '../components/StatusViews.tsx';
import {
  useStagePlayPage,
  type StagePlayTarget,
} from '../hooks/useStagePlayPage.ts';
import { useStageSession } from '../hooks/useStageSession.ts';
import { loadNickname, useShare } from '../hooks/useShare.ts';
import { ManualCopy, ShareToast } from '../components/ShareFeedback.tsx';
import styles from './Page.module.css';

/** 풀이 화면: 주소의 주제·스테이지를 확인하고 풀이 세션을 띄운다. */
export function StagePlayPage(): ReactElement {
  const { state, retry, goHome, goList, goNextStage } = useStagePlayPage();
  if (state.status === 'loading') {
    return (
      <Shell>
        <LoadingView />
      </Shell>
    );
  }
  if (state.status === 'error') {
    return (
      <Shell>
        <DataErrorView
          error={state.error}
          onRetry={retry}
          onHome={goHome}
          onList={goList}
        />
      </Shell>
    );
  }
  const { topic, stage } = state.data;
  return (
    <StageSession
      // 다음 스테이지로 가면 세션(풀 문제 목록, 풀이 상태)을 새로 만든다.
      key={`${topic.id}-${stage.no}`}
      target={state.data}
      onList={goList}
      onNextStage={goNextStage}
    />
  );
}

function Shell({ children }: { children: ReactElement }): ReactElement {
  return <main className={styles.page}>{children}</main>;
}

type StageSessionProps = {
  target: StagePlayTarget;
  onList: () => void;
  onNextStage: () => void;
};

// 스테이지 한 번 풀기.
function StageSession({
  target,
  onList,
  onNextStage,
}: StageSessionProps): ReactElement {
  const {
    play,
    pest,
    pestAreaRef,
    playgroundRef,
    animal,
    questionRef,
    gold,
    replay,
    overall,
    hasNextStage,
  } = useStageSession(target);
  const { state, item, hints } = play;
  const { stage } = target;
  // 지금 문제를 친구한테 내기. 방금 맞힌 문제면 결과(힌트 수)도 함께 보낸다.
  const shareView = useShare({
    id: item?.id ?? '',
    question: item?.question ?? '',
  });
  const shareCurrent = () => {
    if (!item) return;
    const justSolved = state.phase === 'correct' && state.fresh;
    void shareView.share({
      info: justSolved
        ? { from: loadNickname(), hints: hints.opened.length, result: 's' }
        : { from: loadNickname() },
      timing: justSolved ? 'post' : 'pre',
    });
  };

  if (state.phase === 'result') {
    return (
      <Shell>
        <StageResult
          correctCount={state.correctCount}
          played={play.playable}
          goldEarned={state.goldTotal}
          {...overall}
          hasNext={hasNextStage}
          onList={onList}
          onNext={onNextStage}
        />
      </Shell>
    );
  }

  const feedback =
    state.phase === 'correct'
      ? `정답! ${item?.answer ?? ''}${play.lastGold > 0 ? ` · 골드 +${play.lastGold}` : ''}`
      : state.phase === 'wrong'
        ? '틀렸어요'
        : undefined;

  return (
    <main className={styles.playPage}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backIcon}
          aria-label="스테이지 목록"
          onClick={onList}
        >
          ←
        </button>
        {/* 이전·다음은 진행 표시 양옆 화살표(마지막의 ›는 결과 보기). */}
        <QuestionNav
          label={`${stage.no}단계 · ${state.index + 1} / ${play.total}`}
          canPrev={play.canPrev}
          next={play.isLast ? 'result' : 'next'}
          onPrev={play.prev}
          onNext={play.next}
        />
        <GoldBadge gold={gold} compact />
      </header>
      <PestLayer
        areaRef={pestAreaRef}
        behavior={pest.behavior}
        mood={pest.mood}
        dizzy={pest.dizzy}
        line={pest.line}
        motion={pest.motion}
        animal={animal.id}
      >
        {/* 방해꾼이 평소 노는 곳: 머리 줄 바로 아래(ui-play-layout spec "놀이터"). */}
        <Playground playgroundRef={playgroundRef} />
        <div className={styles.questionBox}>
          {replay && <span className={styles.replayTag}>다시 풀기</span>}
          <p ref={questionRef} className={styles.question}>
            {item?.question}
          </p>
          <button
            type="button"
            className={styles.questionShare}
            aria-label="친구한테 이 문제 내기"
            onClick={shareCurrent}
          >
            📤
          </button>
        </div>
        {shareView.manualText && (
          <ManualCopy
            text={shareView.manualText}
            onClose={shareView.closeManual}
          />
        )}
        <HintPanel
          opened={hints.opened.map((hint) => hint.text)}
          next={hints.next}
          canOpen={hints.canOpen}
          goldShort={hints.goldShort}
          onOpen={play.openNextHint}
        />
        <AnswerInput
          questionKey={item?.id ?? ''}
          charCount={play.charCount}
          wordLengths={play.wordLengths}
          slots={play.slots}
          feedback={feedback}
          value={state.input}
          phase={state.phase}
          canSubmit={play.canSubmit}
          canAdvance={play.canAdvance}
          advanceLabel={play.isLast ? '결과 보기 ›' : '다음 ›'}
          onChange={play.setInput}
          onSubmit={play.submit}
          onAdvance={play.advance}
        />
      </PestLayer>
      <ShareToast text={shareView.toast} />
    </main>
  );
}
