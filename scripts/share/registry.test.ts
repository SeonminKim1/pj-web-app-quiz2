// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { QuizItem } from '../../src/types/quiz.ts';
import {
  answerKey,
  checkRegistryShape,
  checkShareData,
  formatShareProblem,
  planRegistration,
} from './registry.ts';
import { fitCardText, wrapText } from './textFit.ts';

const item = (over: Partial<QuizItem> = {}): QuizItem => ({
  id: '5',
  question: '뽑으면 우는 식물은?',
  answer: '우엉',
  shareable: true,
  ...over,
});

describe('answerKey', () => {
  it('고정 입력 → 고정 해시(바뀌면 등록부 전체가 깨지므로 골든으로 고정)', () => {
    expect(answerKey('우엉')).toBe(answerKey('우엉'.normalize('NFD')));
    expect(answerKey(' 우 엉 ')).toBe(answerKey('우엉'));
    expect(answerKey('Hello World')).toBe(answerKey('helloworld'));
    expect(answerKey('helloworld')).toBe('936a185caaa266bb');
  });
});

describe('textFit', () => {
  it('띄어쓰기에서 먼저 나누고, 56px 3줄이 안 되면 48px 4줄', () => {
    expect(fitCardText('뽑으면 우는 식물은?')).toEqual({
      size: 56,
      lines: ['뽑으면 우는', '식물은?'],
    });
    const long =
      '메이저리그에서 던지는 공 중에서 가장 멀리 가는 공은 무엇일까요?';
    expect(fitCardText(long)?.size).toBe(48);
    expect(fitCardText('가'.repeat(49))).toBeUndefined();
    expect(wrapText('가나다라마바사아자차카', 10, 3)).toEqual([
      '가나다라마바사아자차',
      '카',
    ]);
  });
});

describe('checkShareData', () => {
  const reg = (over: Partial<QuizItem> = {}) => [
    {
      id: '5',
      answerKey: answerKey(over.answer ?? '우엉'),
      firstPublished: '2026-11-18',
    },
  ];

  it('등록된 공유 문제는 통과, 등록 안 된 공유 문제는 QD_UNREGISTERED', () => {
    expect(checkShareData({ items: [item()], registry: reg() })).toEqual([]);
    expect(
      checkShareData({ items: [item()], registry: [] }).map((p) => p.code),
    ).toEqual(['QD_UNREGISTERED']);
  });

  it('공유를 멈춘 등록 문제는 통과(공유 ⊆ 등록부), 정답이 바뀌면 QD_ANSWER_CHANGED', () => {
    expect(
      checkShareData({ items: [item({ shareable: false })], registry: reg() }),
    ).toEqual([]);
    const problems = checkShareData({
      items: [item({ answer: '연근' })],
      registry: reg(),
    });
    expect(problems.map((p) => p.code)).toEqual(['QD_ANSWER_CHANGED']);
    expect(formatShareProblem(problems[0]!)).toContain(
      'Fix: 공개된 id는 정답을 바꿀 수 없어요',
    );
  });

  it('카드 문구에 정답(2자 이상)이 있으면 QD_ANSWER_IN_CARD, allowAnswerInCard면 통과', () => {
    const leaky = item({ question: '우 엉 은 식물?' });
    expect(
      checkShareData({ items: [leaky], registry: reg() }).map((p) => p.code),
    ).toEqual(['QD_ANSWER_IN_CARD']);
    expect(
      checkShareData({
        items: [{ ...leaky, allowAnswerInCard: true }],
        registry: reg(),
      }),
    ).toEqual([]);
  });

  it('카드에 안 들어가면 QD_TEXT_FIT, ogText로 해결', () => {
    const long = item({ question: '가'.repeat(60) });
    expect(
      checkShareData({ items: [long], registry: reg() }).map((p) => p.code),
    ).toEqual(['QD_TEXT_FIT']);
    expect(
      checkShareData({
        items: [{ ...long, ogText: '짧은 문구' }],
        registry: reg(),
      }),
    ).toEqual([]);
  });

  it('직전 커밋 등록부에 있던 id가 사라지면 QD_REGISTRY_SHRUNK', () => {
    expect(
      checkShareData({ items: [], registry: [], previousRegistry: reg() }).map(
        (p) => p.code,
      ),
    ).toEqual(['QD_REGISTRY_SHRUNK']);
  });
});

describe('checkRegistryShape', () => {
  it('형식·중복·정렬을 검사한다', () => {
    const ok = {
      id: '5',
      answerKey: 'a'.repeat(16),
      firstPublished: '2026-11-18',
    };
    expect(checkRegistryShape([ok]).problems).toEqual([]);
    expect(checkRegistryShape([ok, ok]).problems.map((p) => p.message)).toEqual(
      ['id 5가 두 번 있어요'],
    );
    expect(checkRegistryShape([{ ...ok, id: '9' }, ok]).problems).toHaveLength(
      1,
    );
    expect(
      checkRegistryShape([{ ...ok, answerKey: 'xyz' }]).problems,
    ).toHaveLength(1);
    expect(checkRegistryShape({}).problems).toHaveLength(1);
  });
});

describe('planRegistration', () => {
  it('새 공유 id만 추가하고 다시 돌리면 그대로, 정답이 바뀐 id가 있으면 아무것도 안 쓴다', () => {
    const items = [
      item(),
      item({ id: '2', question: '진짜 새는?', answer: '참새' }),
      item({ id: '9', shareable: false }),
    ];
    const first = planRegistration({
      items,
      registry: [],
      today: '2026-11-18',
    });
    expect(first.ok && first.added).toEqual(['5', '2']);
    expect(first.ok && first.next.map((e) => e.id)).toEqual(['2', '5']);
    const again = first.ok
      ? planRegistration({ items, registry: first.next, today: '2026-11-19' })
      : undefined;
    expect(again?.ok && again.added).toEqual([]);

    const changed = planRegistration({
      items: [item({ answer: '연근' })],
      registry: first.ok ? first.next : [],
      today: '2026-11-19',
    });
    expect(changed.ok).toBe(false);
  });
});
