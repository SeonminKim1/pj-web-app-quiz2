import { describe, expect, it } from 'vitest';
import {
  MBTI_AXES,
  MBTI_TYPE_PATTERN,
  isCompleteMbti,
  matchedAxisCount,
  mbtiLetters,
  pickMbtiAxis,
  revealAxisText,
  withRevealedAxes,
} from './mbti.ts';
import { openableHints } from './progress.ts';
import { getQuizTopic } from './quizTopics.ts';

describe('mbti 고른 값', () => {
  it('축마다 그 축의 글자만 읽고, 나머지는 안 고른 축이다', () => {
    expect(mbtiLetters('')).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    expect(mbtiLetters('I_T_')).toEqual(['I', undefined, 'T', undefined]);
    // 다른 축의 글자가 들어오면 고르지 않은 것으로 본다.
    expect(mbtiLetters('SIJT')).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  it('축 하나를 고르거나 바꾼다', () => {
    const one = pickMbtiAxis({ input: '', axis: 2, letter: 'F' });
    expect(one).toBe('__F_');
    expect(pickMbtiAxis({ input: one, axis: 2, letter: 'T' })).toBe('__T_');
    expect(pickMbtiAxis({ input: 'E___', axis: 0, letter: 'I' })).toBe('I___');
  });

  it('4축을 다 골라야 완성이다', () => {
    expect(isCompleteMbti('IST_')).toBe(false);
    expect(isCompleteMbti('ISTJ')).toBe(true);
  });

  it('공개된 앞 축은 정답 글자로 덮는다', () => {
    expect(withRevealedAxes({ input: 'E___', answer: 'INFP', locked: 0 })).toBe(
      'E___',
    );
    expect(withRevealedAxes({ input: 'ES__', answer: 'INFP', locked: 2 })).toBe(
      'IN__',
    );
  });

  it('자리가 같은 축 수만 센다', () => {
    expect(matchedAxisCount({ answer: 'ISTJ', input: 'ISTJ' })).toBe(4);
    expect(matchedAxisCount({ answer: 'ISTJ', input: 'ESFJ' })).toBe(2);
    expect(matchedAxisCount({ answer: 'ISTJ', input: 'ENFP' })).toBe(0);
  });

  it('유형 형식', () => {
    expect(MBTI_TYPE_PATTERN.test('ENFP')).toBe(true);
    expect(MBTI_TYPE_PATTERN.test('enfp')).toBe(false);
    expect(MBTI_TYPE_PATTERN.test('EIFP')).toBe(false);
  });
});

describe('축 이름', () => {
  it('축 이름은 선택지 이름과 겹치지 않는다(판단·인식은 J/P 선택지 이름)', () => {
    const options = MBTI_AXES.flatMap((axis) =>
      axis.options.map((option) => option.label),
    );
    for (const axis of MBTI_AXES) expect(options).not.toContain(axis.name);
  });
});

describe('축 공개 힌트', () => {
  it('문구에 축과 정답 글자, 뜻을 담는다', () => {
    expect(revealAxisText(1, 'I')).toBe("E/I 축은 'I' 내향");
    expect(revealAxisText(4, 'P')).toBe("J/P 축은 'P' 인식");
  });

  it('MBTI 주제는 앞 축부터 세 축을 공개한다(무료 → 골드 → 골드)', () => {
    const hints = openableHints({
      topic: getQuizTopic('mbti'),
      item: { id: '1', question: '상황', answer: 'ENFP', category: '일상' },
    });
    expect(hints).toEqual([
      { text: "E/I 축은 'E' 외향", paid: false, type: 'revealLetter' },
      { text: "S/N 축은 'N' 직관", paid: true, type: 'revealLetter' },
      { text: "T/F 축은 'F' 감정", paid: true, type: 'revealLetter' },
    ]);
  });
});
