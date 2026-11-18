/** 에러 항목 하나: 식별자와 사용자에게 보여 줄 문구. */
export type ErrorDetail = {
  code: string;
  message: string;
};

/**
 * 예상한 에러 목록. 기능 spec의 에러 케이스마다 항목을 추가한다.
 * (`erasableSyntaxOnly` 설정 때문에 enum 대신 `as const` 객체를 쓴다)
 */
export const ErrorCode = {
  UNKNOWN_ERROR: {
    code: 'unknown_error',
    message: '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
  },
  // ui-nonsense-play spec "에러 케이스(공통)"
  QUIZ_DATA_LOAD_FAILED: {
    code: 'quiz_data_load_failed',
    message:
      '문제를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.',
  },
  QUIZ_DATA_VERSION_MISMATCH: {
    code: 'quiz_data_version_mismatch',
    message: '새 버전이 있어요. 새로고침해 주세요.',
  },
  TOPIC_NOT_FOUND: {
    code: 'topic_not_found',
    message: '없는 주제예요.',
  },
  STAGE_NOT_FOUND: {
    code: 'stage_not_found',
    message: '없는 스테이지예요.',
  },
  // ui-mbti-play spec "에러 케이스(이 기능에서 추가)"
  CATEGORY_NOT_FOUND: {
    code: 'category_not_found',
    message: '없는 카테고리예요.',
  },
  // ui-bookmark spec "에러 케이스(이 기능에서 추가)"
  BOOKMARK_NOT_FOUND: {
    code: 'bookmark_not_found',
    message: '없는 북마크예요.',
  },
} as const satisfies Record<string, ErrorDetail>;

/** 예상한 에러. `throw new AppError(ErrorCode.XXX)`로 던진다. */
export class AppError extends Error {
  readonly code: string;

  constructor(detail: ErrorDetail, options?: { cause?: unknown }) {
    super(detail.message, options);
    this.name = 'AppError';
    this.code = detail.code;
  }
}

/** 값이 AppError인지 확인한다(hook에서 catch한 값을 좁힐 때 쓴다). */
export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
