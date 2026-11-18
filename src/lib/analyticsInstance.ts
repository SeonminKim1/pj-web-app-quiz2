// 앱 전체가 쓰는 통계 인스턴스 하나. 저장소를 쓸 수 없으면 null(통계만 꺼지고 앱은 계속).
import { createAnalytics, type KeyStore } from './analytics.ts';

function store(get: () => Storage): KeyStore | null {
  try {
    return get();
  } catch {
    return null;
  }
}

export const analytics = createAnalytics({
  storage: store(() => globalThis.localStorage),
  session: store(() => globalThis.sessionStorage),
});
