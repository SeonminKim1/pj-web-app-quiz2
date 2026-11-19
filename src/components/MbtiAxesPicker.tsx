import type { FormEvent, ReactElement } from 'react';
import type { PlayPhase } from '../hooks/useStagePlay.ts';
import { MBTI_AXES, mbtiLetters } from '../lib/mbti.ts';
import { AnswerSlots } from './AnswerSlots.tsx';
import { CoinBurst } from './CoinBurst.tsx';
import { MbtiGuideButton } from './MbtiGuide.tsx';
import styles from './MbtiAxesPicker.module.css';

type MbtiAxesPickerProps = {
  /** 문제가 바뀌면 달라지는 값(남겨 둔 오답 문구를 지운다). */
  questionKey: string;
  /** 고른 값(공개된 축은 정답 글자로 덮인 값, 안 고른 축은 '_'). */
  selection: string;
  /** 공개 힌트로 고정된 앞 축 수(그 축 버튼은 못 바꾼다). */
  lockedAxes: number;
  /** 상태 줄 피드백("틀렸어요 · 4개 중 2개 맞았어요", "정답! …"). */
  feedback: string | undefined;
  phase: PlayPhase;
  canSubmit: boolean;
  canAdvance: boolean;
  advanceLabel: string;
  /** 방금 맞혀 얻은 골드(있으면 동전이 골드 배지로 날아간다). */
  reward?: number;
  /** 축 하나를 고른 새 값. */
  onPick: (axis: number, letter: string) => void;
  onSubmit: () => void;
  onAdvance: () => void;
};

/**
 * MBTI 4축 고르기: 상태 줄, 고른 글자 칸(I S T _), 축마다 두 버튼, ⓘ + 확인/다음.
 * 오답 문구("4개 중 N개")는 흔들림이 끝나도 고른 값을 바꾸기 전까지 남는다(값은 useStagePlay가 정함).
 */
export function MbtiAxesPicker({
  questionKey,
  selection,
  lockedAxes,
  feedback,
  phase,
  canSubmit,
  canAdvance,
  advanceLabel,
  reward = 0,
  onPick,
  onSubmit,
  onAdvance,
}: MbtiAxesPickerProps): ReactElement {
  const letters = mbtiLetters(selection);
  const solved = phase === 'correct';

  // 오답 문구는 흔들림(wrong)이 끝난 answering에서도 남는다(useStagePlay가 고른 값을 바꾸기 전까지 준다).
  const tone = feedback && phase === 'answering' ? 'wrong' : phase;

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (solved) onAdvance();
    else onSubmit();
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={styles.status} data-tone={tone} aria-live="polite">
        {feedback ? (
          <span>{feedback}</span>
        ) : (
          <span>축마다 한 글자씩 골라요</span>
        )}
      </p>
      <AnswerSlots slots={{ groups: [letters], overflow: 0 }} phase={phase} />
      {solved && reward > 0 && <CoinBurst key={questionKey} />}
      <div className={styles.axes} data-phase={phase}>
        {MBTI_AXES.map((axis, index) => {
          const locked = index < lockedAxes;
          return (
            <div
              key={axis.name}
              role="group"
              aria-label={`${axis.name}${locked ? ', 힌트로 고정' : ''}`}
              className={styles.axis}
            >
              {axis.options.map((option) => {
                const chosen = letters[index] === option.letter;
                return (
                  <button
                    key={option.letter}
                    type="button"
                    className={styles.option}
                    aria-pressed={chosen}
                    data-locked={(locked && chosen) || undefined}
                    disabled={phase !== 'answering' || locked}
                    onClick={() => onPick(index, option.letter)}
                  >
                    <span className={styles.letter}>{option.letter}</span>
                    <span className={styles.label}>{option.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className={styles.actions}>
        <MbtiGuideButton compact />
        <button
          type="submit"
          className={styles.submit}
          disabled={solved ? !canAdvance : !canSubmit}
        >
          {solved ? advanceLabel : '확인'}
        </button>
      </div>
    </form>
  );
}
