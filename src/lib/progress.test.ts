import { describe, expect, it } from 'vitest';
import type { QuizTopic } from '../types/quiz.ts';
import {
  initialProgress,
  openHint,
  openableHints,
  openedHintCount,
  recordCorrect,
  solvedSet,
} from './progress.ts';
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
