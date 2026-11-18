// Pretendard 동적 분할 CSS에서 필요한 굵기만 골라 내는 순수 함수(scripts/fonts.ts가 쓴다).

/** 고른 글꼴 CSS와 복사할 woff2 파일 이름(원본 woff2-dynamic-subset 폴더 기준). */
export type SelectedFontFaces = {
  css: string;
  files: string[];
};

const FONT_FACE = /@font-face\s*\{[^}]*\}/g;
const WEIGHT = /font-weight:\s*(\d+)\s*;/;
const WOFF2_URL =
  /url\(\.\/woff2-dynamic-subset\/([^)]+\.woff2)\)\s*format\('woff2'\)/;

/**
 * 원본 CSS의 @font-face 중 weights 굵기만 남기고, src를 같은 폴더의 woff2 하나로 바꾼다
 * (woff 대체는 뺀다. 지원 브라우저가 모두 woff2를 읽는다).
 */
export function selectFontFaces({
  css,
  weights,
}: {
  css: string;
  weights: readonly number[];
}): SelectedFontFaces {
  const faces: string[] = [];
  const files: string[] = [];
  for (const block of css.match(FONT_FACE) ?? []) {
    const weight = Number(WEIGHT.exec(block)?.[1]);
    if (!weights.includes(weight)) continue;
    const file = WOFF2_URL.exec(block)?.[1];
    if (!file) continue;
    files.push(file);
    faces.push(
      block.replace(/src:[^;]*;/, `src: url(./${file}) format('woff2');`),
    );
  }
  return { css: faces.join('\n'), files };
}

/** 원본 CSS 맨 앞 주석(저작권·OFL 전문)을 돌려준다. 없으면 빈 문자열. */
export function licenseText(css: string): string {
  const match = /^\s*\/\*([\s\S]*?)\*\//.exec(css);
  return match ? `${match[1]!.trim()}\n` : '';
}
