// 문제별 정적 페이지(/q/<id>/index.html) 만들기. 순수 함수만 둔다(테스트하기 쉽게).
// 빌드된 dist/index.html을 틀로 쓰고, <title> 자리에 OG 메타를, </head> 앞에 #q-data를 넣는다.
import { createHash } from 'node:crypto';
import type { QuizItem } from '../../src/types/quiz.ts';
import type { ShareProblem } from '../share/registry.ts';

export const SITE_NAME = '퀴즈 놀이터';
export const DEFAULT_DESCRIPTION = '넌센스 퀴즈 풀고 친구한테 내기';

const ORIGIN = /^https:\/\/[^/\s]+$/;
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** 정식 origin: 환경 변수 SITE_ORIGIN → site.config.json. 끝 슬래시 없음. */
export function resolveOrigin({
  env,
  config,
}: {
  env: string | undefined;
  config: string | undefined;
}): { ok: true; origin: string } | { ok: false; problem: ShareProblem } {
  const [key, value] = env
    ? ['SITE_ORIGIN(환경 변수)', env]
    : ['site.config.json SITE_ORIGIN', config ?? ''];
  if (!value) {
    return {
      ok: false,
      problem: {
        code: 'OG_NO_ORIGIN',
        where: 'site.config.json',
        message:
          'SITE_ORIGIN이 비어 있어요. OG 이미지 주소는 절대 URL이어야 해요',
        fix: 'site.config.json에 정식 주소(https://…)를 적거나, 로컬에서는 SITE_ORIGIN=http://localhost:4173 npm run build',
      },
    };
  }
  if (!ORIGIN.test(value) && !LOCAL_ORIGIN.test(value)) {
    return {
      ok: false,
      problem: {
        code: 'OG_BAD_ORIGIN',
        where: key,
        message: `형식이 틀렸어요: 실제 값 ${JSON.stringify(value)}`,
        fix: 'https://이름.netlify.app처럼 경로와 끝 슬래시 없이 적으세요',
      },
    };
  }
  return { ok: true, origin: value };
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** <script type="application/json"> 안에 넣어도 태그가 끊기지 않는 JSON. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll(' ', '\\u2028')
    .replaceAll(' ', '\\u2029');
}

/** 내용이 바뀌면 주소도 바뀌게(메신저 캐시) 이미지 내용의 해시를 파일 이름에 넣는다. */
export function ogImagePath(name: string, png: Uint8Array): string {
  const hash = createHash('sha256').update(png).digest('hex').slice(0, 10);
  return `/og/${name}-${hash}.png`;
}

export type PageMeta = {
  title: string;
  description: string;
  url: string;
  image: string;
};

function metaTags(meta: PageMeta): string {
  const tags: [string, string, string][] = [
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', SITE_NAME],
    ['property', 'og:title', meta.title],
    ['property', 'og:description', meta.description],
    ['property', 'og:url', meta.url],
    ['property', 'og:image', meta.image],
    ['property', 'og:image:type', 'image/png'],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'description', meta.description],
  ];
  return [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
    ...tags.map(
      ([attr, key, value]) =>
        `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`,
    ),
  ].join('\n    ');
}

/** 틀(dist/index.html)에 메타와 #q-data를 넣는다. 틀에 <title>이 정확히 하나 있어야 한다. */
export function pageHtml({
  template,
  meta,
  qdata,
}: {
  template: string;
  meta: PageMeta;
  qdata?: QuizItem;
}): string {
  const titles = template.match(/<title>[\s\S]*?<\/title>/g) ?? [];
  if (titles.length !== 1 || !template.includes('</head>')) {
    throw new Error('dist/index.html에 <title>이 하나, </head>가 있어야 해요');
  }
  let html = template.replace(/<title>[\s\S]*?<\/title>/, () => metaTags(meta));
  if (qdata) {
    const script = `<script type="application/json" id="q-data">${jsonForScript(qdata)}</script>\n  `;
    html = html.replace('</head>', () => `${script}</head>`);
  }
  return html;
}

/** 페이지에 넣는 문제 자료(앱이 받는 공개 필드와 같다). */
export function publicItem(item: QuizItem): QuizItem {
  const { ogText: _og, allowAnswerInCard: _allow, ...rest } = item;
  return { ...rest, shareable: true };
}
