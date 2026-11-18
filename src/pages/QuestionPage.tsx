// 문제 하나 모드(/q/:id): 공유 링크로 들어온 사람이 메뉴 없이 바로 푸는 화면.
// 설계 문서 "문제 하나 화면 명세". 풀이 부품(AnswerInput·HintPanel·Playground·PestLayer)은 스테이지 화면과 같다.
//
//   [loading] → playable ─ answering/wrong/correct ─(맞힘)→ result(s) ─ share / continue
//                   │                └─(포기 확인)→ result(g)
//                   └ resting(공유 대상 아님·없는 id) → 다른 문제 풀기
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { AnswerInput } from '../components/AnswerInput.tsx';
import { DataErrorView } from '../components/DataErrorView.tsx';
import { HintPanel } from '../components/HintPanel.tsx';
import { PestLayer } from '../components/PestLayer.tsx';
import { ManualCopy, ShareToast } from '../components/ShareFeedback.tsx';
import { Playground } from '../components/Playground.tsx';
import { GoldBadge, LoadingView } from '../components/StatusViews.tsx';
import { usePestSession } from '../hooks/usePestSession.ts';
import { useProgress } from '../hooks/useProgress.ts';
import {
  useQuestionPage,
  type QuestionTarget,
} from '../hooks/useQuestionPage.ts';
import { loadNickname, saveNickname, useShare } from '../hooks/useShare.ts';
import { useStagePlay } from '../hooks/useStagePlay.ts';
import { EVENTS } from '../lib/analytics.ts';
import { isCorrectAnswer } from '../lib/answer.ts';
import { analytics } from '../lib/analyticsInstance.ts';
import { solvedSet } from '../lib/progress.ts';
import {
  NICKNAME_MAX,
  bannerLines,
  cleanNickname,
  compareLine,
  cutGraphemes,
  type ShareInfo,
} from '../lib/shareLink.ts';
import styles from './QuestionPage.module.css';
import pageStyles from './Page.module.css';

export function QuestionPage(): ReactElement {
  const { state, retry, info, fromShare, goHome, goStage } = useQuestionPage();
  if (state.status === 'loading') {
    return (
      <main className={pageStyles.page}>
        <LoadingView />
      </main>
    );
  }
  if (state.status === 'error') {
    return (
      <main className={pageStyles.page}>
        <DataErrorView error={state.error} onRetry={retry} onHome={goHome} />
      </main>
    );
  }
  if (state.data.kind === 'resting') {
    return <RestingView info={info} onStage={() => goStage(1)} />;
  }
  return (
    <Session
      key={state.data.item.id}
      target={state.data}
      info={info}
      fromShare={fromShare}
      onHome={goHome}
      onStage={goStage}
    />
  );
}

function Banner({ info }: { info: ShareInfo }): ReactElement {
  const lines = bannerLines(info);
  return (
    <p className={styles.banner}>
      {lines.map((line) => (
        <span key={line} className={styles.bannerLine}>
          {line}
        </span>
      ))}
    </p>
  );
}

function RestingView({
  info,
  onStage,
}: {
  info: ShareInfo;
  onStage: () => void;
}): ReactElement {
  return (
    <main className={pageStyles.page}>
      <div className={styles.resting}>
        {info.from && <Banner info={{ from: info.from }} />}
        <p className={styles.restingPest} aria-hidden="true">
          💤
        </p>
        <h1 className={styles.title}>이 문제는 쉬는 중이에요</h1>
        <button type="button" className={styles.primary} onClick={onStage}>
          다른 문제 풀기
        </button>
      </div>
    </main>
  );
}

type SessionProps = {
  target: Extract<QuestionTarget, { kind: 'playable' }>;
  info: ShareInfo;
  fromShare: boolean;
  onHome: () => void;
  onStage: (no: number | undefined) => void;
};

function Session({
  target,
  info,
  fromShare,
  onHome,
  onStage,
}: SessionProps): ReactElement {
  const { item, topic, stageNo } = target;
  const { progress } = useProgress();
  // 다시 들어온 문제도 풀 수 있게 한 문제짜리 판으로 연다(골드는 진행 규칙대로 처음만).
  const [plan] = useState(() => ({
    items: [item],
    startIndex: 0,
    solvedBefore: new Set<string>(),
  }));
  const [solvedBefore] = useState(() =>
    solvedSet({ progress, topicId: topic.id }).has(item.id),
  );
  const play = useStagePlay({ topic, plan });
  const [gaveUp, setGaveUp] = useState(false);
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const [missedOnce, setMissedOnce] = useState(false);
  const { state, hints } = play;
  const solved = state.phase === 'correct';
  const finished = solved || gaveUp;
  const { pest, areaRef, playgroundRef, questionRef, animal } = usePestSession({
    phase: play.pestPhase,
    active: !finished,
  });
  const shareView = useShare({ id: item.id, question: item.question });
  const [nickname, setNickname] = useState(loadNickname);
  const [sheetOpen, setSheetOpen] = useState(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (solved && fromShare) analytics.track(EVENTS.solveFromShare, item.id);
  }, [solved, fromShare, item.id]);
  useEffect(() => {
    if (finished) resultHeading.current?.focus();
  }, [finished]);

  const hintsUsed = hints.opened.length;
  const mine = {
    result: solved ? ('s' as const) : ('g' as const),
    hints: hintsUsed,
  };
  const myInfo = (from: string | undefined): ShareInfo =>
    finished ? { from, hints: hintsUsed, result: mine.result } : { from };

  // 클릭 처리기 안에서 바로 share를 부른다(사용자 동작 조건).
  const sharePre = () =>
    void shareView.share({ info: { from: nickname }, timing: 'pre' });
  const sharePost = () => {
    if (nickname === undefined && !sheetSeen()) {
      setSheetOpen(true);
      return;
    }
    void shareView.share({ info: myInfo(nickname), timing: 'post' });
  };
  const sendFromSheet = (name: string | undefined) => {
    const clean = cleanNickname(name);
    markSheetSeen();
    saveNickname(clean);
    setNickname(clean);
    setSheetOpen(false);
    void shareView.share({ info: myInfo(clean), timing: 'post' });
  };
  const continueStage = () => {
    if (fromShare) analytics.track(EVENTS.continueStageFromShare, item.id);
    onStage(stageNo);
  };

  const canGiveUp =
    !finished && (missedOnce || (hints.next === undefined && hintsUsed > 0));
  const feedback =
    state.phase === 'wrong'
      ? '틀렸어요'
      : solved
        ? `정답! ${item.answer}`
        : undefined;

  return (
    <main className={pageStyles.playPage}>
      <header className={pageStyles.header}>
        <button
          type="button"
          className={pageStyles.backIcon}
          aria-label="처음 화면"
          onClick={onHome}
        >
          ←
        </button>
        <GoldBadge gold={progress.gold} compact />
        {!finished && (
          <button
            type="button"
            className={styles.shareIcon}
            aria-label="친구한테 이 문제 내기"
            onClick={sharePre}
          >
            📤
          </button>
        )}
      </header>
      {finished ? (
        <section className={styles.result} aria-live="polite">
          <h1 ref={resultHeading} tabIndex={-1} className={styles.title}>
            {solved ? `정답! ${item.answer}` : `정답은 "${item.answer}"`}
          </h1>
          {solved && play.lastGold > 0 && (
            <p className={styles.gold}>+{play.lastGold}💰</p>
          )}
          {solved && solvedBefore && (
            <p className={styles.note}>전에 맞힌 문제</p>
          )}
          <p className={styles.compare}>{compareLine({ info, mine })}</p>
          <button type="button" className={styles.primary} onClick={sharePost}>
            {shareView.sentOnce ? '또 내기' : '친구한테 이 문제 내기'}
          </button>
          {nickname && (
            <button
              type="button"
              className={styles.link}
              onClick={() => setSheetOpen(true)}
            >
              보내는 이름: {nickname} · 바꾸기
            </button>
          )}
          {shareView.manualText && (
            <ManualCopy
              text={shareView.manualText}
              onClose={shareView.closeManual}
            />
          )}
          <button
            type="button"
            className={styles.secondary}
            onClick={continueStage}
          >
            이 문제가 든 스테이지 계속하기
          </button>
        </section>
      ) : (
        <PestLayer
          areaRef={areaRef}
          behavior={pest.behavior}
          mood={pest.mood}
          dizzy={pest.dizzy}
          line={pest.line}
          motion={pest.motion}
          animal={animal.id}
        >
          <Playground playgroundRef={playgroundRef} />
          <Banner info={info} />
          <div className={pageStyles.questionBox}>
            <p ref={questionRef} className={pageStyles.question}>
              {item.question}
            </p>
          </div>
          <HintPanel
            opened={hints.opened.map((hint) => hint.text)}
            next={hints.next}
            canOpen={hints.canOpen}
            goldShort={hints.goldShort}
            onOpen={play.openNextHint}
          />
          <p className={styles.note}>모르겠으면 친구한테 넘기기 ↗</p>
          <AnswerInput
            questionKey={item.id}
            charCount={play.charCount}
            wordLengths={play.wordLengths}
            slots={play.slots}
            feedback={feedback}
            value={state.input}
            phase={state.phase}
            canSubmit={play.canSubmit}
            canAdvance={false}
            advanceLabel=""
            onChange={play.setInput}
            onSubmit={() => {
              if (
                play.canSubmit &&
                !isCorrectAnswer({ answer: item.answer, input: state.input })
              )
                setMissedOnce(true);
              play.submit();
            }}
            onAdvance={() => {}}
          />
          {canGiveUp &&
            (confirmGiveUp ? (
              <div
                className={styles.confirm}
                role="group"
                aria-label="정답을 볼까요?"
              >
                <span>정답을 볼까요?</span>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => setGaveUp(true)}
                >
                  볼래요
                </button>
                <button
                  type="button"
                  className={styles.link}
                  onClick={() => setConfirmGiveUp(false)}
                >
                  더 풀래요
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.link}
                onClick={() => setConfirmGiveUp(true)}
              >
                포기하고 정답 보기
              </button>
            ))}
        </PestLayer>
      )}
      {sheetOpen && (
        <NicknameSheet
          initial={nickname}
          onSend={sendFromSheet}
          onClose={() => setSheetOpen(false)}
        />
      )}
      <ShareToast text={shareView.toast} />
    </main>
  );
}

const SHEET_SEEN_KEY = 'qp_nickname_asked';
function sheetSeen(): boolean {
  try {
    return globalThis.localStorage?.getItem(SHEET_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}
function markSheetSeen(): void {
  try {
    globalThis.localStorage?.setItem(SHEET_SEEN_KEY, '1');
  } catch {
    // 무시
  }
}

function NicknameSheet({
  initial,
  onSend,
  onClose,
}: {
  initial: string | undefined;
  onSend: (name: string | undefined) => void;
  onClose: () => void;
}): ReactElement {
  const [value, setValue] = useState(initial ?? '');
  const count = cutGraphemes(value, 99).length;
  return (
    <div className={styles.sheetBackdrop} onClick={onClose}>
      <form
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nickname-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSend(value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <h2 id="nickname-title" className={styles.title}>
          친구에게 뭐라고 보일까요?
        </h2>
        <label className={styles.field}>
          <span>보내는 이름</span>
          <input
            id="nickname-input"
            value={value}
            autoFocus
            onChange={(event) =>
              setValue(cutGraphemes(event.target.value, NICKNAME_MAX))
            }
          />
          <span className={styles.counter}>
            {count}/{NICKNAME_MAX}
          </span>
        </label>
        <button type="submit" className={styles.primary}>
          이 이름으로 보내기
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => onSend(undefined)}
        >
          이름 없이 보내기
        </button>
      </form>
    </div>
  );
}
