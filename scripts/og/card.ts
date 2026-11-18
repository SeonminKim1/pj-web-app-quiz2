// OG 카드 그리기: satori(요소 → SVG) → resvg-wasm(SVG → PNG). 설계 문서 "OG 이미지".
// - 1200×630. 글자는 가운데 630×630 안전 영역 안에만(카톡이 정사각형으로 자르는 경우).
// - 이미지 안에는 이모지를 쓰지 않는다(폰트에 없음). 방해꾼 그림은 앱의 PetPortrait SVG를 그대로 쓴다.
// - 글자 줄은 fitCardText가 정한 대로 한 줄씩 그린다(satori가 다시 줄을 바꾸지 않게 nowrap).
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import satori from 'satori';
import { PetPortrait } from '../../src/components/PetPortrait.tsx';
import type { CardLayout } from '../share/textFit.ts';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
const SAFE = 630;

// src/index.css 토큰과 같은 값(이미지라 CSS 변수를 못 쓴다).
const COLOR = {
  bg: '#fff6ec',
  surface: '#ffffff',
  ink: '#3a2e2e',
  inkSoft: '#6e5d5d',
  pink: '#ff9ebb',
  pinkSoft: '#ffe1ea',
  mintSoft: '#e2f7f0',
};

const require = createRequire(import.meta.url);

export class OgError extends Error {
  readonly code: 'OG_FONT_MISSING' | 'OG_RENDER';
  readonly fix: string;
  constructor(code: OgError['code'], message: string, fix: string) {
    super(message);
    this.code = code;
    this.fix = fix;
  }
}

export type CardFonts = {
  name: string;
  data: Buffer;
  weight: 400 | 700 | 800;
  style: 'normal';
}[];

/** Pretendard OTF 위치(설치된 pretendard 패키지 기준). */
export function fontPaths(): { bold: string; extraBold: string } {
  const root = dirname(require.resolve('pretendard/package.json'));
  const dir = join(root, 'dist/public/static');
  return {
    bold: join(dir, 'Pretendard-Bold.otf'),
    extraBold: join(dir, 'Pretendard-ExtraBold.otf'),
  };
}

export async function loadFonts(): Promise<CardFonts> {
  const paths = fontPaths();
  try {
    const [bold, extraBold] = await Promise.all([
      readFile(paths.bold),
      readFile(paths.extraBold),
    ]);
    return [
      ...(await loadJua()),
      { name: 'Pretendard', data: bold, weight: 700, style: 'normal' },
      { name: 'Pretendard', data: extraBold, weight: 800, style: 'normal' },
    ];
  } catch {
    throw new OgError(
      'OG_FONT_MISSING',
      `카드 글꼴을 찾지 못했어요(${JUA_FILE}, ${paths.bold})`,
      '저장소 루트에서 실행했는지 확인하고, npm ci로 pretendard 패키지를 다시 설치하세요',
    );
  }
}

export const JUA_FILE = 'scripts/og/fonts/Jua-Regular.ttf';

/** 주아체(OFL, scripts/og/fonts/Jua-Regular.ttf). 카드 그리기에만 쓴다(앱은 @fontsource/jua). */
async function loadJua(): Promise<CardFonts> {
  // npm 스크립트와 테스트는 저장소 루트에서 돈다.
  const file = JUA_FILE;
  return [
    { name: 'Jua', data: await readFile(file), weight: 400, style: 'normal' },
  ];
}

let wasmReady: Promise<void> | undefined;
function ensureWasm(): Promise<void> {
  wasmReady ??= readFile(
    require.resolve('@resvg/resvg-wasm/index_bg.wasm'),
  ).then((wasm) => initWasm(wasm));
  return wasmReady;
}

function petImage(size: number): string {
  const svg = renderToStaticMarkup(
    createElement(PetPortrait, { animal: 'rabbit', mood: 'smug' }),
  )
    // 이미지로 쓰려면 xmlns가 있어야 한다(renderToStaticMarkup은 넣지 않음).
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replace('width="56"', `width="${size}"`)
    .replace('height="56"', `height="${size}"`);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

type Style = Record<string, string | number>;
function el(
  type: string,
  style: Style,
  ...children: ReactNode[]
): ReactElement {
  return createElement(
    type,
    { style: { display: 'flex', ...style } },
    ...children,
  );
}

function frame(...content: ReactNode[]): ReactElement {
  const dot = (left: number, top: number, size: number, color: string) =>
    el('div', {
      position: 'absolute',
      left,
      top,
      width: size,
      height: size,
      borderRadius: size,
      background: color,
    });
  return el(
    'div',
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      background: COLOR.bg,
      justifyContent: 'center',
      fontFamily: 'Jua',
      color: COLOR.ink,
      position: 'relative',
    },
    // 안전 영역 밖은 장식만.
    dot(60, 70, 120, COLOR.pinkSoft),
    dot(150, 420, 80, COLOR.mintSoft),
    dot(1010, 90, 90, COLOR.mintSoft),
    dot(960, 400, 150, COLOR.pinkSoft),
    el(
      'div',
      {
        width: SAFE,
        height: SAFE,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: 20,
      },
      ...content,
    ),
  );
}

function brand(): ReactElement {
  return el(
    'div',
    { alignItems: 'center', gap: 12 },
    createElement('img', { src: petImage(88), width: 88, height: 88 }),
    el(
      'div',
      { fontSize: 30, fontWeight: 400, color: COLOR.inkSoft },
      '퀴즈 놀이터',
    ),
  );
}

function pill(text: string): ReactElement {
  return el(
    'div',
    {
      padding: '14px 32px',
      borderRadius: 999,
      background: COLOR.pink,
      border: `3px solid ${COLOR.ink}`,
      fontSize: 34,
      fontWeight: 400,
    },
    text,
  );
}

/** 문제 카드. */
export function challengeCard(layout: CardLayout): ReactElement {
  return frame(
    brand(),
    el(
      'div',
      {
        flexDirection: 'column',
        alignItems: 'center',
        gap: Math.round(layout.size * 0.2),
      },
      ...layout.lines.map((line) =>
        el(
          'div',
          {
            fontSize: layout.size,
            fontWeight: 400,
            lineHeight: 1.15,
            whiteSpace: 'nowrap',
          },
          line,
        ),
      ),
    ),
    pill('이 문제 풀 수 있어?'),
  );
}

/** 공통 카드(쉬는 중·첫 화면). */
export function defaultCard(): ReactElement {
  return frame(
    brand(),
    el('div', { fontSize: 56, fontWeight: 400 }, '넌센스 퀴즈'),
    pill('풀고 친구한테 내기'),
  );
}

export type RenderStage = 'svg' | 'png';

export async function renderPng(
  element: ReactElement,
  fonts: CardFonts,
): Promise<Buffer> {
  let stage: RenderStage = 'svg';
  try {
    const svg = await satori(element, {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      fonts,
    });
    stage = 'png';
    await ensureWasm();
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: CARD_WIDTH } })
      .render()
      .asPng();
    return Buffer.from(png);
  } catch (error) {
    const wrapped = new OgError(
      'OG_RENDER',
      `${stage} 단계에서 실패했어요: ${(error as Error).message}`,
      '.tmp/og-error-<id>.log의 스택을 보고, npm run og:preview -- <id>로 한 장만 다시 그려 보세요',
    );
    wrapped.cause = error;
    throw wrapped;
  }
}
