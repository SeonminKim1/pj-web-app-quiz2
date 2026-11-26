// 스티커첩(설계 G 시안, D4·D5·D7·D12·D23·D24): 칭호 카드 + 판마다 스티커 칸. 넌센스(3열)와 MBTI(2열 큰 칸)가 같이 쓴다.
// 모든 칸은 언제든 누를 수 있다(잠금 없음). 받은 칸은 스티커가 선명하고, 아직이면 받을 보상이 흐리게 보인다.
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type RefObject,
} from 'react';
import { useLocation, useNavigationType } from 'react-router';
import type { Album, AlbumCell } from '../lib/album.ts';
import { clearAlbumFlash, peekAlbumFlash } from '../lib/rewardFlash.ts';
import { RewardArt } from './RewardArt.tsx';
import styles from './StickerAlbum.module.css';
import { prefersReducedMotion } from '../lib/reducedMotion.ts';

type StickerAlbumProps = {
  album: Album;
  /** small = 넌센스 3열, large = MBTI 2열 큰 칸(이름이 칸 이름). */
  size: 'small' | 'large';
  /** 진행 문구의 동사("풂", "맞힘"). */
  verb: string;
  onSelect: (no: number) => void;
};

export function StickerAlbum({
  album,
  size,
  verb,
  onSelect,
}: StickerAlbumProps): ReactElement {
  // 다 풀지 않은 첫 칸 = 지금 할 차례("여기부터").
  const current = album.cells.find((cell) => !cell.completed)?.no;
  const currentRef = useRef<HTMLButtonElement>(null);
  const [flashId] = useState(peekAlbumFlash);
  useEffect(() => clearAlbumFlash(), []);
  useScrollToCurrent(currentRef);
  const { title } = album;
  return (
    <>
      {title && (
        <section className={styles.titleCard} aria-label="칭호">
          <span className={styles.titleName}>{title.name}</span>
          <span
            className={styles.titleBar}
            aria-hidden="true"
            style={
              { '--progress': `${title.progress * 100}%` } as CSSProperties
            }
          />
          {title.next && (
            <span className={styles.titleNext}>
              {title.next.name}까지 {title.next.remaining}문제
            </span>
          )}
        </section>
      )}
      <section className={styles.album} aria-labelledby="album-title">
        <header className={styles.albumHeader}>
          <h2 id="album-title">스티커 수집첩</h2>
          {album.rewardCount > 0 && (
            <span className={styles.count}>
              스티커 {album.earnedCount} / {album.rewardCount}장
            </span>
          )}
        </header>
        <ul className={styles.grid} data-size={size}>
          {album.cells.map((cell) => (
            <li key={cell.no}>
              <StickerCell
                cell={cell}
                size={size}
                verb={verb}
                current={cell.no === current}
                flash={cell.reward !== undefined && cell.reward.id === flashId}
                buttonRef={cell.no === current ? currentRef : undefined}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function StickerCell({
  cell,
  size,
  verb,
  current,
  flash,
  buttonRef,
  onSelect,
}: {
  cell: AlbumCell;
  size: 'small' | 'large';
  verb: string;
  current: boolean;
  flash: boolean;
  buttonRef: RefObject<HTMLButtonElement | null> | undefined;
  onSelect: (no: number) => void;
}): ReactElement {
  const { reward, earned, completed, solvedCount, total } = cell;
  const started = solvedCount > 0;
  // 받았는데 문제가 늘어 다시 덜 푼 칸(설계 D4).
  const added = earned && !completed ? total - solvedCount : 0;
  const name = size === 'small' ? `스테이지 ${cell.no}` : cell.label;
  const label = [
    `${name}, ${total}문제 중 ${solvedCount}문제 ${verb}`,
    reward
      ? earned
        ? `${reward.name} 받음`
        : `받을 보상 ${reward.name}`
      : completed
        ? '완료'
        : undefined,
    added > 0 ? `새 문제 ${added}개` : undefined,
    current ? '지금 차례' : undefined,
  ]
    .filter(Boolean)
    .join(', ');
  const artSize =
    (size === 'large' ? 60 : 48) * (reward?.kind === 'big' ? 1.2 : 1);
  return (
    <button
      ref={buttonRef}
      type="button"
      className={styles.cell}
      data-earned={earned}
      data-big={reward?.kind === 'big'}
      data-current={current}
      data-flash={flash}
      aria-current={current ? 'step' : undefined}
      aria-label={label}
      onClick={() => onSelect(cell.no)}
    >
      {current && (
        <span className={styles.here} aria-hidden="true">
          여기부터
        </span>
      )}
      <span className={styles.no} aria-hidden="true">
        {cell.label}
      </span>
      {reward && (
        <span className={styles.art} data-faded={!earned} aria-hidden="true">
          <RewardArt reward={reward} size={Math.round(artSize)} />
        </span>
      )}
      {added > 0 ? (
        <span className={styles.added} aria-hidden="true">
          새 문제 {added}개
        </span>
      ) : (
        !earned &&
        (started || !reward) && (
          <span className={styles.progress} aria-hidden="true">
            <span className={styles.progressText}>
              {completed ? '완료' : `${solvedCount}/${total}`}
            </span>
            {!completed && (
              <span
                className={styles.bar}
                style={
                  {
                    '--progress': `${(solvedCount / Math.max(1, total)) * 100}%`,
                  } as CSSProperties
                }
              />
            )}
          </span>
        )
      )}
    </button>
  );
}

// 목록에 새로 들어오면 지금 차례 칸이 화면 밖일 때 가운데로 한 번 스크롤한다(설계 D24).
// 뒤로 가기로 돌아온 경우는 브라우저가 기억한 자리를 지킨다.
function useScrollToCurrent(ref: RefObject<HTMLButtonElement | null>): void {
  const navigationType = useNavigationType();
  const { key } = useLocation();
  useEffect(() => {
    if (navigationType === 'POP' && key !== 'default') return;
    const cell = ref.current;
    if (!cell || typeof cell.scrollIntoView !== 'function') return;
    const rect = cell.getBoundingClientRect();
    if (rect.top >= 0 && rect.bottom <= globalThis.innerHeight) return;
    const reduce = prefersReducedMotion();
    cell.scrollIntoView({
      block: 'center',
      behavior: reduce ? 'auto' : 'smooth',
    });
  }, [navigationType, key, ref]);
}
