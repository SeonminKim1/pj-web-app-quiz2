import { describe, expect, it } from 'vitest';
import { challengeCard, defaultCard, loadFonts, renderPng } from './card.ts';
import {
  escapeHtml,
  jsonForScript,
  ogImagePath,
  pageHtml,
  publicItem,
  resolveOrigin,
} from './pages.ts';
import { fitCardText } from '../share/textFit.ts';

const TEMPLATE = `<!doctype html><html lang="ko"><head>
    <meta charset="UTF-8" />
    <title>퀴즈 놀이터</title>
  </head><body><div id="root"></div></body></html>`;

const META = {
  title: '이 문제 풀 수 있어? · 퀴즈 놀이터',
  description: '"따옴표" <태그> & 앰퍼샌드',
  url: 'https://quiz.example/q/1/',
  image: 'https://quiz.example/og/1-abc.png',
};

describe('resolveOrigin', () => {
  it('환경 변수가 먼저, 없으면 설정 파일', () => {
    expect(
      resolveOrigin({ env: 'https://a.netlify.app', config: 'https://b.app' }),
    ).toEqual({
      ok: true,
      origin: 'https://a.netlify.app',
    });
    expect(resolveOrigin({ env: undefined, config: 'https://b.app' })).toEqual({
      ok: true,
      origin: 'https://b.app',
    });
    expect(
      resolveOrigin({ env: 'http://localhost:4173', config: '' }),
    ).toMatchObject({ ok: true });
  });

  it('비었으면 OG_NO_ORIGIN, 형식이 틀리면 OG_BAD_ORIGIN(값을 보여 준다)', () => {
    expect(resolveOrigin({ env: undefined, config: '' })).toMatchObject({
      ok: false,
      problem: { code: 'OG_NO_ORIGIN' },
    });
    for (const bad of [
      'https://a.app/',
      'http://a.app',
      'https://a.app/q',
      'a.app',
    ]) {
      const result = resolveOrigin({ env: bad, config: '' });
      expect(result).toMatchObject({
        ok: false,
        problem: { code: 'OG_BAD_ORIGIN' },
      });
      if (!result.ok)
        expect(result.problem.message).toContain(JSON.stringify(bad));
    }
  });
});

describe('pageHtml', () => {
  it('title을 OG 메타로 바꾸고 값은 이스케이프한다', () => {
    const html = pageHtml({ template: TEMPLATE, meta: META });
    expect(html).toContain('<title>이 문제 풀 수 있어? · 퀴즈 놀이터</title>');
    expect(html).toContain(
      '<meta property="og:image" content="https://quiz.example/og/1-abc.png" />',
    );
    expect(html).toContain('<meta property="og:image:width" content="1200" />');
    expect(html).toContain('<meta property="og:image:height" content="630" />');
    expect(html).toContain(
      '<meta property="og:image:type" content="image/png" />',
    );
    expect(html).toContain(
      'content="&quot;따옴표&quot; &lt;태그&gt; &amp; 앰퍼샌드"',
    );
    expect(html).not.toContain('<태그>');
    expect(html.match(/<title>/g)).toHaveLength(1);
  });

  it('#q-data는 </script>로 끊기지 않는다', () => {
    const item = {
      id: '1',
      question: '</script><script>alert(1)</script>',
      answer: '답',
      shareable: true,
    };
    const html = pageHtml({ template: TEMPLATE, meta: META, qdata: item });
    const match = html.match(
      /<script type="application\/json" id="q-data">([\s\S]*?)<\/script>/,
    );
    expect(match).not.toBeNull();
    expect(JSON.parse(match![1]!)).toEqual(item);
    expect(html.indexOf('id="q-data"')).toBeLessThan(html.indexOf('</head>'));
    // noscript에는 문제만(이스케이프), 정답은 없다.
    const noscript = html.match(/<noscript>([\s\S]*?)<\/noscript>/)![1]!;
    expect(noscript).toContain('&lt;/script&gt;');
    expect(noscript).not.toContain('답');
  });

  it('틀에 <title>이 없으면 실패', () => {
    expect(() => pageHtml({ template: '<head></head>', meta: META })).toThrow();
  });

  it('$ 같은 치환 패턴이 들어가도 그대로', () => {
    const html = pageHtml({
      template: TEMPLATE,
      meta: { ...META, description: "$& $' $1" },
    });
    expect(html).toContain('content="$&amp; $&#39; $1"');
  });
});

describe('자잘한 도우미', () => {
  it('escapeHtml·jsonForScript', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
    expect(jsonForScript({ s: '< ' })).toBe('{"s":"\\u003c\\u2028"}');
  });

  it('publicItem은 카드 전용 필드를 뺀다', () => {
    expect(
      publicItem({
        id: '1',
        question: 'q',
        answer: 'a',
        ogText: 'o',
        allowAnswerInCard: true,
        shareable: true,
      }),
    ).toEqual({ id: '1', question: 'q', answer: 'a', shareable: true });
  });

  it('이미지 주소는 내용 해시로 바뀐다', () => {
    const a = ogImagePath('1', new Uint8Array([1, 2]));
    expect(a).toMatch(/^\/og\/1-[0-9a-f]{10}\.png$/);
    expect(ogImagePath('1', new Uint8Array([1, 3]))).not.toBe(a);
  });
});

describe('카드 그리기', () => {
  it('1200×630 PNG, 같은 입력이면 같은 바이트', async () => {
    const fonts = await loadFonts();
    const layout = fitCardText('지구가 제일 힘들었던 시기는?')!;
    const first = await renderPng(challengeCard(layout), fonts);
    const second = await renderPng(challengeCard(layout), fonts);
    expect(first.subarray(1, 4).toString()).toBe('PNG');
    expect(first.readUInt32BE(16)).toBe(1200);
    expect(first.readUInt32BE(20)).toBe(630);
    expect(first.equals(second)).toBe(true);
    const common = await renderPng(defaultCard(), fonts);
    expect(common.equals(first)).toBe(false);
  }, 20000);
});
