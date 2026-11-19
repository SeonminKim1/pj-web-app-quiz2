import { describe, expect, it } from 'vitest';
import type { QuizTopicId } from '../types/quiz.ts';
import {
  QUIZ_TOPICS,
  findCategoryTopic,
  findStageTopic,
  isEnterableTopic,
  getQuizTopic,
  getQuizTopicFileName,
  isQuizTopicId,
  textHintCount,
} from './quizTopics.ts';

// QuizTopicId 유니온의 모든 값. 유니온에 값을 추가하면 이 객체도 고쳐야 타입 검사를 통과한다.
const ALL_IDS: Record<QuizTopicId, true> = { nonsense: true, mbti: true };

describe('QUIZ_TOPICS', () => {
  it('타입의 모든 주제 id를 한 번씩, spec 순서로 담는다', () => {
    const ids = QUIZ_TOPICS.map((topic) => topic.id);
    expect(ids).toEqual(['nonsense', 'mbti']);
    expect([...ids].sort()).toEqual(Object.keys(ALL_IDS).sort());
  });

  it('넌센스: 주관식, 문장 힌트(무료) → 첫 글자(골드) → 문장 힌트(골드)', () => {
    expect(getQuizTopic('nonsense')).toEqual({
      id: 'nonsense',
      label: '넌센스',
      play: ['typing'],
      hints: [
        { type: 'text', paid: false },
        { type: 'revealLetter', paid: true },
        { type: 'text', paid: true },
      ],
      round: { byCategory: false, stageSize: 10 },
      titles: true,
      sharePrefix: 'q',
    });
  });

  it('MBTI: 4축 고르기, 축 공개(무료) → 축 공개(골드) → 축 공개(골드), 카테고리 16문제', () => {
    expect(getQuizTopic('mbti')).toEqual({
      id: 'mbti',
      label: 'MBTI',
      play: ['mbtiAxes'],
      hints: [
        { type: 'revealLetter', paid: false },
        { type: 'revealLetter', paid: true },
        { type: 'revealLetter', paid: true },
      ],
      round: { byCategory: true, size: 16 },
      titles: false,
    });
  });
});

describe('isQuizTopicId / getQuizTopicFileName / textHintCount', () => {
  it('등록된 주제 id만 true다', () => {
    expect(isQuizTopicId('mbti')).toBe(true);
    expect(isQuizTopicId('nonsense')).toBe(true);
    expect(isQuizTopicId('general')).toBe(false);
    expect(isQuizTopicId('')).toBe(false);
    expect(isQuizTopicId(undefined)).toBe(false);
  });

  it('파일 이름과 문장 힌트 단계 수', () => {
    expect(getQuizTopicFileName('nonsense')).toBe('nonsense.json');
    expect(textHintCount(getQuizTopic('nonsense'))).toBe(2);
  });
});

describe('isEnterableTopic', () => {
  it('기본 풀이 방식이 구현된 부품인 주제만 들어갈 수 있다(넌센스)', () => {
    expect(isEnterableTopic(getQuizTopic('nonsense'))).toBe(true);
    expect(isEnterableTopic({ ...getQuizTopic('nonsense'), play: [] })).toBe(
      false,
    );
  });
});

describe('findStageTopic', () => {
  it('들어갈 수 있는 스테이지형 주제만 찾는다', () => {
    expect(findStageTopic('nonsense')?.round).toEqual({
      byCategory: false,
      stageSize: 10,
    });
    expect(findStageTopic('mbti')).toBeUndefined();
    expect(findStageTopic('movie')).toBeUndefined();
    expect(findStageTopic(undefined)).toBeUndefined();
  });
});

describe('findCategoryTopic', () => {
  it('들어갈 수 있는 카테고리 단위 주제만 찾는다', () => {
    expect(findCategoryTopic('mbti')?.round).toEqual({
      byCategory: true,
      size: 16,
    });
    expect(findCategoryTopic('nonsense')).toBeUndefined();
    expect(findCategoryTopic('movie')).toBeUndefined();
    expect(findCategoryTopic(undefined)).toBeUndefined();
  });
});
