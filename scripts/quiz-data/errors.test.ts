// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  QuizDataError,
  formatQuizDataError,
  isQuizDataError,
} from './errors.ts';

describe('QuizDataError', () => {
  it('식별자·메시지·위반 항목을 담고, 콘솔용 문자열로 바뀐다', () => {
    const error = new QuizDataError(
      'quiz_data_invalid',
      '검수 CSV 값이 잘못됐어요',
      ['3행 id 12: category "nonsens"', '9행 id 40: decision "inclde"'],
    );

    expect(isQuizDataError(error)).toBe(true);
    expect(error.code).toBe('quiz_data_invalid');
    expect(formatQuizDataError(error)).toBe(
      [
        '[quiz_data_invalid] 검수 CSV 값이 잘못됐어요',
        '  - 3행 id 12: category "nonsens"',
        '  - 9행 id 40: decision "inclde"',
      ].join('\n'),
    );
  });

  it('일반 에러는 QuizDataError가 아니다', () => {
    expect(isQuizDataError(new Error('x'))).toBe(false);
  });
});
