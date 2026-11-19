// 문제 하나 모드(/q/:id, /m/:id …): 공유 링크로 들어온 사람이 메뉴 없이 바로 푸는 화면.
// 설계 문서 "문제 하나 화면 명세". 풀이 부품(AnswerInput·HintPanel·Playground·PestLayer)은 스테이지 화면과 같다.
//
//   [loading] → playable ─ answering/wrong/correct ─(맞힘)→ result(s) ─ share / continue
//                   │                └─(포기 확인)→ result(g)
//                   └ resting(공유 대상 아님 / 없는 id) → 다른 문제 풀기
import { playCue } from '../lib/sound.ts';
import { usePhaseSound } from '../hooks/usePhaseSound.ts';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { AnswerInput } from '../components/AnswerInput.tsx';
import { DataErrorView } from '../components/DataErrorView.tsx';
import { HintPanel } from '../components/HintPanel.tsx';
import { MbtiAxesPicker } from '../components/MbtiAxesPicker.tsx';
import { PestLayer } from '../components/PestLayer.tsx';
import { PetPortrait } from '../components/PetPortrait.tsx';
import { ShareButton } from '../components/ShareButton.tsx';
import { ManualCopy, ShareToast } from '../components/ShareFeedback.tsx';
import { Playground } from '../components/Playground.tsx';
import { GoldBadge, LoadingView } from '../components/StatusViews.tsx';
import { usePestSession } from '../hooks/usePestSession.ts';
import { useSettings } from '../hooks/useSettings.ts';
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
  displayNumber,
  shareKey,
  type ShareInfo,
} from '../lib/shareLink.ts';
import styles from './QuestionPage.module.css';
import pageStyles from './Page.module.css';

/** prefix: 주제의 공유 주소 앞부분(넌센스 q, MBTI m). 라우트가 정한다. */
export function QuestionPage({ prefix }: { prefix: string }): ReactElement {
  const { state, retry, info, fromShare, goHome, goStage } =
    useQuestionPage(prefix);
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
    return (
      <RestingView
        info={info}
        missing={state.data.missing}
        onStage={() => goStage(1)}
      />
    );
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
  missing,
  onStage,
}: {
  info: ShareInfo;
  missing: boolean;
  onStage: () => void;
}): ReactElement {
  const { settings } = useSettings();
  return (
    <main className={pageStyles.page}>
      <div className={styles.resting}>
        {info.from && <Banner info={{ from: info.from }} />}
        <div className={styles.restingPest} aria-hidden="true">
          <PetPortrait animal={settings.pet} mood="sulky" />
          <span className={styles.restingZ}>z z</span>
        </div>
        <h1 className={styles.title}>
          {missing ? '그런 문제는 없어요' : '이 문제는 쉬는 중이에요'}
        </h1>
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
  usePhaseSound({ phase: state.phase, fresh: state.fresh });
  const solved = state.phase === 'correct';
  const finished = solved || gaveUp;
  const { pest, areaRef, playgroundRef, questionRef, animal } = usePestSession({
    phase: play.pestPhase,
    active: !finished,
  });
  const shareView = useShare({
    prefix: topic.share.prefix,
    id: item.id,
    question: item.question,
  });
  const axesMode = topic.play[0] === 'mbtiAxes';
  // 통계 키(넌센스는 id, MBTI는 m12).
  const key = shareKey({ prefix: topic.share.prefix, id: item.id });
  const [nickname, setNickname] = useState(loadNickname);
  const [sheetOpen, setSheetOpen] = useState(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (solved && fromShare) analytics.track(EVENTS.solveFromShare, key);
  }, [solved, fromShare, key]);
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
    if (fromShare) analytics.track(EVENTS.continueStageFromShare, key);
    onStage(stageNo);
  };

  // 제출: 틀리면 "포기하고 정답 보기"를 연다(4축 고르기는 공개된 축을 덮은 값으로 채점).
  const submit = () => {
    const input = axesMode ? play.selection : state.input;
    if (play.canSubmit && !isCorrectAnswer({ answer: item.answer, input }))
      setMissedOnce(true);
    play.submit();
  };

  const canGiveUp =
    !finished && (missedOnce || (hints.next === undefined && hintsUsed > 0));
  const feedback = solved ? `정답! ${item.answer}` : play.wrongFeedback;

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
      </header>
      {finished ? (
        <section className={styles.result} aria-live="polite">
          <div className={styles.resultPet} aria-hidden="true">
            {/* 방해꾼은 내가 맞히면 삐지고, 포기하면 으쓱한다. */}
            <PetPortrait animal={animal.id} mood={solved ? 'sulky' : 'smug'} />
            {/* 맞혔을 때만 반짝(한 번). */}
            {solved &&
              [0, 1, 2, 3].map((i) => (
                <span key={i} className={styles.spark} data-i={i} />
              ))}
          </div>
          <h1 ref={resultHeading} tabIndex={-1} className={styles.answerCard}>
            <span className={styles.answerLabel}>
              {solved ? '정답!' : '정답은'}
            </span>{' '}
            <span className={styles.answerText}>
              {solved ? item.answer : `“${item.answer}”`}
            </span>
          </h1>
          {(play.lastGold > 0 || solvedBefore) && solved && (
            <p className={styles.note}>
              {play.lastGold > 0 ? `골드 +${play.lastGold}` : '전에 맞힌 문제'}
            </p>
          )}
          {info.from && info.result && (
            <dl className={styles.versus}>
              <div className={styles.versusMine}>
                <dt>나</dt>
                <dd>{solved ? `힌트 ${mine.hints}개` : '포기'}</dd>
              </div>
              <div>
                <dt>{info.from}</dt>
                <dd>
                  {info.result === 's' ? `힌트 ${info.hints ?? 0}개` : '포기'}
                </dd>
              </div>
            </dl>
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
          fedId={pest.fedId}
          inviting={pest.inviting}
          avoidRef={questionRef}
        >
          <Playground
            playgroundRef={playgroundRef}
            animal={animal.id}
            onFeed={() => {
              playCue('treat');
              pest.feed();
            }}
          />
          {/* 공유 링크(s=1)로 들어왔을 때만. 주소로 바로 오면 친구가 낸 문제가 아니다. */}
          {fromShare && <Banner info={info} />}
          <div className={pageStyles.questionBox}>
            <span className={pageStyles.qTag} aria-hidden="true">
              {displayNumber(item.id)}
            </span>
            <p ref={questionRef} className={pageStyles.question}>
              {item.question}
            </p>
          </div>
          <HintPanel
            key={item.id}
            opened={hints.opened}
            total={hints.total}
            next={hints.next}
            canOpen={hints.canOpen}
            goldShort={hints.goldShort}
            onOpen={() => {
              playCue('hint');
              play.openNextHint();
              pest.hint();
            }}
            leading={<ShareButton onClick={sharePre} />}
          />
          {axesMode ? (
            <MbtiAxesPicker
              questionKey={item.id}
              reward={state.fresh ? play.lastGold : 0}
              selection={play.selection}
              lockedAxes={play.lockedAxes}
              feedback={feedback}
              phase={state.phase}
              canSubmit={play.canSubmit}
              canAdvance={false}
              advanceLabel=""
              onPick={play.pickAxis}
              onSubmit={submit}
              onAdvance={() => {}}
            />
          ) : (
            <AnswerInput
              questionKey={item.id}
              reward={state.fresh ? play.lastGold : 0}
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
              onSubmit={submit}
              onAdvance={() => {}}
            />
          )}
          {/* 정답 보기(한 번 틀렸거나 힌트를 다 쓴 뒤). */}
          <div className={styles.helpRow}>
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
          </div>
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
