import { useState, type ReactElement, type ReactNode } from 'react';
import { HINT_PRICE, type OpenableHint } from '../lib/progress.ts';
import styles from './HintPanel.module.css';

type HintPanelProps = {
  /** 이미 연 힌트. */
  opened: readonly OpenableHint[];
  /** 이 문제의 힌트 카드 수(열 수 있는 힌트 전체). */
  total: number;
  /** 다음 힌트(없으면 카드 더미를 숨김: 맞힌 뒤). */
  next: { paid: boolean } | undefined;
  canOpen: boolean;
  /** 유료 힌트인데 골드가 모자람("골드 부족"). */
  goldShort: boolean;
  onOpen: () => void;
  /** 힌트 카드와 같은 줄 왼쪽에 둘 것(친구한테 내기 버튼). */
  leading?: ReactNode;
};

/**
 * 힌트 카드(docs/ui-play-layout/spec.md "문제 카드와 힌트"): 문제 카드 아래 오른쪽에 뒤집힌 카드가
 * 힌트 수만큼 놓이고, 다음 카드만 눌러서 뒤집는다(무료 / 5골드 / 골드 부족). 뒤집힌 카드의 문장은
 * 아래 목록에 번호와 함께 쌓인다. 화면이 바뀔 때마다(문제마다) key로 새로 그려 방금 연 카드만 움직인다.
 */
export function HintPanel({
  opened,
  total,
  next,
  canOpen,
  goldShort,
  onOpen,
  leading,
}: HintPanelProps): ReactElement {
  // 방금 연 카드 번호(그 카드·문장만 뒤집기 연출).
  const [fresh, setFresh] = useState(-1);
  const nextIndex = opened.length;
  const label = !next?.paid
    ? '힌트 무료'
    : goldShort
      ? '골드 부족'
      : `힌트 ${HINT_PRICE}골드`;

  return (
    <section aria-label="힌트" className={styles.panel}>
      <div className={styles.row}>
        {leading}
        {next && (
          <div className={styles.deck}>
            {Array.from({ length: Math.max(total, nextIndex + 1) }, (_, i) => {
              if (i < nextIndex) {
                return (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={`${styles.card} ${styles.open}`}
                    data-fresh={i === fresh || undefined}
                  >
                    <span className={styles.cardNo}>{i + 1}</span>
                    <CheckIcon />
                    {i === fresh && opened[i]!.paid && (
                      <span className={styles.spend}>-{HINT_PRICE}</span>
                    )}
                  </span>
                );
              }
              if (i === nextIndex) {
                return (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.card} ${styles.next}`}
                    aria-label={label}
                    disabled={!canOpen}
                    onClick={() => {
                      setFresh(i);
                      onOpen();
                    }}
                  >
                    <span className={styles.cardFace} aria-hidden="true">
                      <BulbIcon />
                    </span>
                    <span className={styles.price} aria-hidden="true">
                      {!next.paid ? (
                        '무료'
                      ) : goldShort ? (
                        '부족'
                      ) : (
                        <>
                          <span className={styles.coin} />
                          {HINT_PRICE}
                        </>
                      )}
                    </span>
                  </button>
                );
              }
              return (
                <span
                  key={i}
                  aria-hidden="true"
                  className={`${styles.card} ${styles.locked}`}
                >
                  <LockIcon />
                  <span className={styles.price}>
                    <span className={styles.coin} />
                    {HINT_PRICE}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </div>
      {opened.length > 0 && (
        <ol className={styles.list}>
          {opened.map((hint, index) => (
            <li key={index} data-fresh={index === fresh || undefined}>
              <span className={styles.itemNo} aria-hidden="true">
                {index + 1}
              </span>
              <HintText
                text={hint.text}
                letter={hint.type === 'revealLetter'}
              />
            </li>
          ))}
        </ol>
      )}
      {fresh >= 0 && opened.length > fresh && (
        // 다른 힌트를 연 줄 알도록 새 문장을 읽어 준다.
        <p className={styles.srOnly} aria-live="polite">
          {`힌트 ${fresh + 1}: ${opened[fresh]!.text}`}
        </p>
      )}
    </section>
  );
}

/** 한 글자 공개 힌트는 따옴표 속 글자를 글자 칸처럼 크게 보여 준다. */
function HintText({
  text,
  letter,
}: {
  text: string;
  letter: boolean;
}): ReactElement {
  const match = letter ? /^(.*)'(.+?)'(.*)$/.exec(text) : null;
  if (!match) return <span>{text}</span>;
  return (
    <span>
      {match[1]}
      <span className={styles.letter}>{match[2]}</span>
      {match[3]}
    </span>
  );
}

function BulbIcon(): ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      <path d="M9 18h6M10 21h4" />
      <path
        d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"
        fill="var(--color-gold)"
      />
    </svg>
  );
}

function LockIcon(): ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function CheckIcon(): ReactElement {
  return (
    <svg
      className={styles.check}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}
