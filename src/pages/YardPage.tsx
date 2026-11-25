// 놀이터 화면(/playground, 설계 D13–D20, D33). 위 마당(YardScene), 아래 고정 탭 막대와 카드 줄(ItemShelf).
// 저장된 진행으로 바로 그리고, 받을 보상은 뒤에서 기록한다(D15: 실패하면 한 줄 + 다시).
// 처음 탭: 아직 안 본 물건 보상이 있으면 내 물건, 없으면 상점(D38). 열면 가진 물건 보상을 본 것으로 기록한다.
import { useEffect, useState, type ReactElement } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ClaimTopics } from '../components/ClaimTopics.tsx';
import { ItemShelf, type ShelfTab } from '../components/ItemShelf.tsx';
import { SettingsButton } from '../components/SettingsButton.tsx';
import { GoldBadge } from '../components/StatusViews.tsx';
import { YardScene } from '../components/YardScene.tsx';
import { useProgress } from '../hooks/useProgress.ts';
import { useSettings } from '../hooks/useSettings.ts';
import {
  hatOf,
  ownedYardItems,
  placedItems,
  unseenYardItems,
} from '../lib/progress.ts';
import { getYardItem, type Reward } from '../lib/rewards.ts';
import pageStyles from './Page.module.css';
import styles from './YardPage.module.css';

/** 결과 카드 "놀이터에 놓기"가 넘기는 상태(설계 D6, F7). */
export type YardLocationState = { place?: string };

export function YardPage(): ReactElement {
  const { progress, placeItem, markRewardsSeen } = useProgress();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const requested = (location.state as YardLocationState | null)?.place;
  const [tab, setTab] = useState<ShelfTab>(() =>
    unseenYardItems(progress).length > 0 ? 'mine' : 'shop',
  );
  const [placing, setPlacing] = useState<Reward | undefined>(() => {
    const item = requested === undefined ? undefined : getYardItem(requested);
    return item && ownedYardItems(progress).some((own) => own.id === item.id)
      ? item
      : undefined;
  });
  // 빈 칸을 눌렀는데 놓을 물건이 없을 때 등, 마당 아래 한 줄 안내.
  const [hint, setHint] = useState<'empty' | 'pick' | undefined>(undefined);
  const [retryClaim, setRetryClaim] = useState<(() => void) | undefined>(
    undefined,
  );
  // 열 때 내 물건 탭에 보여 준 새 물건 보상만 본 것으로(첫 화면 점이 꺼진다, D38).
  // 연 뒤에 뒤에서 기록된 보상은 보여 주지 않았으므로 남겨 둔다(다음에 점·스티커 시트로 알린다).
  const [shownUnseen] = useState(() => unseenYardItems(progress));
  useEffect(() => {
    if (shownUnseen.length > 0) markRewardsSeen(shownUnseen);
  }, [shownUnseen, markRewardsSeen]);
  // 결과 카드가 넘긴 "놓기" 요청은 한 번만 쓴다(새로 고침·뒤로 가기로 다시 놓기 모드가 되지 않게).
  useEffect(() => {
    if (requested !== undefined) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [requested, navigate, location.pathname]);
  // 놓기 모드에서 Esc는 취소(D23).
  useEffect(() => {
    if (!placing) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setPlacing(undefined);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [placing]);

  const items = placedItems(progress);
  const placedIds = new Set(items.flatMap((item) => (item ? [item.id] : [])));
  const unplaced = ownedYardItems(progress).filter(
    (item) => !placedIds.has(item.id),
  );

  const onCell = (cell: number): void => {
    if (placing) {
      placeItem(placing.id, cell);
      setPlacing(undefined);
      setHint(undefined);
      return;
    }
    // 놓인 칸이든 빈 칸이든, 놓을 물건이 남아 있으면 내 물건에서 고르게 한다.
    if (unplaced.length > 0) {
      setTab('mine');
      setHint('pick');
    } else {
      setHint('empty');
    }
  };

  return (
    <main className={`${pageStyles.page} ${styles.page}`}>
      <ClaimTopics onFailure={(retry) => setRetryClaim(() => retry)} />
      <header className={pageStyles.header}>
        <Link to="/" className={pageStyles.back} aria-label="첫 화면으로">
          ←
        </Link>
        <h1>놀이터</h1>
        <span className={pageStyles.headerEnd}>
          <GoldBadge gold={progress.gold} compact />
          <SettingsButton />
        </span>
      </header>
      <YardScene
        items={items}
        pet={settings.pet}
        hatOf={(pet) => hatOf({ progress, pet })}
        placing={placing}
        onCell={onCell}
        onCancelPlacing={() => setPlacing(undefined)}
      />
      {retryClaim && (
        <p className={styles.line} role="status">
          새 보상을 확인하지 못했어요 ·{' '}
          <button
            type="button"
            className={styles.lineAction}
            onClick={retryClaim}
          >
            다시
          </button>
        </p>
      )}
      {hint === 'empty' && (
        <p className={styles.line} role="status">
          스테이지를 깨면 물건이 생겨요{' '}
          <button
            type="button"
            className={styles.lineAction}
            onClick={() => navigate('/')}
          >
            스테이지 하러 가기
          </button>
        </p>
      )}
      {hint === 'pick' && (
        <p className={styles.line} role="status">
          놓을 물건의 “놓기”를 눌러요
        </p>
      )}
      <ItemShelf
        tab={tab}
        onTab={setTab}
        pet={settings.pet}
        onPlace={(item) => {
          setHint(undefined);
          setPlacing(item);
          globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
        }}
      />
    </main>
  );
}
