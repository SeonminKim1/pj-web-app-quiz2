import {
  useEffect,
  useId,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import type { PlayPhase } from '../hooks/useStagePlay.ts';
import type { AnswerSlots as AnswerSlotsModel } from '../lib/answer.ts';
import { AnswerSlots } from './AnswerSlots.tsx';
import styles from './AnswerInput.module.css';

type AnswerInputProps = {
  /** 문제가 바뀌면 달라지는 값(새 문제면 입력창에 포커스). */
  questionKey: string;
  /** 정답 글자 수(공백 제외)와 어절별 글자 수. */
  charCount: number;
  wordLengths: readonly number[];
  /** 글자 칸(입력을 정답 칸에 채운 값). */
  slots: AnswerSlotsModel;
  /** 상태 줄 피드백("틀렸어요", "정답! …"). 없으면 글자 수를 보여 준다. */
  feedback: string | undefined;
  value: string;
  phase: PlayPhase;
  canSubmit: boolean;
  /** 맞힌 뒤 "다음"을 받을 수 있는지(맞힌 직후 잠시는 false). */
  canAdvance: boolean;
  /** 맞힌 뒤 버튼 글자("다음 ›", "결과 보기 ›"). */
  advanceLabel: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAdvance: () => void;
};

/**
 * 주관식 입력(docs/ui-play-layout/spec.md): 상태 줄(글자 수 ↔ 피드백), 글자 칸, 입력창 + 확인/다음.
 * 맞힌 뒤에는 같은 자리 버튼과 Enter가 "다음"이다. 한글 조합 중 Enter는 제출하지 않는다.
 */
export function AnswerInput({
  questionKey,
  charCount,
  wordLengths,
  slots,
  feedback,
  value,
  phase,
  canSubmit,
  canAdvance,
  advanceLabel,
  onChange,
  onSubmit,
  onAdvance,
}: AnswerInputProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const prevPhase = useRef(phase);
  const lengthId = useId();

  // 새 문제가 나오면 입력창에 포커스.
  useEffect(() => {
    inputRef.current?.focus();
  }, [questionKey]);

  // 오답 흔들림이 끝나면 쓴 답을 전체 선택(바로 다시 쓰거나 조금 고칠 수 있게).
  useEffect(() => {
    if (prevPhase.current === 'wrong' && phase === 'answering') {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    prevPhase.current = phase;
  }, [phase]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (phase === 'correct') onAdvance();
    else onSubmit();
  };
  const lengthText = `정답 ${charCount}글자${wordLengths.length > 1 ? ` · ${wordLengths.join('+')}` : ''}`;
  const solved = phase === 'correct';

  // 한글 조합 중 Enter는 글자를 확정하는 키라 제출하지 않는다(마지막 글자가 빠지는 것을 막음).
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (
      event.key === 'Enter' &&
      (event.nativeEvent.isComposing || event.keyCode === 229)
    ) {
      event.preventDefault();
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* 입력창 설명은 늘 글자 수(상태 줄이 피드백으로 바뀌어도 유지). */}
      <span id={lengthId} className={styles.srOnly}>
        {lengthText}
      </span>
      {/* 피드백만 읽어 준다. 글자 수는 입력창 설명이 읽으므로 여기서는 보조 기술에 숨긴다. */}
      <p className={styles.status} data-tone={phase} aria-live="polite">
        {feedback ? (
          <span>{feedback}</span>
        ) : (
          <span aria-hidden="true">{lengthText}</span>
        )}
      </p>
      <AnswerSlots slots={slots} phase={phase} />
      <div className={styles.row} data-phase={phase}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          value={value}
          aria-label="정답 입력"
          aria-describedby={lengthId}
          // 채점 중·맞힌 뒤에는 고칠 수 없게(포커스는 유지: Enter = 다음, 키보드가 내려가지 않게).
          readOnly={phase !== 'answering'}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint={solved ? 'next' : 'done'}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
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
