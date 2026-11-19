// 빌드 결과(dist/) 검사. 순수 함수: 파일 목록과 내용을 받아 위반을 모두 돌려준다.
// 설계 문서 "빌드 단계 5"·"OG 메타 보강"·"빌드 때 HTML에 넣는 글자 이스케이프".
import type { QuizItem } from '../../src/types/quiz.ts';
import { publicItem } from '../og/pages.ts';
import type { RegistryEntry, ShareProblem } from '../share/registry.ts';

export type DistPage = { path: string; html: string };

/** 공유 주제 하나: 주소 앞부분, 등록부, 문제 데이터. */
export type DistShare = {
  prefix: string;
  registry: readonly RegistryEntry[];
  items: readonly QuizItem[];
};

function attr(html: string, pattern: RegExp): string[] {
  return [...html.matchAll(pattern)].map((match) => decodeEntities(match[1]!));
}

function decodeEntities(text: string): string {
  return text
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function meta(html: string, property: string): string | undefined {
  return attr(
    html,
    new RegExp(
      `<meta (?:property|name)="${property.replace(/[.:]/g, '\\$&')}" content="([^"]*)"`,
      'g',
    ),
  )[0];
}

/** 페이지 안의 #q-data(없으면 undefined, 깨졌으면 null). */
function readQData(html: string): unknown {
  const match = html.match(
    /<script type="application\/json" id="q-data">([\s\S]*?)<\/script>/,
  );
  if (!match) return undefined;
  try {
    return JSON.parse(match[1]!) as unknown;
  } catch {
    return null;
  }
}

function sameJson(a: unknown, b: unknown): boolean {
  const sort = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(sort)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([x], [y]) => x.localeCompare(y))
              .map(([k, v]) => [k, sort(v)]),
          )
        : value;
  return JSON.stringify(sort(a)) === JSON.stringify(sort(b));
}

export function checkDist({
  pages,
  exists,
  origin,
  production,
  shares,
  manifest,
}: {
  pages: readonly DistPage[];
  /** dist 기준 경로("/og/1-abc.png")가 있는지. */
  exists: (path: string) => boolean;
  origin: string;
  /** Netlify 정식 빌드(CONTEXT=production)면 https 정식 origin만 허용. */
  production: boolean;
  /** 공유 주제마다(넌센스 /q/, MBTI /m/ …). */
  shares: readonly DistShare[];
  /** dist/manifest.webmanifest를 읽은 값(없거나 JSON이 아니면 undefined). */
  manifest: unknown;
}): ShareProblem[] {
  const problems: ShareProblem[] = [];
  const add = (code: string, where: string, message: string, fix: string) =>
    problems.push({ code, where, message, fix });

  if (production && !/^https:\/\/[^/]+$/.test(origin)) {
    add(
      'OG_BAD_ORIGIN',
      'SITE_ORIGIN',
      `정식 빌드인데 origin이 ${JSON.stringify(origin)}이에요`,
      'site.config.json에 https:// 정식 주소를 적으세요',
    );
  }

  for (const page of pages) {
    const where = `dist${page.path}`;
    // 1) 페이지가 부르는 로컬 파일이 다 있는지.
    for (const ref of attr(page.html, /(?:src|href)="(\/(?!\/)[^"]*)"/g)) {
      const path = ref.split(/[?#]/)[0]!;
      if (!exists(path)) {
        add(
          'DIST_ASSET_MISSING',
          where,
          `${ref}를 부르는데 dist${path}가 없어요`,
          'npm run build를 처음부터 다시 돌리세요',
        );
      }
    }
    // 2) OG 주소는 정식 origin 아래, 이미지는 실제 PNG 파일.
    for (const [label, value] of [
      ['og:url', meta(page.html, 'og:url')],
      ['og:image', meta(page.html, 'og:image')],
      [
        'canonical',
        attr(page.html, /<link rel="canonical" href="([^"]*)"/g)[0],
      ],
    ] as const) {
      if (value === undefined) {
        add(
          'DIST_ASSET_MISSING',
          where,
          `${label}가 없어요`,
          'npm run build:og를 돌리세요',
        );
      } else if (!value.startsWith(`${origin}/`)) {
        add(
          'DIST_FOREIGN_ORIGIN',
          where,
          `${label} = ${value}, 기대한 접두사 ${origin}/`,
          'SITE_ORIGIN을 확인하고 npm run build:og를 다시 돌리세요',
        );
      }
    }
    const image = meta(page.html, 'og:image');
    if (image?.startsWith(`${origin}/`)) {
      const path = image.slice(origin.length);
      if (!path.endsWith('.png'))
        add(
          'DIST_ASSET_MISSING',
          where,
          `og:image가 PNG가 아니에요: ${image}`,
          'og-pages.ts를 확인하세요',
        );
      else if (!exists(path))
        add(
          'DIST_ASSET_MISSING',
          where,
          `og:image ${image}인데 dist${path}가 없어요`,
          'npm run build:og를 다시 돌리세요',
        );
    }
    // 3) 누군가의 공유 정보(닉네임)가 페이지에 박히면 안 된다.
    if (/[?&]from=/.test(page.html)) {
      add(
        'DIST_SHARE_PARAM',
        where,
        '페이지 안에 from= 공유 파라미터가 있어요',
        '빌드가 공유 링크를 HTML에 넣지 않게 고치세요',
      );
    }
  }

  // 4) 주제마다 등록부의 모든 id에 페이지가 있고, 공유 중인 문제는 #q-data가 원래 값과 같다.
  const byPath = new Map(pages.map((page) => [page.path, page]));
  for (const { prefix, registry, items } of shares) {
    const byId = new Map(items.map((item) => [item.id, item]));
    // 거꾸로: 이 주제 주소 아래 페이지는 모두 등록부에 있어야 한다(남은 옛 페이지·잘못 만든 페이지).
    const registered = new Set(registry.map((entry) => entry.id));
    const pagePattern = new RegExp(`^/${prefix}/([^/]+)/index\\.html$`);
    for (const page of pages) {
      const id = pagePattern.exec(page.path)?.[1];
      if (id !== undefined && !registered.has(id)) {
        add(
          'DIST_ORPHAN_PAGE',
          `dist${page.path}`,
          `/${prefix}/ 등록부에 없는 id ${id}의 페이지가 있어요`,
          'dist/를 지우고 npm run build를 처음부터 다시 돌리세요(등록부가 기준)',
        );
      }
    }
    for (const entry of registry) {
      const path = `/${prefix}/${entry.id}/index.html`;
      const page = byPath.get(path);
      if (!page) {
        add(
          'DIST_ASSET_MISSING',
          `/${prefix}/ id ${entry.id}`,
          `등록부에 있는데 dist${path}가 없어요`,
          'npm run build:og를 다시 돌리세요',
        );
        continue;
      }
      const item = byId.get(entry.id);
      if (item?.shareable !== true) continue;
      const qdata = readQData(page.html);
      if (
        qdata === undefined ||
        qdata === null ||
        !sameJson(qdata, publicItem(item))
      ) {
        add(
          'DIST_QDATA_MISSING',
          `dist${path}`,
          qdata === undefined
            ? '#q-data가 없어요'
            : '#q-data가 원래 문제 자료와 달라요(이스케이프 확인)',
          'npm run build:og를 다시 돌리고, 계속되면 scripts/og/pages.ts의 jsonForScript를 확인하세요',
        );
      }
    }
  }
  // 5) 설치(PWA): 서비스 워커와 manifest, manifest가 부르는 아이콘이 있다.
  if (!exists('/sw.js')) {
    add(
      'DIST_ASSET_MISSING',
      'dist/sw.js',
      '서비스 워커가 없어요',
      'npm run build:sw를 돌리세요',
    );
  }
  const icons =
    manifest && typeof manifest === 'object' && 'icons' in manifest
      ? manifest.icons
      : undefined;
  if (!Array.isArray(icons) || icons.length === 0) {
    add(
      'DIST_ASSET_MISSING',
      'dist/manifest.webmanifest',
      'manifest가 없거나 icons가 비었어요',
      'public/manifest.webmanifest를 확인하세요',
    );
  } else {
    for (const icon of icons as { src?: unknown }[]) {
      if (typeof icon.src !== 'string' || !exists(icon.src)) {
        add(
          'DIST_ASSET_MISSING',
          'dist/manifest.webmanifest',
          `아이콘 ${String(icon.src)}가 dist에 없어요`,
          'npx tsx scripts/app-icon.ts로 아이콘을 다시 만드세요',
        );
      }
    }
  }
  return problems;
}
