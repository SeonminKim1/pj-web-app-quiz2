import { useContext } from 'react';
import {
  ProgressContext,
  type ProgressContextValue,
} from './progressContext.ts';

/** 진행 Context를 읽는다. ProgressProvider 밖에서 부르면 개발 실수라 바로 알린다. */
export function useProgress(): ProgressContextValue {
  const value = useContext(ProgressContext);
  if (!value) {
    throw new Error('useProgress는 ProgressProvider 안에서만 쓸 수 있어요');
  }
  return value;
}
