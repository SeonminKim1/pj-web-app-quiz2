import { describe, expect, it } from 'vitest';
import {
  answerChars,
  answerSlots,
  answerWordLengths,
  canonicalAnswer,
  isCorrectAnswer,
  normalizeAnswer,
} from './answer.ts';

describe('answerChars / answerWordLengths', () => {
  it('공백을 뺀 글자, 어절별 글자 수', () => {
    expect(answerChars('아싸 호랑나비')).toEqual([...'아싸호랑나비']);
    expect(answerChars('3.14')).toEqual(['3', '.', '1', '4']);
    expect(answerWordLengths('아싸 호랑나비')).toEqual([2, 4]);
    expect(answerWordLengths('고생대')).toEqual([3]);
  });
});

describe('normalizeAnswer', () => {
  it('공백을 모두 빼고 영문은 소문자로', () => {
    expect(normalizeAnswer('  BE 동사 ')).toBe('be동사');
  });
});

describe('isCorrectAnswer', () => {
  it('정확히 같으면 정답', () => {
    expect(isCorrectAnswer({ answer: '고생대', input: '고생대' })).toBe(true);
  });

  it('띄어쓰기·영문 대소문자는 무시한다', () => {
    expect(
      isCorrectAnswer({ answer: '아싸 호랑나비', input: '아싸호랑나비' }),
    ).toBe(true);
    expect(isCorrectAnswer({ answer: 'be동사', input: 'BE 동사' })).toBe(true);
  });

  it('글자가 다르거나 글자 수가 다르면 오답', () => {
    expect(isCorrectAnswer({ answer: '고생대', input: '고생' })).toBe(false);
    expect(isCorrectAnswer({ answer: '고생대', input: '고생대다' })).toBe(
      false,
    );
    expect(isCorrectAnswer({ answer: '고생대', input: '고샘대' })).toBe(false);
  });

  it('빈 입력·공백만은 오답', () => {
    expect(isCorrectAnswer({ answer: '고생대', input: '' })).toBe(false);
    expect(isCorrectAnswer({ answer: '고생대', input: '   ' })).toBe(false);
  });
});

describe('answerSlots', () => {
  it('공백을 뺀 입력을 앞에서부터 어절별 칸에 채우고, 남은 칸은 빈칸', () => {
    expect(answerSlots({ answer: '아싸 호랑나비', input: '아 싸호' })).toEqual({
      groups: [
        ['아', '싸'],
        ['호', undefined, undefined, undefined],
      ],
      overflow: 0,
    });
  });

  it('빈 입력이면 모두 빈칸', () => {
    expect(answerSlots({ answer: '고생대', input: '' })).toEqual({
      groups: [[undefined, undefined, undefined]],
      overflow: 0,
    });
  });

  it('칸보다 많이 쓰면 칸을 다 채우고 넘친 수를 센다', () => {
    expect(answerSlots({ answer: '와', input: '와와와' })).toEqual({
      groups: [['와']],
      overflow: 2,
    });
  });

  it('한글 조합 중 글자·영문·숫자도 한 글자씩', () => {
    expect(answerSlots({ answer: 'be동사', input: 'BE동ㅅ' }).groups).toEqual([
      ['B', 'E', '동', 'ㅅ'],
    ]);
  });
});

describe('canonicalAnswer', () => {
  it('NFD 한글도 NFC와 같은 값이 되고, 모든 공백을 빼고 소문자로', () => {
    const nfd = '고생대'.normalize('NFD');
    expect(nfd).not.toBe('고생대');
    expect(canonicalAnswer(nfd)).toBe('고생대');
    expect(canonicalAnswer(' Hello\tWorld\n')).toBe('helloworld');
    expect(isCorrectAnswer({ answer: '고생대', input: nfd })).toBe(true);
  });
});
