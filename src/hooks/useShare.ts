// "친구한테 이 문제 내기"(설계 문서 "사용자 흐름 1"·"공유가 세지는 시점"·"공유 뒤 상태").
// navigator.share는 사용자 동작 안에서만 열리므로 클릭 처리기에서 바로 부른다(await 뒤가 아님).
// 성공했을 때만 통계에 센다. 취소(AbortError)·복사 실패는 세지 않는다.
import { playCue } from '../lib/sound.ts';
import { useCallback, useState } from 'react';
import { analytics } from '../lib/analyticsInstance.ts';
import { buildSharePath, shareText, type ShareInfo } from '../lib/shareLink.ts';

const NICKNAME_KEY = 'qp_nickname';

export function loadNickname(): string | undefined {
  try {
    return globalThis.localStorage?.getItem(NICKNAME_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveNickname(nickname: string | undefined): void {
  try {
    if (nickname) globalThis.localStorage?.setItem(NICKNAME_KEY, nickname);
    else globalThis.localStorage?.removeItem(NICKNAME_KEY);
  } catch {
    // 저장 못 해도 이번 공유는 계속한다.
  }
}

/** 브라우저 기능(테스트에서 가짜를 넣는다). */
export type ShareEnv = {
  share?: (data: { text: string; url: string }) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
  origin: string;
};

function browserEnv(): ShareEnv {
  const nav = globalThis.navigator as Navigator | undefined;
  return {
    share: nav?.share ? (data) => nav.share(data) : undefined,
    writeText: nav?.clipboard?.writeText
      ? (text) => nav.clipboard.writeText(text)
      : undefined,
    origin: globalThis.location?.origin ?? '',
  };
}

type ShareOutcome = 'shared' | 'copied' | 'manual' | 'cancelled';

export type ShareView = {
  /** 한 번이라도 보냈는지("또 내기"). */
  sentOnce: boolean;
  toast: string | undefined;
  /** 복사도 안 될 때 직접 복사할 문구. */
  manualText: string | undefined;
  closeManual: () => void;
  /** 클릭 처리기 안에서 바로 부른다. */
  share: (args: {
    info: ShareInfo;
    timing: 'pre' | 'post';
  }) => Promise<ShareOutcome>;
};

export function useShare({
  id,
  question,
  env = browserEnv(),
}: {
  id: string;
  question: string;
  env?: ShareEnv;
}): ShareView {
  const [sentOnce, setSentOnce] = useState(false);
  const [toast, setToast] = useState<string>();
  const [manualText, setManualText] = useState<string>();

  const showToast = useCallback((text: string) => {
    setToast(text);
    globalThis.setTimeout(() => setToast(undefined), 2500);
  }, []);

  const share = useCallback<ShareView['share']>(
    async ({ info, timing }) => {
      const url = `${env.origin}${buildSharePath({ id, info })}`;
      const text = shareText(question);
      const done = (outcome: 'shared' | 'copied') => {
        analytics.shared(id, timing);
        playCue('share');
        setSentOnce(true);
        showToast(
          outcome === 'shared'
            ? '보냈어요! 친구가 풀면 누가 더 잘했는지 보여 줘요'
            : '링크를 복사했어요. 단톡방에 붙여 넣어 주세요',
        );
        return outcome;
      };
      if (env.share) {
        try {
          await env.share({ text, url });
          return done('shared');
        } catch (error) {
          if ((error as { name?: string } | null)?.name === 'AbortError')
            return 'cancelled';
          // 다른 실패(NotAllowedError 등)는 복사로 넘어간다.
        }
      }
      if (env.writeText) {
        try {
          await env.writeText(`${text}\n${url}`);
          return done('copied');
        } catch {
          // 복사도 막힘 → 직접 복사 칸.
        }
      }
      setManualText(`${text}\n${url}`);
      return 'manual';
    },
    [env, id, question, showToast],
  );

  return {
    sentOnce,
    toast,
    manualText,
    closeManual: () => setManualText(undefined),
    share,
  };
}
