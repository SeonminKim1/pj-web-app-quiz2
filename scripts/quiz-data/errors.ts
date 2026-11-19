// 퀴즈 데이터 스크립트의 에러. 독자는 개발자라 앱의 AppError(사용자 문구용)와 따로 둔다.
// 식별자 설명은 docs/errors.md에 있다.

/** spec 에러 식별자. */
export const QUIZ_DATA_ERROR_CODES = ['quiz_data_invalid'] as const;

export type QuizDataErrorCode = (typeof QUIZ_DATA_ERROR_CODES)[number];

/** 스크립트가 실패할 때 던지는 에러. details에는 위반 항목을 한 줄씩 담는다. */
export class QuizDataError extends Error {
  readonly code: QuizDataErrorCode;
  readonly details: readonly string[];

  constructor(
    code: QuizDataErrorCode,
    message: string,
    details: readonly string[] = [],
  ) {
    super(message);
    this.name = 'QuizDataError';
    this.code = code;
    this.details = details;
  }
}

/** 값이 QuizDataError인지 확인한다. */
export function isQuizDataError(value: unknown): value is QuizDataError {
  return value instanceof QuizDataError;
}

/** 콘솔 출력용 문자열: "[식별자] 메시지" + 위반 항목 목록. */
export function formatQuizDataError(error: QuizDataError): string {
  const lines = [`[${error.code}] ${error.message}`];
  for (const detail of error.details) {
    lines.push(`  - ${detail}`);
  }
  return lines.join('\n');
}
