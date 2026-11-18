// 공유 루프 측정(설계 문서 "측정"). GoatCounter 이벤트를 보내되:
// - 스크립트가 로드되기 전 이벤트는 큐에 쌓았다가 로드되면 보낸다(실패하면 버린다).
// - (이벤트, 문제 id)마다 한 번만 보낸다. 중복 제거 키는 실제로 보낸 뒤에만 쓴다.
// - 개발자 제외(?dev=1) 브라우저에서는 아무것도 보내지 않는다.
// - 닉네임·쿼리는 절대 보내지 않는다(경로는 '<이벤트>/<id>' 또는 pathname만).
//
//   track(e,id) ─ excluded? ─yes→ drop
//        │no
//        ├─ already sent(e/id)? ─yes→ drop
//        ├─ debug? → console.info, no send, no key
//        ├─ state=ready  → count() → write key
//        ├─ state=pending → queue (flush on ready)
//        └─ state=failed → drop (no key)

/** localStorage/sessionStorage에서 쓰는 부분. */
export type KeyStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

/** GoatCounter 전역의 쓰는 부분. */
export type GoatCounter = {
  count: (vars: { path: string; title?: string; event?: boolean }) => void;
};

export const EVENTS = {
  landing: 'landing_from_share',
  reshare: 'reshare_from_share',
  reshareTimingPre: 'reshare_timing_pre',
  reshareTimingPost: 'reshare_timing_post',
  shareAfterLanding: 'share_after_share_landing',
  shareClick: 'share_click',
  solveFromShare: 'solve_from_share',
  continueStageFromShare: 'continue_stage_from_share',
} as const;
export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

const EXCLUDE_KEY = 'qp_noanalytics';
const SENT_PREFIX = 'qp_sent:';
const LANDED_KEY = 'qp_landed';

type Pending = {
  path: string;
  title?: string;
  event: boolean;
  dedupe?: string;
};

/** 저장소 접근이 막힌 브라우저에서도 앱이 멈추지 않게 감싼다. */
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export type Analytics = ReturnType<typeof createAnalytics>;

export function createAnalytics({
  storage,
  session,
  log = (...args: unknown[]) => console.info(...args),
}: {
  storage: KeyStore | null;
  session: KeyStore | null;
  log?: (...args: unknown[]) => void;
}) {
  let state: 'pending' | 'ready' | 'failed' = 'pending';
  let counter: GoatCounter | undefined;
  let debug = false;
  const queue: Pending[] = [];

  const excluded = () =>
    safe(() => storage?.getItem(EXCLUDE_KEY) === '1', false);
  const sent = (key: string) =>
    safe(() => storage?.getItem(SENT_PREFIX + key) === '1', false);

  function deliver(item: Pending): void {
    try {
      counter?.count({ path: item.path, title: item.title, event: item.event });
    } catch {
      return; // 보내기 실패: 키를 쓰지 않는다.
    }
    if (item.dedupe) {
      const key = item.dedupe;
      safe(() => storage?.setItem(SENT_PREFIX + key, '1'), undefined);
    }
  }

  function submit(item: Pending): void {
    if (excluded()) return;
    if (item.dedupe && sent(item.dedupe)) return;
    if (debug) {
      log('[analytics]', item.path);
      return;
    }
    if (state === 'ready') deliver(item);
    else if (state === 'pending') {
      if (!queue.some((q) => q.dedupe && q.dedupe === item.dedupe))
        queue.push(item);
    }
  }

  function track(event: EventName, id: string): void {
    const path = `${event}/${id}`;
    submit({ path, title: event, event: true, dedupe: path });
  }

  return {
    /** 앱 시작 때 한 번. ?dev=1 켜기, ?dev=0 끄기, ?debug=analytics 콘솔 모드. 통계를 불러올지 돌려준다. */
    applyFlags(search: string): { load: boolean } {
      const params = new URLSearchParams(search);
      if (params.get('dev') === '1')
        safe(() => storage?.setItem(EXCLUDE_KEY, '1'), undefined);
      if (params.get('dev') === '0')
        safe(() => storage?.removeItem(EXCLUDE_KEY), undefined);
      debug = params.get('debug') === 'analytics';
      return { load: !excluded() && !debug };
    },
    /** 스크립트가 로드됨: 큐를 보낸다. */
    ready(goatcounter: GoatCounter): void {
      counter = goatcounter;
      state = 'ready';
      for (const item of queue.splice(0)) submit(item);
    },
    /** 스크립트 로드 실패: 큐를 버리고 이후 이벤트도 버린다(키는 쓰지 않는다). */
    failed(): void {
      state = 'failed';
      queue.length = 0;
    },
    /** 페이지뷰(쿼리 없는 pathname만). */
    pageview(pathname: string): void {
      submit({ path: pathname.split('?')[0] ?? pathname, event: false });
    },
    track,
    /** 공유 링크로 들어옴: 들어온 문제 id를 세션에 남기고 분모 이벤트. */
    landed(id: string): void {
      safe(() => session?.setItem(LANDED_KEY, id), undefined);
      track(EVENTS.landing, id);
    },
    /** 이번 세션에서 공유로 들어온 문제 id. */
    landedId(): string | undefined {
      return safe(() => session?.getItem(LANDED_KEY) ?? undefined, undefined);
    },
    /** 공유가 성공했을 때. 들어온 그 문제면 분자(reshare), 다른 문제면 진단 이벤트. */
    shared(id: string, timing: 'pre' | 'post'): void {
      const landedId = safe(() => session?.getItem(LANDED_KEY), null);
      if (landedId === id) {
        track(EVENTS.reshare, id);
        track(
          timing === 'pre' ? EVENTS.reshareTimingPre : EVENTS.reshareTimingPost,
          id,
        );
      } else if (landedId) {
        track(EVENTS.shareAfterLanding, id);
      } else {
        track(EVENTS.shareClick, id);
      }
    },
  };
}

/**
 * 고정 버전 사본(public/count.js)을 불러온다. 자동 수집은 끈다(no_onload).
 * code가 비었거나 제외 대상이면 불러오지 않는다.
 */
export function loadGoatCounter({
  analytics,
  code,
  search,
  doc = document,
  win = window as unknown as { goatcounter?: GoatCounter },
}: {
  analytics: Analytics;
  code: string;
  search: string;
  doc?: Document;
  win?: { goatcounter?: GoatCounter };
}): void {
  const { load } = analytics.applyFlags(search);
  if (!load || !code) {
    analytics.failed();
    return;
  }
  const script = doc.createElement('script');
  script.async = true;
  script.src = '/count.js';
  script.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
  script.dataset.goatcounterSettings = JSON.stringify({ no_onload: true });
  script.onload = () => {
    if (win.goatcounter) analytics.ready(win.goatcounter);
    else analytics.failed();
  };
  script.onerror = () => analytics.failed();
  doc.head.appendChild(script);
}
