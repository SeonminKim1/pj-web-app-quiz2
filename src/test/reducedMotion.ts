// 테스트용 가짜 matchMedia: 동작 줄이기 설정을 도중에 바꿀 수 있다(change 이벤트까지).
import { vi } from 'vitest';

export function stubReducedMotion(initial: boolean): {
  set: (value: boolean) => void;
} {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    'matchMedia',
    () =>
      ({
        get matches() {
          return matches;
        },
        addEventListener: (_: string, listener: () => void) =>
          listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) =>
          listeners.delete(listener),
      }) as unknown as MediaQueryList,
  );
  return {
    set(value) {
      matches = value;
      for (const listener of [...listeners]) listener();
    },
  };
}
