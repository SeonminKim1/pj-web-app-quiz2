import { describe, expect, it, vi } from 'vitest';
import {
  bannerLines,
  buildSharePath,
  clampShareInfo,
  cleanNickname,
  compareLine,
  cutGraphemes,
  displayNumber,
  josa,
  parseShareQuery,
  shareText,
} from './shareLink.ts';

describe('cutGraphemes / cleanNickname', () => {
  it('이모지·결합 문자를 쪼개지 않고 8자로 자른다', () => {
    expect(cutGraphemes('👨‍👩‍👧‍👦가나다라마바사아자', 8)).toBe('👨‍👩‍👧‍👦가나다라마바사');
    expect(cleanNickname('  민지  ')).toBe('민지');
    expect(cleanNickname('   ')).toBeUndefined();
    expect(cleanNickname(undefined)).toBeUndefined();
  });

  it('Intl.Segmenter가 없으면 코드 포인트 기준으로 자른다(서로게이트 쌍 보존)', () => {
    vi.stubGlobal('Intl', { ...Intl, Segmenter: undefined });
    try {
      expect(cutGraphemes('😀😀😀', 2)).toBe('😀😀');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('buildSharePath', () => {
  it('닉네임·결과가 있으면 모두 넣고, 닉네임이 없으면 h·r도 빼고 s=1만', () => {
    expect(
      buildSharePath({
        id: '23',
        info: { from: '민지', hints: 1, result: 's' },
      }),
    ).toBe('/q/23/?s=1&from=%EB%AF%BC%EC%A7%80&h=1&r=s');
    expect(buildSharePath({ id: '23', info: { hints: 1, result: 's' } })).toBe(
      '/q/23/?s=1',
    );
    expect(buildSharePath({ id: '23', info: { from: '민지' } })).toBe(
      '/q/23/?s=1&from=%EB%AF%BC%EC%A7%80',
    );
  });
});

describe('parseShareQuery', () => {
  const parse = (search: string) => parseShareQuery({ search, maxHints: 3 });

  it('만든 링크를 그대로 읽는다', () => {
    const path = buildSharePath({
      id: '23',
      info: { from: '민지', hints: 2, result: 'g' },
    });
    expect(parse(path.slice(path.indexOf('?')))).toEqual({
      fromShare: true,
      info: { from: '민지', hints: 2, result: 'g' },
    });
  });

  it('잘못된 % 인코딩은 from 없음, h·r이 틀리거나 한쪽만 있으면 둘 다 버린다', () => {
    expect(parse('?s=1&from=%E0&h=1&r=s')).toEqual({
      fromShare: true,
      info: {},
    });
    expect(parse('?s=1&from=a&h=9&r=s').info).toEqual({ from: 'a' });
    expect(parse('?s=1&from=a&h=1').info).toEqual({ from: 'a' });
    expect(parse('?s=1&from=a&h=1&r=x').info).toEqual({ from: 'a' });
    expect(parse('?h=1&r=s').info).toEqual({});
    expect(parse('').fromShare).toBe(false);
  });
});

describe('clampShareInfo', () => {
  it('문제에서 열 수 있는 단계보다 큰 h는 결과 정보를 버린다', () => {
    expect(clampShareInfo({ from: 'a', hints: 3, result: 's' }, 2)).toEqual({
      from: 'a',
    });
    expect(clampShareInfo({ from: 'a', hints: 2, result: 's' }, 2)).toEqual({
      from: 'a',
      hints: 2,
      result: 's',
    });
  });
});

describe('문구', () => {
  it('표시 번호와 공유 문구(정답 없음)', () => {
    expect(displayNumber('23')).toBe('#023');
    expect(displayNumber('1024')).toBe('#1024');
    expect(shareText('뽑으면 우는 식물은?')).toBe(
      '🐰 이 문제 풀 수 있어? 뽑으면 우는 식물은?',
    );
  });

  it('받침에 맞는 조사', () => {
    expect(josa('민지', '이', '가')).toBe('민지가');
    expect(josa('준혁', '이', '가')).toBe('준혁이');
    expect(josa('Amy', '이', '가')).toBe('Amy가');
  });

  it('배너: from 없음 / from만 / 맞힘(힌트 0은 "힌트 없이") / 포기', () => {
    expect(bannerLines({})).toEqual(['친구가 낸 문제']);
    expect(bannerLines({ from: '민지' })).toEqual(['📨 민지가 낸 문제']);
    expect(bannerLines({ from: '준혁', hints: 0, result: 's' })).toEqual([
      '📨 준혁이 낸 문제',
      '준혁은 힌트 없이 맞힘',
    ]);
    expect(bannerLines({ from: '민지', result: 'g', hints: 1 })).toEqual([
      '📨 민지가 낸 문제',
      '민지도 못 맞힘',
    ]);
  });

  it('비교 문구는 모든 행이 다음 친구에게 내기로 끝난다', () => {
    const s = (b: number) => ({ result: 's' as const, hints: b });
    const g = { result: 'g' as const, hints: 0 };
    const friend = { from: '민지', hints: 2, result: 's' as const };
    expect(compareLine({ info: {}, mine: s(0) })).toBe(
      '다른 친구는 풀 수 있을까?',
    );
    expect(compareLine({ info: {}, mine: g })).toBe(
      '이 문제, 다른 친구도 걸릴까?',
    );
    expect(compareLine({ info: { from: '민지' }, mine: s(1) })).toBe(
      '맞혔어요! 다음 친구는 풀 수 있을까?',
    );
    expect(compareLine({ info: friend, mine: s(1) })).toBe(
      '민지보다 힌트를 1개 덜 썼어요. 다른 친구는 어떨까?',
    );
    expect(compareLine({ info: friend, mine: s(2) })).toBe(
      '민지랑 똑같이 힌트 2개. 다음 친구는 이길까?',
    );
    expect(compareLine({ info: { ...friend, hints: 0 }, mine: s(0) })).toBe(
      '민지랑 똑같이 힌트 없이. 다음 친구는 이길까?',
    );
    expect(compareLine({ info: friend, mine: s(3) })).toBe(
      '민지는 힌트 2개로 맞혔대요. 다음 친구는 이길 수 있을까?',
    );
    expect(compareLine({ info: friend, mine: g })).toBe(
      '민지는 맞혔는데… 다른 친구도 걸리나 내 보기',
    );
    expect(
      compareLine({
        info: { from: '준혁', hints: 0, result: 'g' },
        mine: s(0),
      }),
    ).toBe('준혁이 포기한 문제를 맞혔어요! 자랑하러 가기');
  });
});
