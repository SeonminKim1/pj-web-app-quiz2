import { describe, expect, it, vi } from 'vitest';
import { createAnalytics, EVENTS, type KeyStore } from './analytics.ts';

function memory(): KeyStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

function setup() {
  const storage = memory();
  const session = memory();
  const analytics = createAnalytics({ storage, session, log: vi.fn() });
  const count = vi.fn();
  return { storage, session, analytics, count, gc: { count } };
}

const paths = (count: ReturnType<typeof vi.fn>) =>
  count.mock.calls.map((call) => (call[0] as { path: string }).path);

describe('analytics', () => {
  it('스크립트 로드 전 이벤트는 큐에 쌓였다가 로드되면 보내고, 그때 중복 키를 쓴다', () => {
    const { analytics, gc, count, storage } = setup();
    analytics.landed('23');
    expect(count).not.toHaveBeenCalled();
    expect(storage.data.has('qp_sent:landing_from_share/23')).toBe(false);

    analytics.ready(gc);
    expect(paths(count)).toEqual(['landing_from_share/23']);
    expect(storage.data.get('qp_sent:landing_from_share/23')).toBe('1');
  });

  it('로드 실패면 큐를 버리고 키를 쓰지 않는다(다음 방문에 다시 셀 수 있음)', () => {
    const { analytics, storage } = setup();
    analytics.landed('23');
    analytics.failed();
    expect([...storage.data.keys()]).toEqual([]);
  });

  it('(이벤트, 문제 id)마다 한 번만 보낸다', () => {
    const { analytics, gc, count } = setup();
    analytics.ready(gc);
    analytics.track(EVENTS.shareClick, '5');
    analytics.track(EVENTS.shareClick, '5');
    analytics.track(EVENTS.shareClick, '6');
    expect(paths(count)).toEqual(['share_click/5', 'share_click/6']);
  });

  it('핵심 지표: X로 들어와 X를 내면 분자, Y·Z를 내면 진단 이벤트만(분자 ≤ 분모)', () => {
    const { analytics, gc, count } = setup();
    analytics.ready(gc);
    analytics.landed('X');
    analytics.shared('Y', 'post');
    analytics.shared('Z', 'post');
    analytics.shared('X', 'pre');
    analytics.shared('X', 'post');
    const sent = paths(count);
    expect(sent.filter((p) => p.startsWith('landing_from_share/'))).toEqual([
      'landing_from_share/X',
    ]);
    expect(sent.filter((p) => p.startsWith('reshare_from_share/'))).toEqual([
      'reshare_from_share/X',
    ]);
    expect(sent).toContain('share_after_share_landing/Y');
    expect(sent).toContain('share_after_share_landing/Z');
    expect(sent).toContain('reshare_timing_pre/X');
    expect(sent).toContain('reshare_timing_post/X');
  });

  it('공유로 들어오지 않았으면 share_click', () => {
    const { analytics, gc, count } = setup();
    analytics.ready(gc);
    analytics.shared('7', 'post');
    expect(paths(count)).toEqual(['share_click/7']);
  });

  it('?dev=1이면 아무것도 보내지 않고 스크립트도 안 불러온다, ?dev=0이면 다시 켠다', () => {
    const { analytics, gc, count } = setup();
    expect(analytics.applyFlags('?dev=1')).toEqual({ load: false });
    analytics.ready(gc);
    analytics.landed('1');
    analytics.pageview('/q/1/');
    expect(count).not.toHaveBeenCalled();
    expect(analytics.applyFlags('?dev=0')).toEqual({ load: true });
  });

  it('?debug=analytics는 보내지 않고 콘솔에만 찍는다', () => {
    const storage = memory();
    const log = vi.fn();
    const analytics = createAnalytics({ storage, session: memory(), log });
    const count = vi.fn();
    expect(analytics.applyFlags('?debug=analytics')).toEqual({ load: false });
    analytics.ready({ count });
    analytics.track(EVENTS.shareClick, '1');
    expect(count).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('[analytics]', 'share_click/1');
  });

  it('페이지뷰는 쿼리(닉네임)를 보내지 않고, count가 던져도 앱은 멈추지 않는다', () => {
    const { analytics, count } = setup();
    analytics.ready({ count });
    analytics.pageview('/q/1/?s=1&from=민지');
    expect(paths(count)).toEqual(['/q/1/']);
    expect(JSON.stringify(count.mock.calls)).not.toContain('from=');

    const broken = createAnalytics({ storage: memory(), session: memory() });
    broken.ready({
      count: () => {
        throw new Error('blocked');
      },
    });
    expect(() => broken.track(EVENTS.shareClick, '1')).not.toThrow();
  });

  it('저장소가 막혀도 던지지 않는다', () => {
    const throwing: KeyStore = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    const analytics = createAnalytics({ storage: throwing, session: throwing });
    expect(() => {
      analytics.applyFlags('?dev=1');
      analytics.ready({ count: vi.fn() });
      analytics.landed('1');
      analytics.shared('1', 'pre');
    }).not.toThrow();
  });
});
