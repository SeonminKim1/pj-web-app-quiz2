// OG 카드 글자 배치(설계 문서 "글자 배치 규칙"). 가운데 630×630 안전 영역(최대 줄 폭 590px)에 들어가도록
// 한글 한 글자 폭 ≈ 글자 크기로 보고 줄당 글자 수를 정한다: 56px 10자×3줄 → 안 되면 48px 12자×4줄.
// 줄은 띄어쓰기에서 먼저 나누고, 한 어절이 한 줄보다 길 때만 글자 단위로 자른다.
import { cutGraphemes } from '../../src/lib/shareLink.ts';

export type CardLayout = { size: 56 | 48; lines: string[] };

const RULES = [
  { size: 56, perLine: 10, maxLines: 3 },
  { size: 48, perLine: 12, maxLines: 4 },
] as const;

function graphemes(text: string): string[] {
  const out: string[] = [];
  let rest = text;
  while (rest.length > 0) {
    const one = cutGraphemes(rest, 1);
    out.push(one);
    rest = rest.slice(one.length);
  }
  return out;
}

/** 줄 나누기. 넘치면 undefined. */
export function wrapText(
  text: string,
  perLine: number,
  maxLines: number,
): string[] | undefined {
  const lines: string[] = [];
  let line: string[] = [];
  const push = () => {
    if (line.length > 0) lines.push(line.join(''));
    line = [];
  };
  for (const word of text.trim().split(/\s+/)) {
    const chars = graphemes(word);
    const needed =
      line.length === 0 ? chars.length : line.length + 1 + chars.length;
    if (needed <= perLine) {
      if (line.length > 0) line.push(' ');
      line.push(...chars);
      continue;
    }
    push();
    // 한 어절이 한 줄보다 길면 글자 단위로 자른다.
    let rest = chars;
    while (rest.length > perLine) {
      lines.push(rest.slice(0, perLine).join(''));
      rest = rest.slice(perLine);
    }
    line = [...rest];
  }
  push();
  return lines.length <= maxLines ? lines : undefined;
}

/** 카드에 넣을 수 있으면 글자 크기와 줄, 아니면 undefined(빌드 실패 → ogText 필요). */
export function fitCardText(text: string): CardLayout | undefined {
  for (const rule of RULES) {
    const lines = wrapText(text, rule.perLine, rule.maxLines);
    if (lines) return { size: rule.size, lines };
  }
  return undefined;
}
