import { describe, expect, it } from 'vitest';
import mbtiItems from '../../data/mbti.json';
import type { QuizItem } from '../types/quiz.ts';
import { buildCategories } from './categories.ts';
import { getQuizTopic } from './quizTopics.ts';
import {
  MBTI_REWARDS,
  NONSENSE_REWARDS,
  REWARDS,
  getReward,
  rewardFor,
  SHOP_ITEM_IDS,
  SHOP_PRICE,
  STARTER_ITEM_ID,
  getYardItem,
  likedBy,
} from './rewards.ts';

const NONSENSE = getQuizTopic('nonsense');
const MBTI = getQuizTopic('mbti');

function stage(no: number, name?: string) {
  return { no, items: [], ...(name === undefined ? {} : { name }) };
}

// Value: protects=보상 id는 진행에 영원히 남는 값(설계 R3·D4: 표를 1~55번과 MBTI 7칸으로 고정); fails_when=보상 id를 바꾸거나 지우거나 칸 순서를 바꾸면 이미 받은 보상이 사라지거나 다른 칸으로 옮겨진다; why_new=보상 표가 새로 생김; seam=none; no_claim=그림 모양
describe('보상 표', () => {
  it('넌센스 1~55번과 MBTI 7칸, id는 이 목록으로 고정', () => {
    expect(NONSENSE_REWARDS).toHaveLength(55);
    expect(Object.keys(MBTI_REWARDS)).toEqual([
      '일상',
      '연애',
      '카톡',
      '여행',
      '소비',
      '직장',
      '스트레스',
    ]);
    expect([...REWARDS.keys()].sort()).toMatchInlineSnapshot(`
      [
        "big-acorn-tree",
        "big-carrot-patch",
        "big-fountain",
        "big-pond",
        "big-rainbow",
        "big-sandcastle",
        "big-seesaw",
        "big-slide",
        "big-swing",
        "big-tent",
        "big-treehouse",
        "hat-beanie-mint",
        "hat-beanie-pink",
        "hat-beanie-sky",
        "hat-beanie-yellow",
        "hat-cap-mint",
        "hat-cap-pink",
        "hat-cap-sky",
        "hat-cap-yellow",
        "hat-crown-mint",
        "hat-crown-pink",
        "hat-crown-sky",
        "hat-crown-yellow",
        "hat-flower-mint",
        "hat-flower-pink",
        "hat-flower-yellow",
        "hat-party-mint",
        "hat-party-pink",
        "hat-party-sky",
        "hat-party-yellow",
        "hat-ribbon-mint",
        "hat-ribbon-pink",
        "hat-ribbon-sky",
        "hat-ribbon-yellow",
        "hat-straw-mint",
        "hat-straw-pink",
        "hat-straw-sky",
        "hat-straw-yellow",
        "hat-tophat-mint",
        "hat-tophat-pink",
        "hat-tophat-yellow",
        "item-ball-mint",
        "item-ball-pink",
        "item-ball-sky",
        "item-balloon-mint",
        "item-balloon-pink",
        "item-balloon-sky",
        "item-bone-mint",
        "item-bone-pink",
        "item-bone-sky",
        "item-kite-mint",
        "item-kite-pink",
        "item-kite-sky",
        "item-mushroom-mint",
        "item-mushroom-pink",
        "item-mushroom-sky",
        "item-pot-mint",
        "item-pot-pink",
        "item-pot-sky",
        "item-yarn-mint",
        "item-yarn-pink",
        "item-yarn-sky",
      ]
    `);
  });

  it('62칸은 모두 다른 보상: 모자 30, 작은 물건 21, 큰 물건 11(5스테이지마다)', () => {
    const all = [...NONSENSE_REWARDS, ...Object.values(MBTI_REWARDS)];
    expect(new Set(all).size).toBe(62);
    const kinds = all.map((id) => getReward(id)!.kind);
    expect(kinds.filter((kind) => kind === 'hat')).toHaveLength(30);
    expect(kinds.filter((kind) => kind === 'item')).toHaveLength(21);
    NONSENSE_REWARDS.forEach((id, i) => {
      expect(getReward(id)!.kind === 'big').toBe((i + 1) % 5 === 0);
    });
  });

  it('MBTI 보상 칸 이름은 데이터의 카테고리 이름과 같다', () => {
    const names = buildCategories({
      items: mbtiItems as QuizItem[],
    }).map((c) => c.name);
    expect(names.sort()).toEqual(Object.keys(MBTI_REWARDS).sort());
  });

  it('이름은 색 + 모양("분홍 리본"), 큰 물건은 모양만', () => {
    expect(getReward('hat-ribbon-pink')?.name).toBe('분홍 리본');
    expect(getReward('item-bone-sky')?.name).toBe('하늘 뼈다귀 장난감');
    expect(getReward('big-acorn-tree')?.name).toBe('도토리 나무');
    expect(getReward('hat-unknown-pink')).toBeUndefined();
    expect(getReward('big-slide-pink')).toBeUndefined();
  });
});

describe('rewardFor', () => {
  it('넌센스는 스테이지 번호, MBTI는 카테고리 이름으로 찾는다', () => {
    expect(rewardFor({ topic: NONSENSE, round: stage(1) })?.id).toBe(
      'hat-ribbon-pink',
    );
    expect(rewardFor({ topic: NONSENSE, round: stage(55) })?.id).toBe(
      'big-rainbow',
    );
    expect(rewardFor({ topic: MBTI, round: stage(2, '연애') })?.id).toBe(
      'hat-crown-sky',
    );
  });

  // Value: protects=문제가 늘어 생긴 56번 스테이지는 보상 없는 보통 칸(D4); fails_when=표 밖 번호에서 다른 칸 보상을 주거나 던지면; why_new=새 규칙; seam=none; no_claim=칸 모양
  it('표 밖의 판(56번, 모르는 카테고리)은 보상이 없다', () => {
    expect(rewardFor({ topic: NONSENSE, round: stage(56) })).toBeUndefined();
    expect(
      rewardFor({ topic: MBTI, round: stage(8, '새 카테고리') }),
    ).toBeUndefined();
  });
});

describe('놀이터 물건(PR ③)', () => {
  // Value: protects=상점은 노랑 작은 물건 7개이고 보상 표와 겹치지 않는다(D36, F5); fails_when=보상 표에 노랑 물건이 들어가 산 것과 받은 것이 겹치거나 상점 목록이 바뀌면; why_new=상점이 새로 생김; seam=none; no_claim=가격 균형
  it('상점은 노랑 작은 물건 7개이고 어느 보상 표에도 없다', () => {
    expect(SHOP_ITEM_IDS).toHaveLength(7);
    expect(SHOP_ITEM_IDS.every((id) => /^item-[a-z]+-yellow$/.test(id))).toBe(
      true,
    );
    for (const id of SHOP_ITEM_IDS) {
      expect(REWARDS.has(id), id).toBe(false);
      expect(getYardItem(id)?.name, id).toMatch(/^노랑 /);
    }
    expect(SHOP_PRICE).toBe(100);
  });

  it('기본 물건은 보상이 아니고 놀이터 물건으로 찾을 수 있다(D14)', () => {
    expect(REWARDS.has(STARTER_ITEM_ID)).toBe(false);
    expect(getYardItem(STARTER_ITEM_ID)?.name).toBe('모래 놀이통');
    expect(getYardItem('hat-ribbon-pink')).toBeUndefined();
  });

  // Value: protects=동물마다 좋아하는 모양이 하나이고 그 모양은 모든 색에 적용된다(D39, PR ① P1 TODO); fails_when=LIKED_BY가 빠지거나 한 동물이 두 모양을 갖거나 색별로 달라지면; why_new=likedBy가 새로 생김; seam=none; no_claim=마당에서 서는 자리(YardScene 테스트)
  it('동물마다 좋아하는 모양이 하나씩, 색과 상관없이', () => {
    const shapesByPet = new Map<string, Set<string>>();
    for (const id of [...REWARDS.keys(), ...SHOP_ITEM_IDS]) {
      const item = getYardItem(id);
      if (!item) continue;
      const pet = likedBy(item);
      if (!pet) continue;
      shapesByPet.set(pet, (shapesByPet.get(pet) ?? new Set()).add(item.shape));
    }
    expect(
      Object.fromEntries([...shapesByPet].map(([k, v]) => [k, [...v]])),
    ).toEqual({
      cat: ['yarn'],
      dog: ['bone'],
      rabbit: ['carrot-patch'],
      squirrel: ['acorn-tree'],
    });
    expect(likedBy(getYardItem('item-yarn-yellow')!)).toBe('cat');
    expect(likedBy(getYardItem('item-yarn-mint')!)).toBe('cat');
  });
});
