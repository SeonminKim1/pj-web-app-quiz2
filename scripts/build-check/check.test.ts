import { describe, expect, it } from 'vitest';
import { pageHtml, publicItem } from '../og/pages.ts';
import { checkDist } from './check.ts';

const ORIGIN = 'https://quiz.example';
const TEMPLATE = `<!doctype html><html><head><title>퀴즈 놀이터</title>
<script type="module" src="/assets/index-abc.js"></script></head><body><div id="root"></div></body></html>`;
const NASTY = {
  id: '7',
  question: '</script><img onerror=x>"&',
  answer: '답',
  shareable: true,
};

function page(
  id: string,
  image = `${ORIGIN}/og/${id}-aaaa.png`,
  qdata?: object,
) {
  return {
    path: `/q/${id}/index.html`,
    html: pageHtml({
      template: TEMPLATE,
      meta: { title: 't', description: 'd', url: `${ORIGIN}/q/${id}/`, image },
      qdata: qdata as never,
    }),
  };
}

const FILES = new Set([
  '/assets/index-abc.js',
  '/og/7-aaaa.png',
  '/og/8-aaaa.png',
]);
const base = {
  exists: (path: string) => FILES.has(path),
  origin: ORIGIN,
  production: true,
  registry: [
    { id: '7', answerKey: 'x', firstPublished: '2026-11-18' },
    { id: '8', answerKey: 'y', firstPublished: '2026-11-18' },
  ],
  items: [NASTY, { id: '8', question: 'q', answer: 'a', shareable: false }],
};

describe('checkDist', () => {
  it('정상 빌드는 통과(까다로운 문구도 #q-data가 원래 값으로 돌아온다)', () => {
    const pages = [page('7', undefined, publicItem(NASTY)), page('8')];
    expect(checkDist({ ...base, pages })).toEqual([]);
  });

  it('위반을 모두 모은다', () => {
    const pages = [
      page('7', 'https://deploy-preview-3--quiz.netlify.app/og/7-aaaa.png'),
      {
        path: '/index.html',
        html: TEMPLATE.replace('index-abc', 'index-old').replace(
          '<title>퀴즈 놀이터</title>',
          '',
        ),
      },
      {
        path: '/q/9/index.html',
        html: page('9').html.replace(
          '</body>',
          '<a href="/q/9/?s=1&from=a">x</a></body>',
        ),
      },
    ];
    const codes = checkDist({ ...base, pages }).map((problem) => problem.code);
    expect(codes).toContain('DIST_FOREIGN_ORIGIN'); // 7: preview 도메인
    expect(codes).toContain('DIST_QDATA_MISSING'); // 7: 공유 중인데 #q-data 없음
    expect(codes).toContain('DIST_ASSET_MISSING'); // index-old.js, og 없음, 8 페이지 없음
    expect(codes).toContain('DIST_SHARE_PARAM'); // 9: from=
  });

  it('#q-data가 원래 값과 다르면 DIST_QDATA_MISSING', () => {
    const pages = [
      page('7', undefined, { ...publicItem(NASTY), answer: '다른 답' }),
      page('8'),
    ];
    expect(
      checkDist({ ...base, pages }).map((problem) => problem.code),
    ).toEqual(['DIST_QDATA_MISSING']);
  });

  it('정식 빌드에서는 localhost origin을 막고, 로컬에서는 허용', () => {
    const local = 'http://localhost:4173';
    const pages = [
      {
        ...page('7', `${local}/og/7-aaaa.png`, publicItem(NASTY)),
        html: page(
          '7',
          `${local}/og/7-aaaa.png`,
          publicItem(NASTY),
        ).html.replaceAll(ORIGIN, local),
      },
      { ...page('8'), html: page('8').html.replaceAll(ORIGIN, local) },
    ];
    expect(
      checkDist({ ...base, pages, origin: local, production: false }),
    ).toEqual([]);
    expect(
      checkDist({ ...base, pages, origin: local, production: true }).map(
        (problem) => problem.code,
      ),
    ).toEqual(['OG_BAD_ORIGIN']);
  });
});
