// 놀이터 아래쪽(설계 D13 + D33): 화면 아래 고정 탭 막대 "내 물건 / 상점 / 모자"와 그 위 가로로 넘기는 카드 줄.
// 상점 카드를 누르면 사기 시트(D16), 사면 "…을 샀어요 · 바로 놓기" 알림. 모자 탭은 HatRow(PR ②).
import { useEffect, useState, type ReactElement } from 'react';
import { useModalSheet } from '../hooks/useModalSheet.ts';
import { useProgress } from '../hooks/useProgress.ts';
import { getPestAnimal } from '../lib/pestAnimals.ts';
import { ownedYardItems, placedItems } from '../lib/progress.ts';
import {
  SHOP_ITEM_IDS,
  SHOP_PRICE,
  getYardItem,
  likedBy,
  type Reward,
} from '../lib/rewards.ts';
import { josa } from '../lib/shareLink.ts';
import type { PetId } from '../types/settings.ts';
import { HatRow } from './HatRow.tsx';
import { PetPortrait } from './PetPortrait.tsx';
import { RewardArt } from './RewardArt.tsx';
import styles from './ItemShelf.module.css';

export type ShelfTab = 'mine' | 'shop' | 'hats';

const TABS: readonly { id: ShelfTab; label: string }[] = [
  { id: 'mine', label: '내 물건' },
  { id: 'shop', label: '상점' },
  { id: 'hats', label: '모자' },
];

const SHOP_ITEMS: readonly Reward[] = SHOP_ITEM_IDS.flatMap(
  (id) => getYardItem(id) ?? [],
);

export function ItemShelf({
  tab,
  onTab,
  pet,
  onPlace,
}: {
  tab: ShelfTab;
  onTab: (tab: ShelfTab) => void;
  pet: PetId;
  /** 물건을 칸에 놓으러 가기(놓기 모드). */
  onPlace: (item: Reward) => void;
}): ReactElement {
  const { progress, buyItem } = useProgress();
  const owned = ownedYardItems(progress);
  const ownedIds = new Set(owned.map((item) => item.id));
  const placedIds = new Set(
    placedItems(progress).flatMap((item) => (item ? [item.id] : [])),
  );
  const [buying, setBuying] = useState<Reward | undefined>(undefined);
  const [bought, setBought] = useState<Reward | undefined>(undefined);
  // 산 알림은 3초 뒤 사라진다(D16).
  useEffect(() => {
    if (!bought) return;
    const timer = setTimeout(() => setBought(undefined), 3000);
    return () => clearTimeout(timer);
  }, [bought]);

  const card = (item: Reward, action: ReactElement): ReactElement => {
    const fan = likedBy(item);
    return (
      <li key={item.id} className={styles.card}>
        {fan && (
          <span
            className={styles.face}
            role="img"
            aria-label={`${josa(getPestAnimal(fan).label, '이', '가')} 좋아해요`}
          >
            <PetPortrait animal={fan} headOnly size={24} />
          </span>
        )}
        <span className={styles.art} aria-hidden="true">
          <RewardArt reward={item} size={56} />
        </span>
        <span className={styles.name}>{item.name}</span>
        {action}
      </li>
    );
  };

  const placeButton = (item: Reward, label = '놓기'): ReactElement =>
    placedIds.has(item.id) ? (
      <span className={styles.placed}>놓임</span>
    ) : (
      <button
        type="button"
        className={styles.place}
        aria-label={`${item.name} ${label}`}
        onClick={() => onPlace(item)}
      >
        {label}
      </button>
    );

  return (
    <>
      <div className={styles.panel}>
        {tab === 'mine' && (
          <ul className={styles.row} aria-label="내 물건">
            {owned.map((item) => card(item, placeButton(item)))}
          </ul>
        )}
        {tab === 'shop' && (
          <ul className={styles.row} aria-label="상점">
            {SHOP_ITEMS.map((item) =>
              ownedIds.has(item.id)
                ? card(item, placeButton(item, '가짐 · 놓기'))
                : card(
                    item,
                    <button
                      type="button"
                      className={styles.price}
                      data-short={progress.gold < SHOP_PRICE}
                      aria-label={`${item.name}, ${SHOP_PRICE}골드`}
                      onClick={() => setBuying(item)}
                    >
                      <span className={styles.coin} aria-hidden="true" />
                      {SHOP_PRICE}
                    </button>,
                  ),
            )}
          </ul>
        )}
        {tab === 'hats' && (
          <div className={styles.hats}>
            <HatRow animal={pet} />
          </div>
        )}
      </div>
      {bought && (
        <div className={styles.notice} role="status">
          {josa(bought.name, '을', '를')} 샀어요
          <button
            type="button"
            className={styles.noticeAction}
            onClick={() => {
              setBought(undefined);
              onPlace(bought);
            }}
          >
            바로 놓기
          </button>
        </div>
      )}
      <nav className={styles.bar} aria-label="놀이터 탭">
        <div role="tablist" className={styles.tabs}>
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={styles.tab}
              onClick={() => onTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
      {buying && (
        <BuySheet
          item={buying}
          gold={progress.gold}
          onClose={() => setBuying(undefined)}
          onBuy={() => {
            const result = buyItem(buying.id);
            setBuying(undefined);
            if (result.ok) setBought(buying);
          }}
        />
      )}
    </>
  );
}

function BuySheet({
  item,
  gold,
  onBuy,
  onClose,
}: {
  item: Reward;
  gold: number;
  onBuy: () => void;
  onClose: () => void;
}): ReactElement {
  const sheetRef = useModalSheet(onClose);
  const short = SHOP_PRICE - gold;
  const fan = likedBy(item);
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <span className={styles.sheetArt} aria-hidden="true">
          <RewardArt reward={item} size={96} />
        </span>
        <h2 id="buy-title" className={styles.sheetTitle}>
          {josa(item.name, '을', '를')} {SHOP_PRICE}골드에 살까요?
        </h2>
        {fan && (
          <p className={styles.sheetNote}>
            {josa(getPestAnimal(fan).label, '이', '가')} 좋아해요
          </p>
        )}
        {short > 0 && (
          <p className={styles.short} role="status">
            골드 {short} 모자라요
          </p>
        )}
        <div className={styles.sheetActions}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className={styles.buy}
            disabled={short > 0}
            onClick={onBuy}
          >
            사기
          </button>
        </div>
      </div>
    </div>
  );
}
