// ⓘ MBTI가 뭐예요?: 4축 고르기 주제의 카테고리 목록·풀이 화면에서 연다.
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { MBTI_AXES } from '../lib/mbti.ts';
import styles from './MbtiGuide.module.css';

/** ⓘ 버튼 + 누르면 아래에서 올라오는 설명 시트. 닫으면 포커스를 버튼으로 돌려준다. */
export function MbtiGuideButton({
  compact = false,
}: {
  /** 풀이 화면: 아이콘만(이름은 그대로 읽힌다). */
  compact?: boolean;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={compact ? styles.iconButton : styles.button}
        aria-label={compact ? 'MBTI가 뭐예요?' : undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span className={styles.info} aria-hidden="true">
          i
        </span>
        {!compact && 'MBTI가 뭐예요?'}
      </button>
      {open && (
        <MbtiGuideSheet
          onClose={() => {
            setOpen(false);
            buttonRef.current?.focus();
          }}
        />
      )}
    </>
  );
}

function MbtiGuideSheet({ onClose }: { onClose: () => void }): ReactElement {
  // 시트 맨 위(제목)부터 읽히게 시트 자체에 포커스를 둔다(닫기 버튼은 맨 아래라 스크롤이 내려간다).
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => sheetRef.current?.focus(), []);
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={sheetRef}
        tabIndex={-1}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mbti-guide-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <h2 id="mbti-guide-title" className={styles.title}>
          MBTI가 뭐예요?
        </h2>
        <p className={styles.lead}>
          사람의 성향을 네 가지 기준으로 나눠 16가지 유형으로 표현하는 성격 유형
          지표예요. 기준마다 둘 중 한쪽 글자를 골라 ISTJ, ENFP처럼 네 글자로
          써요.
        </p>
        <ul className={styles.axes}>
          {MBTI_AXES.map((axis) => (
            <li key={axis.name} className={styles.axis}>
              <p className={styles.axisName}>
                {axis.name} <span>· {axis.question}</span>
              </p>
              {axis.options.map((option) => (
                <p key={option.letter} className={styles.option}>
                  <span className={styles.letter}>{option.letter}</span>
                  <span>
                    <strong>{option.label}</strong> {option.desc}
                  </span>
                </p>
              ))}
            </li>
          ))}
        </ul>
        <section className={styles.how} aria-label="푸는 법">
          <h3>이렇게 풀어요</h3>
          <ul>
            <li>상황 설명을 읽고 축마다 한 글자씩 골라 확인을 눌러요.</li>
            <li>틀리면 네 글자 중 몇 개가 맞았는지만 알려 줘요.</li>
            <li>힌트를 열면 앞 축부터 정답 글자가 하나씩 고정돼요.</li>
            <li>한 카테고리에는 16유형이 한 번씩 나와요.</li>
          </ul>
        </section>
        <p className={styles.note}>
          재미로 푸는 퀴즈예요. 유형 하나가 사람을 다 설명하지는 않아요.
        </p>
        <button type="button" className={styles.done} onClick={onClose}>
          알겠어요
        </button>
      </div>
    </div>
  );
}
