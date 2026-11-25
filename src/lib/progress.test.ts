import { describe, expect, it } from 'vitest';
import type { QuizTopic } from '../types/quiz.ts';
import {
  buyItem,
  claimRewards,
  equipHat,
  hatOf,
  initialProgress,
  markRewardsSeen,
  openHint,
  openableHints,
  openedHintCount,
  ownedYardItems,
  placeItem,
  placedItems,
  recordCorrect,
  solvedSet,
  unplaceItem,
  unseenRewards,
  unseenYardItems,
} from './progress.ts';
import { STARTER_ITEM_ID } from './rewards.ts';
import { getQuizTopic } from './quizTopics.ts';

const NONSENSE = getQuizTopic('nonsense');

describe('initialProgress', () => {
  it('30골드, 빈 진행', () => {
    expect(initialProgress()).toEqual({ version: 1, gold: 30, topics: {} });
  });
});

describe('recordCorrect', () => {
  it('처음 맞히면 solved에 넣고 +10', () => {
    const { progress, goldEarned } = recordCorrect({
      progress: initialProgress(),
      topicId: 'nonsense',
      itemId: '7',
    });
    expect(goldEarned).toBe(10);
    expect(progress.gold).toBe(40);
    expect([...solvedSet({ progress, topicId: 'nonsense' })]).toEqual(['7']);
  });

  it('힌트를 연 문제는 +5', () => {
    const opened = openHint({
      progress: initialProgress(),
      topicId: 'nonsense',
      itemId: '7',
      paid: false,
    });
    if (!opened.ok) throw new Error('열려야 함');
    const { goldEarned, progress } = recordCorrect({
      progress: opened.progress,
      topicId: 'nonsense',
      itemId: '7',
    });
    expect(goldEarned).toBe(5);
    expect(progress.gold).toBe(35);
  });

  it('이미 맞힌 문제(다시 풀기)는 골드 0, 진행 그대로', () => {
    const first = recordCorrect({
      progress: initialProgress(),
      topicId: 'nonsense',
      itemId: '7',
    });
    const again = recordCorrect({
      progress: first.progress,
      topicId: 'nonsense',
      itemId: '7',
    });
    expect(again.goldEarned).toBe(0);
    expect(again.progress).toBe(first.progress);
  });

  it('원래 진행 객체는 바꾸지 않는다', () => {
    const before = initialProgress();
    recordCorrect({ progress: before, topicId: 'nonsense', itemId: '1' });
    expect(before).toEqual(initialProgress());
  });
});

describe('openHint', () => {
  it('무료는 골드를 쓰지 않고, 유료는 5골드, 연 단계 수가 는다', () => {
    const free = openHint({
      progress: initialProgress(),
      topicId: 'nonsense',
      itemId: '3',
      paid: false,
    });
    if (!free.ok) throw new Error('열려야 함');
    expect(free.progress.gold).toBe(30);

    const paid = openHint({
      progress: free.progress,
      topicId: 'nonsense',
      itemId: '3',
      paid: true,
    });
    if (!paid.ok) throw new Error('열려야 함');
    expect(paid.progress.gold).toBe(25);
    expect(
      openedHintCount({
        progress: paid.progress,
        topicId: 'nonsense',
        itemId: '3',
      }),
    ).toBe(2);
  });

  it('골드가 5 미만이면 유료 힌트를 열 수 없다(진행 그대로)', () => {
    const poor = { ...initialProgress(), gold: 4 };
    expect(
      openHint({
        progress: poor,
        topicId: 'nonsense',
        itemId: '3',
        paid: true,
      }),
    ).toEqual({ ok: false, reason: 'insufficientGold' });
  });
});

describe('openableHints', () => {
  it('넌센스: 문장 힌트 1(무료) → 첫 글자(골드) → 문장 힌트 2(골드)', () => {
    expect(
      openableHints({
        topic: NONSENSE,
        item: {
          id: '1',
          question: 'q',
          answer: '고생대',
          hints: ['첫째', '둘째'],
        },
      }),
    ).toEqual([
      { text: '첫째', paid: false, type: 'text' },
      { text: "첫 글자는 '고'예요", paid: true, type: 'revealLetter' },
      { text: '둘째', paid: true, type: 'text' },
    ]);
  });

  it('첫 글자는 공백을 건너뛴 정답 글자. 문장이 없는 단계는 뺀다', () => {
    expect(
      openableHints({
        topic: NONSENSE,
        item: { id: '1', question: 'q', answer: ' 아싸 호랑나비' },
      }),
    ).toEqual([
      { text: "첫 글자는 '아'예요", paid: true, type: 'revealLetter' },
    ]);
  });

  it('정답이 한 글자면 첫 글자 힌트를 빼고 문장 힌트만', () => {
    expect(
      openableHints({
        topic: NONSENSE,
        item: { id: '1', question: 'q', answer: '와', hints: ['a', 'b'] },
      }),
    ).toEqual([
      { text: 'a', paid: false, type: 'text' },
      { text: 'b', paid: true, type: 'text' },
    ]);
  });

  it('공개 단계가 여럿이면 n번째 글자를 열고, 정답 전체가 드러나는 단계는 뺀다', () => {
    const topic: QuizTopic = {
      ...NONSENSE,
      hints: [
        { type: 'revealLetter', paid: false },
        { type: 'revealLetter', paid: true },
        { type: 'text', paid: true },
      ],
    };
    expect(
      openableHints({
        topic,
        item: { id: '1', question: 'q', answer: 'ENFP', hints: ['문장'] },
      }),
    ).toEqual([
      { text: "첫 글자는 'E'예요", paid: false, type: 'revealLetter' },
      { text: "2번째 글자는 'N'예요", paid: true, type: 'revealLetter' },
      { text: '문장', paid: true, type: 'text' },
    ]);
    expect(
      openableHints({
        topic,
        item: { id: '1', question: 'q', answer: '고래' },
      }),
    ).toEqual([
      { text: "첫 글자는 '고'예요", paid: false, type: 'revealLetter' },
    ]);
  });

  it('정답이 한 글자면 앞의 한 글자 공개 단계를 건너뛰고 문장 힌트만', () => {
    const mixed: QuizTopic = {
      ...NONSENSE,
      hints: [
        { type: 'revealLetter', paid: false },
        { type: 'text', paid: true },
      ],
    };
    expect(
      openableHints({
        topic: mixed,
        item: { id: '1', question: 'q', answer: 'a', hints: ['문장'] },
      }),
    ).toEqual([{ text: '문장', paid: true, type: 'text' }]);
  });
});

function round(no: number, ids: string[], name?: string) {
  return {
    no,
    items: ids.map((id) => ({ id, question: '?', answer: '!' })),
    ...(name === undefined ? {} : { name }),
  };
}

function solved(topicId: string, ids: string[]) {
  return {
    ...initialProgress(),
    topics: { [topicId]: { solved: ids, hintsOpened: {} } },
  };
}

// Value: protects=다 푼 판의 보상만 받고, 받은 보상은 판이 다시 덜 풀린 상태가 돼도 남는다(설계 "다시는 빼앗지 않는다"); fails_when=claimRewards가 덜 푼 판에도 주거나 기록을 계산으로 덮어써 빼앗으면; why_new=보상 지급이 새로 생김; seam=none; no_claim=화면 표시
describe('claimRewards', () => {
  const rounds = [round(1, ['1', '2']), round(2, ['3', '4'])];

  it('다 푼 판의 보상만 받은 순서대로 기록한다', () => {
    const next = claimRewards({
      progress: solved('nonsense', ['1', '2', '3']),
      topic: NONSENSE,
      rounds,
    });
    expect(next.earnedRewards).toEqual(['hat-ribbon-pink']);
  });

  it('새로 받을 것이 없으면 같은 객체(저장하지 않게)', () => {
    const progress = {
      ...solved('nonsense', ['1', '2']),
      earnedRewards: ['hat-ribbon-pink'],
    };
    expect(claimRewards({ progress, topic: NONSENSE, rounds })).toBe(progress);
    const empty = initialProgress();
    expect(claimRewards({ progress: empty, topic: NONSENSE, rounds })).toBe(
      empty,
    );
  });

  it('문제가 늘어 판이 덜 풀린 상태가 돼도 받은 보상은 그대로', () => {
    const progress = {
      ...solved('nonsense', ['1', '2']),
      earnedRewards: ['hat-ribbon-pink'],
    };
    const grown = [round(1, ['1', '2', '99']), round(2, ['3', '4'])];
    const next = claimRewards({ progress, topic: NONSENSE, rounds: grown });
    expect(next.earnedRewards).toEqual(['hat-ribbon-pink']);
  });

  it('MBTI는 카테고리 이름으로 보상을 찾는다', () => {
    const next = claimRewards({
      progress: solved('mbti', ['1']),
      topic: getQuizTopic('mbti'),
      rounds: [round(1, ['1'], '연애')],
    });
    expect(next.earnedRewards).toEqual(['hat-crown-sky']);
  });
});

// Value: protects="그동안 모은 스티커" 시트는 아직 안 본 보상만, 한 번만 보인다(D8); fails_when=markRewardsSeen이 기록하지 않거나 unseenRewards가 본 것도 돌려주면(시트가 매번 뜸); why_new=새 동작; seam=none; no_claim=시트 화면
describe('markRewardsSeen / unseenRewards', () => {
  it('본 것을 빼고 받은 순서대로, 다 보면 같은 객체', () => {
    const progress = {
      ...initialProgress(),
      earnedRewards: ['hat-ribbon-pink', 'item-yarn-pink'],
    };
    expect(unseenRewards(progress)).toEqual([
      'hat-ribbon-pink',
      'item-yarn-pink',
    ]);
    const seen = markRewardsSeen({ progress, ids: ['item-yarn-pink'] });
    expect(unseenRewards(seen)).toEqual(['hat-ribbon-pink']);
    expect(markRewardsSeen({ progress: seen, ids: ['item-yarn-pink'] })).toBe(
      seen,
    );
  });
});

describe('hatOf / equipHat', () => {
  const earned = {
    ...initialProgress(),
    earnedRewards: ['hat-ribbon-pink', 'item-yarn-pink', 'hat-straw-sky'],
  };

  it('받은 모자만 씌우고, 동물마다 따로 쓴다', () => {
    const worn = equipHat({
      progress: earned,
      pet: 'cat',
      hatId: 'hat-ribbon-pink',
    });
    expect(hatOf({ progress: worn, pet: 'cat' })?.id).toBe('hat-ribbon-pink');
    expect(hatOf({ progress: worn, pet: 'dog' })).toBeUndefined();
    // 같은 모자를 다른 동물도 쓸 수 있다(설계 D9).
    const both = equipHat({
      progress: worn,
      pet: 'dog',
      hatId: 'hat-ribbon-pink',
    });
    expect(both.equipped).toEqual({
      cat: 'hat-ribbon-pink',
      dog: 'hat-ribbon-pink',
    });
  });

  it('받지 않은 모자, 모자가 아닌 보상, 이미 같은 상태면 같은 객체(저장 안 함)', () => {
    expect(
      equipHat({ progress: earned, pet: 'cat', hatId: 'hat-crown-pink' }),
    ).toBe(earned);
    expect(
      equipHat({ progress: earned, pet: 'cat', hatId: 'item-yarn-pink' }),
    ).toBe(earned);
    expect(equipHat({ progress: earned, pet: 'cat', hatId: undefined })).toBe(
      earned,
    );
    const worn = equipHat({
      progress: earned,
      pet: 'cat',
      hatId: 'hat-straw-sky',
    });
    expect(
      equipHat({ progress: worn, pet: 'cat', hatId: 'hat-straw-sky' }),
    ).toBe(worn);
  });

  it('벗기면 그 칸이 빠지고, 다 벗으면 필드가 없어진다', () => {
    const worn = equipHat({
      progress: earned,
      pet: 'cat',
      hatId: 'hat-straw-sky',
    });
    const bare = equipHat({ progress: worn, pet: 'cat', hatId: undefined });
    expect(hatOf({ progress: bare, pet: 'cat' })).toBeUndefined();
    expect(bare).not.toHaveProperty('equipped');
  });

  it('저장된 값이 모르는 모자·받지 않은 모자·모자가 아닌 보상이면 그리지 않는다(설계 D30)', () => {
    const odd = {
      ...earned,
      equipped: {
        cat: 'hat-from-the-future',
        dog: 'hat-crown-pink',
        rabbit: 'item-yarn-pink',
      },
    };
    expect(hatOf({ progress: odd, pet: 'cat' })).toBeUndefined();
    expect(hatOf({ progress: odd, pet: 'dog' })).toBeUndefined();
    expect(hatOf({ progress: odd, pet: 'rabbit' })).toBeUndefined();
    // 모르는 모자를 쓴 칸도 벗길 수는 있다.
    expect(
      equipHat({ progress: odd, pet: 'cat', hatId: undefined }).equipped,
    ).toEqual({
      dog: 'hat-crown-pink',
      rabbit: 'item-yarn-pink',
    });
  });
});

describe('놀이터(PR ③)', () => {
  const base = { ...initialProgress(), gold: 250 };

  // Value: protects=사기는 골드를 100 빼고 한 번만 산다(D37, F8); fails_when=이미 가진 물건을 또 사서 골드가 두 번 빠지거나 골드가 모자란데 사지면; why_new=상점이 새로 생김; seam=none; no_claim=사기 시트 화면
  it('buyItem: 사면 골드 -100, 이미 가졌거나 골드가 모자라면 이유만', () => {
    const bought = buyItem({ progress: base, itemId: 'item-balloon-yellow' });
    expect(bought.ok && bought.progress.gold).toBe(150);
    expect(bought.ok && bought.progress.ownedItems).toEqual([
      'item-balloon-yellow',
    ]);
    const again = buyItem({
      progress: bought.ok ? bought.progress : base,
      itemId: 'item-balloon-yellow',
    });
    expect(again).toEqual({ ok: false, reason: 'owned' });
    expect(
      buyItem({ progress: { ...base, gold: 99 }, itemId: 'item-kite-yellow' }),
    ).toEqual({ ok: false, reason: 'insufficientGold' });
    expect(buyItem({ progress: base, itemId: 'item-yarn-pink' })).toEqual({
      ok: false,
      reason: 'unknown',
    });
  });

  // Value: protects=처음엔 기본 물건이 0번 칸, 다른 칸에 놓아도 기본 물건이 남고 다 치워도 돌아오지 않는다(D14, F4); fails_when=첫 저장이 기본 물건을 지우거나 빈 배치를 지워 기본 물건이 다시 나타나면; why_new=칸 배치가 새로 생김; seam=none; no_claim=마당 그림
  it('기본 물건: 0번 칸에서 시작하고, 첫 저장에도 남고, 다 치우면 비어 있다', () => {
    expect(placedItems(base).map((item) => item?.id)).toEqual([
      STARTER_ITEM_ID,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    const owned = { ...base, earnedRewards: ['item-yarn-pink'] };
    const placed = placeItem({
      progress: owned,
      itemId: 'item-yarn-pink',
      cell: 3,
    });
    expect(placed.placed).toEqual({
      '0': STARTER_ITEM_ID,
      '3': 'item-yarn-pink',
    });
    const cleared = unplaceItem({
      progress: unplaceItem({ progress: placed, cell: 0 }),
      cell: 3,
    });
    expect(cleared.placed).toEqual({});
    expect(placedItems(cleared).every((item) => item === undefined)).toBe(true);
  });

  // Value: protects=빼기는 깨진 저장에 같은 물건이 두 칸에 있어도 모두 빼고, placeItem은 정수가 아닌 칸을 거부한다(F12, 적대 리뷰); fails_when=빼기 뒤 같은 물건이 다른 칸에 다시 나타나거나 "1.5" 칸이 저장되면; why_new=중복 칸·소수 칸 테스트가 없음; seam=none; no_claim=none beyond protects
  it('unplaceItem은 같은 물건의 모든 칸을 비우고, placeItem은 소수 칸을 거부한다', () => {
    const corrupt = {
      ...base,
      earnedRewards: ['item-yarn-pink'],
      placed: { '0': 'item-yarn-pink', '3': 'item-yarn-pink' },
    };
    const cleared = unplaceItem({ progress: corrupt, cell: 0 });
    expect(cleared.placed).toEqual({});
    expect(
      placeItem({ progress: corrupt, itemId: 'item-yarn-pink', cell: 1.5 }),
    ).toBe(corrupt);
  });

  // Value: protects=같은 물건은 한 칸에만 있고 옮기면 원래 칸이 빈다, 가지지 않은 물건은 못 놓는다(설계 line 73, F12); fails_when=placeItem이 옛 자리를 남기거나 안 가진 물건을 놓으면; why_new=새 규칙; seam=none; no_claim=none beyond protects
  it('placeItem: 옮기기·바꾸기, 가지지 않은 물건은 같은 객체', () => {
    const owned = { ...base, earnedRewards: ['item-yarn-pink', 'big-slide'] };
    const a = placeItem({ progress: owned, itemId: 'item-yarn-pink', cell: 1 });
    const moved = placeItem({ progress: a, itemId: 'item-yarn-pink', cell: 2 });
    expect(moved.placed).toEqual({
      '0': STARTER_ITEM_ID,
      '2': 'item-yarn-pink',
    });
    const swapped = placeItem({
      progress: moved,
      itemId: 'big-slide',
      cell: 2,
    });
    expect(swapped.placed).toEqual({ '0': STARTER_ITEM_ID, '2': 'big-slide' });
    expect(
      placeItem({ progress: owned, itemId: 'item-kite-yellow', cell: 1 }),
    ).toBe(owned);
    expect(placeItem({ progress: swapped, itemId: 'big-slide', cell: 2 })).toBe(
      swapped,
    );
  });

  it('placedItems: 모르는 물건·가지지 않은 물건·겹친 물건은 빈칸으로 본다', () => {
    const odd = {
      ...base,
      earnedRewards: ['item-yarn-pink'],
      placed: {
        '0': 'big-from-future',
        '1': 'big-slide',
        '2': 'item-yarn-pink',
        '3': 'item-yarn-pink',
      },
    };
    expect(placedItems(odd).map((item) => item?.id)).toEqual([
      undefined,
      undefined,
      'item-yarn-pink',
      undefined,
      undefined,
      undefined,
    ]);
  });

  // Value: protects=첫 화면 점은 아직 안 본 놀이터 물건 보상만 센다(D38); fails_when=모자나 본 물건도 세어 점이 꺼지지 않으면; why_new=새 규칙; seam=none; no_claim=첫 화면 점 그림
  it('unseenYardItems: 안 본 물건 보상만(모자 제외)', () => {
    const p = {
      ...base,
      earnedRewards: ['hat-ribbon-pink', 'item-yarn-pink', 'big-slide'],
      seenRewards: ['big-slide'],
    };
    expect(unseenYardItems(p)).toEqual(['item-yarn-pink']);
    expect(ownedYardItems(p).map((item) => item.id)).toEqual([
      STARTER_ITEM_ID,
      'item-yarn-pink',
      'big-slide',
    ]);
  });
});
