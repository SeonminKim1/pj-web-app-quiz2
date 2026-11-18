// 공유 링크(/q/<id>/?s=1&from=&h=&r=) 만들기·읽기와 배너·비교 문구. 설계 문서 "사용자 흐름 3"·"보낸 사람 배너와 비교 문구".
// 순수 함수만 둔다(주소창 정리·공유 시트는 hooks/useShare.ts, 화면은 pages).

/** 닉네임 최대 길이(grapheme). 보내는 쪽 입력 제한과 받는 쪽 자르기가 같은 값을 쓴다. */
export const NICKNAME_MAX = 8;

/** 공유 시점 결과: s = 맞힘, g = 포기. */
export type ShareResult = 's' | 'g';

/** 링크에 담는 보낸 사람 정보. */
export type ShareInfo = {
  from?: string;
  /** 보낸 사람이 연 힌트 단계 수. result와 함께만 있다. */
  hints?: number;
  result?: ShareResult;
};

/** 글자를 사람이 보는 단위(grapheme)로 max개까지 자른다. Intl.Segmenter가 없으면 코드 포인트 기준. */
export function cutGraphemes(text: string, max: number): string {
  const Segmenter = (Intl as { Segmenter?: typeof Intl.Segmenter } | undefined)
    ?.Segmenter;
  const parts = Segmenter
    ? Array.from(
        new Segmenter('ko', { granularity: 'grapheme' }).segment(text),
        (part) => part.segment,
      )
    : Array.from(text);
  return parts.slice(0, max).join('');
}

/** 닉네임 정리: 앞뒤 공백 제거 후 8 grapheme. 비면 undefined. */
export function cleanNickname(
  raw: string | null | undefined,
): string | undefined {
  if (raw == null) return undefined;
  const cut = cutGraphemes(raw.trim(), NICKNAME_MAX).trim();
  return cut.length > 0 ? cut : undefined;
}

/**
 * 공유 URL의 경로와 쿼리. s=1은 항상 붙는다. 닉네임이 없으면 h·r도 넣지 않는다.
 * h·r은 둘 다 있을 때만 넣는다.
 */
export function buildSharePath({
  id,
  info,
}: {
  id: string;
  info: ShareInfo;
}): string {
  const params = new URLSearchParams({ s: '1' });
  const from = cleanNickname(info.from);
  if (from) {
    params.set('from', from);
    if (info.result && info.hints !== undefined) {
      params.set('h', String(info.hints));
      params.set('r', info.result);
    }
  }
  return `/q/${id}/?${params.toString()}`;
}

/** 받은 링크 읽기 결과. */
export type ParsedShare = {
  /** s=1이 있었는지(공유로 들어옴). */
  fromShare: boolean;
  info: ShareInfo;
};

/**
 * 쿼리 읽기. from: 디코드 실패·빈 값이면 없음. h(0~maxHints 정수)·r(s|g)은 둘 다 맞고 from이 있을 때만 쓴다.
 * URLSearchParams는 잘못된 %를 그대로 두므로, 원문에서 직접 디코드해 실패를 잡는다.
 */
export function parseShareQuery({
  search,
  maxHints,
}: {
  search: string;
  maxHints: number;
}): ParsedShare {
  const raw = new Map<string, string>();
  for (const pair of search.replace(/^\?/, '').split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = eq === -1 ? pair : pair.slice(0, eq);
    const value = eq === -1 ? '' : pair.slice(eq + 1);
    if (!raw.has(key)) raw.set(key, value);
  }
  const fromShare = raw.get('s') === '1';
  let from: string | undefined;
  const rawFrom = raw.get('from');
  if (rawFrom !== undefined) {
    try {
      from = cleanNickname(decodeURIComponent(rawFrom.replace(/\+/g, ' ')));
    } catch {
      from = undefined;
    }
  }
  const info: ShareInfo = {};
  if (from) {
    info.from = from;
    const h = raw.get('h');
    const r = raw.get('r');
    const hints = h !== undefined && /^\d$/.test(h) ? Number(h) : undefined;
    const result = r === 's' || r === 'g' ? r : undefined;
    if (hints !== undefined && hints <= maxHints && result) {
      info.hints = hints;
      info.result = result;
    }
  }
  return { fromShare, info };
}

/** 받은 h를 그 문제에서 실제로 열 수 있는 단계 수와 대조한다(넘으면 결과 정보를 버린다). */
export function clampShareInfo(
  info: ShareInfo,
  availableSteps: number,
): ShareInfo {
  if (info.hints === undefined || info.hints <= availableSteps) return info;
  return { from: info.from };
}

/** 카드·화면의 표시 번호: id를 3자리 0 채움("23" → "#023", 1000 이상은 그대로). */
export function displayNumber(id: string): string {
  return `#${id.padStart(3, '0')}`;
}

/** 받침 여부로 조사를 고른다(한글이 아니면 받침 없음으로 본다). 예: 민지가 / 준혁이. */
export function josa(
  name: string,
  withFinal: string,
  withoutFinal: string,
): string {
  const last = name.at(-1) ?? '';
  const code = last.charCodeAt(0) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
  return name + (hasFinal ? withFinal : withoutFinal);
}

function hintPhrase(count: number): string {
  return count === 0 ? '힌트 없이' : `힌트 ${count}개로`;
}

/** 문제 화면 배너(최대 두 줄). */
export function bannerLines(info: ShareInfo): [string] | [string, string] {
  if (!info.from) return ['친구가 낸 문제'];
  const first = `${josa(info.from, '이', '가')} 낸 문제`;
  if (info.result === 's' && info.hints !== undefined)
    return [
      first,
      `${josa(info.from, '은', '는')} ${hintPhrase(info.hints)} 맞힘`,
    ];
  if (info.result === 'g') return [first, `${info.from}도 못 맞힘`];
  return [first];
}

/** 결과 화면 비교 문구. mine: 내 결과와 내가 연 힌트 수. */
export function compareLine({
  info,
  mine,
}: {
  info: ShareInfo;
  mine: { result: ShareResult; hints: number };
}): string {
  const name = info.from;
  const solved = mine.result === 's';
  if (!name)
    return solved
      ? '다른 친구는 풀 수 있을까?'
      : '이 문제, 다른 친구도 걸릴까?';
  if (info.result === 's' && info.hints !== undefined) {
    if (!solved)
      return `${josa(name, '은', '는')} 맞혔는데… 다른 친구도 걸리나 내 보기`;
    const a = info.hints;
    const b = mine.hints;
    if (b < a)
      return `${name}보다 힌트를 ${a - b}개 덜 썼어요. 다른 친구는 어떨까?`;
    if (b === a)
      return a === 0
        ? `${josa(name, '이랑', '랑')} 똑같이 힌트 없이. 다음 친구는 이길까?`
        : `${josa(name, '이랑', '랑')} 똑같이 힌트 ${a}개. 다음 친구는 이길까?`;
    return `${josa(name, '은', '는')} ${hintPhrase(a)} 맞혔대요. 다음 친구는 이길 수 있을까?`;
  }
  if (info.result === 'g')
    return solved
      ? `${josa(name, '이', '가')} 포기한 문제를 맞혔어요! 자랑하러 가기`
      : `${name}도 포기한 문제예요. 다른 친구한테 넘기기`;
  return solved
    ? '맞혔어요! 다음 친구는 풀 수 있을까?'
    : `${name}도 이걸로 누굴 낚은 거예요. 다른 친구한테 내 보기`;
}

/** 공유 문구(정답 없음). */
export function shareText(question: string): string {
  return `🐰 이 문제 풀 수 있어? ${question}`;
}
