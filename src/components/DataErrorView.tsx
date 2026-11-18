import type { ReactElement } from 'react';
import { ErrorCode, type AppError } from '../errors/AppError.ts';
import { ErrorView } from './StatusViews.tsx';

type DataErrorViewProps = {
  error: AppError;
  onRetry: () => void;
  onHome: () => void;
  onList?: () => void;
};

/**
 * 데이터·주소 에러를 에러 종류에 맞는 처리 버튼과 함께 보여 준다(spec "에러 케이스(공통)").
 * 새 버전 → 새로고침, 없는 주제 → 처음으로, 없는 스테이지·카테고리 → 그 목록, 없는 북마크 → 북마크 목록, 그 밖 → 다시 시도.
 */
export function DataErrorView({
  error,
  onRetry,
  onHome,
  onList,
}: DataErrorViewProps): ReactElement {
  switch (error.code) {
    case ErrorCode.QUIZ_DATA_VERSION_MISMATCH.code:
      return (
        <ErrorView
          message={error.message}
          actionLabel="새로고침"
          onAction={() => window.location.reload()}
        />
      );
    case ErrorCode.TOPIC_NOT_FOUND.code:
      return (
        <ErrorView
          message={error.message}
          actionLabel="처음으로"
          onAction={onHome}
        />
      );
    case ErrorCode.CATEGORY_NOT_FOUND.code:
      return (
        <ErrorView
          message={error.message}
          actionLabel="카테고리 목록"
          onAction={onList ?? onHome}
        />
      );
    case ErrorCode.BOOKMARK_NOT_FOUND.code:
      return (
        <ErrorView
          message={error.message}
          actionLabel="북마크 목록"
          onAction={onList ?? onHome}
        />
      );
    case ErrorCode.STAGE_NOT_FOUND.code:
      return (
        <ErrorView
          message={error.message}
          actionLabel="스테이지 목록"
          onAction={onList ?? onHome}
        />
      );
    default:
      return (
        <ErrorView
          message={error.message}
          actionLabel="다시 시도"
          onAction={onRetry}
        />
      );
  }
}
