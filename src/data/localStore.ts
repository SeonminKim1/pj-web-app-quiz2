// 버전이 있는 JSON 값을 localStorage 한 키에 읽고 쓰는 공통 저장소(진행·설정이 같이 쓴다).
// 저장값이 깨졌거나 저장소를 쓸 수 없어도 앱은 계속된다. 사용자에게 에러를 보이지 않고 콘솔에만 경고한다.
import { isRecord } from '../lib/records.ts';

/** localStorage에서 쓰는 부분만(테스트에서 가짜를 넣는다). */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** 값 읽기·쓰기. */
export type LocalStore<T> = {
  load: () => T;
  save: (value: T) => void;
};

/**
 * 한 키의 저장소를 만든다. storage를 주지 않으면 브라우저 localStorage(쓸 수 없으면 메모리),
 * null이면 처음부터 메모리에만 둔다(테스트, 사생활 보호 모드).
 * - 저장값이 없거나 깨졌으면(JSON 아님, 모양 틀림, 다른 버전) initial().
 * - 더 새로운 버전으로 저장돼 있으면 덮어쓰지 않도록 이후에는 메모리에만 둔다.
 * - 저장이 실패하면(용량 초과 등) 이후에는 메모리에만 둔다.
 */
export function createLocalStore<T>({
  key,
  version,
  isValid,
  initial,
  label,
  storage,
}: {
  key: string;
  version: number;
  isValid: (value: unknown) => value is T;
  initial: () => T;
  /** 경고 문구에 쓸 이름(예: "진행", "설정"). */
  label: string;
  storage?: KeyValueStorage | null;
}): LocalStore<T> {
  const resolved =
    storage === undefined ? browserStorage(key) : (storage ?? undefined);
  let memory: T | undefined;
  let active = resolved;
  return {
    load: (): T => {
      if (!active) return memory ?? initial();
      try {
        const text = active.getItem(key);
        if (text === null) return initial();
        const value: unknown = JSON.parse(text);
        if (isValid(value)) return value;
        if (isNewerVersion(value, version)) {
          // 새 버전 앱이 저장한 값: 덮어쓰면 사라지므로 이 화면에서는 메모리에만 둔다.
          console.warn(
            `더 새로운 버전의 ${label}이(가) 저장돼 있어 이 화면에서는 저장하지 않아요`,
          );
          active = undefined;
          return memory ?? initial();
        }
        console.warn(`저장된 ${label} 형식이 맞지 않아 처음부터 시작해요`);
      } catch (error) {
        console.warn(
          `저장된 ${label}을(를) 읽지 못해 처음부터 시작해요`,
          error,
        );
      }
      return initial();
    },
    save: (value: T): void => {
      memory = value;
      if (!active) return;
      try {
        active.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn(
          `${label}을(를) 저장하지 못해 이 화면에서만 유지해요`,
          error,
        );
        active = undefined;
      }
    },
  };
}

// 브라우저 localStorage를 쓸 수 있으면 그것을, 아니면 undefined.
function browserStorage(key: string): KeyValueStorage | undefined {
  try {
    const storage = globalThis.localStorage;
    const probe = `${key}:probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return undefined;
  }
}

// 지금 앱보다 높은 버전으로 저장된 값인지.
function isNewerVersion(value: unknown, version: number): boolean {
  return (
    isRecord(value) &&
    typeof value.version === 'number' &&
    value.version > version
  );
}
