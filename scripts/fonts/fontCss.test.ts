// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { licenseText, selectFontFaces } from './fontCss.ts';

const face = (weight: number, name: string, index: number) => `/* [${index}] */
@font-face {
	font-family: 'Pretendard';
	font-style: normal;
	font-display: swap;
	font-weight: ${weight};
	src: url(./woff2-dynamic-subset/Pretendard-${name}.subset.${index}.woff2) format('woff2'), url(./woff-dynamic-subset/Pretendard-${name}.subset.${index}.woff) format('woff');
	unicode-range: U+ac00-ac10;
}`;

const CSS = `/*
Copyright (c) 2021 Kil Hyung-jin, with Reserved Font Name Pretendard.
This Font Software is licensed under the SIL Open Font License, Version 1.1.
*/
${face(100, 'Thin', 0)}
${face(400, 'Regular', 0)}
${face(400, 'Regular', 1)}
${face(700, 'Bold', 0)}
${face(900, 'Black', 0)}`;

describe('selectFontFaces', () => {
  it('고른 굵기만 남기고 src를 같은 폴더의 woff2 하나로 바꾼다', () => {
    const { css, files } = selectFontFaces({ css: CSS, weights: [400, 700] });
    expect(files).toEqual([
      'Pretendard-Regular.subset.0.woff2',
      'Pretendard-Regular.subset.1.woff2',
      'Pretendard-Bold.subset.0.woff2',
    ]);
    expect(css.match(/@font-face/g)).toHaveLength(3);
    expect(css).toContain(
      "src: url(./Pretendard-Regular.subset.0.woff2) format('woff2');",
    );
    expect(css).not.toContain('woff-dynamic-subset');
    expect(css).not.toContain('Thin');
    expect(css).toContain('unicode-range: U+ac00-ac10;');
    expect(css).toContain('font-display: swap;');
  });

  it('맞는 굵기가 없으면 비어 있다', () => {
    expect(selectFontFaces({ css: CSS, weights: [300] })).toEqual({
      css: '',
      files: [],
    });
  });
});

describe('licenseText', () => {
  it('맨 앞 주석(OFL 안내)을 뽑는다', () => {
    expect(licenseText(CSS)).toContain('SIL Open Font License');
    expect(licenseText('@font-face {}')).toBe('');
  });
});
