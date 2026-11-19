// npm run build:og [-- --only 23,m12]   빌드된 dist/에 문제별 OG 페이지와 카드 PNG를 만든다.
// npm run og:preview -- <키>          그 문제의 카드 한 장만 .tmp/og/<키>.png에 그린다(origin 필요 없음).
// 문제 키: 넌센스는 id(23), 다른 주제는 공유 앞부분 + id(MBTI m12). src/lib/shareLink.ts shareKey.
//
// 공유 주제(scripts/share/topics.ts)마다, 등록부의 id마다:
//   지금 shareable: true → /<prefix>/<id>/index.html(카드 + #q-data)
//   아니면              → /<prefix>/<id>/index.html(공통 카드, "쉬는 중"은 앱이 그린다)
// 카드: card가 question이면 문제 문장 카드, topic이면 주제 공통 카드 한 장(문제는 설명 줄에).
// 실패는 모두 모아서 출력하고 종료 코드 1. 스택은 .tmp/og-error-<id>.log.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import siteConfig from '../site.config.json' with { type: 'json' };
import { shareKey } from '../src/lib/shareLink.ts';
import type { QuizItem } from '../src/types/quiz.ts';
import {
  OgError,
  challengeCard,
  defaultCard,
  loadFonts,
  renderPng,
  topicCard,
  type CardFonts,
} from './og/card.ts';
import {
  DEFAULT_DESCRIPTION,
  SITE_NAME,
  ogImagePath,
  pageHtml,
  publicItem,
  resolveOrigin,
} from './og/pages.ts';
import { readRegistry } from './share/io.ts';
import {
  cardText,
  formatShareProblem,
  type ShareProblem,
} from './share/registry.ts';
import { fitCardText } from './share/textFit.ts';
import { SHARE_SETUPS, type ShareSetup } from './share/topics.ts';

const DIST = 'dist';
const TMP = '.tmp';

function arg(name: string): string | undefined {
  const at = process.argv.indexOf(name);
  return at === -1 ? undefined : process.argv[at + 1];
}

async function write(path: string, data: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
}

async function readItems(setup: ShareSetup): Promise<QuizItem[]> {
  return JSON.parse(await readFile(setup.dataFile, 'utf8')) as QuizItem[];
}

/** 주제 공통 카드의 문구와 페이지 제목(card: topic). */
function topicCardText(setup: ShareSetup): { title: string; action: string } {
  return {
    title: `이 사람 ${setup.topic.label}는?`,
    action: `${setup.topic.label} 퀴즈 맞혀 보기`,
  };
}

function cardFor(item: QuizItem) {
  const layout = fitCardText(cardText(item));
  if (!layout) {
    throw new OgError(
      'OG_RENDER',
      'layout 단계: 카드 글자가 안전 영역에 들어가지 않아요',
      'ogText를 더 짧게 적으세요',
    );
  }
  return challengeCard(layout);
}

async function logFailure(id: string, error: unknown): Promise<ShareProblem> {
  const log = join(TMP, `og-error-${id}.log`);
  const cause = (error as { cause?: unknown }).cause ?? error;
  await write(log, `${String((cause as Error).stack ?? cause)}\n`);
  if (error instanceof OgError) {
    return {
      code: error.code,
      where: `id ${id}`,
      message: `${error.message} (스택: ${log})`,
      fix: error.fix,
    };
  }
  return {
    code: 'OG_RENDER',
    where: `id ${id}`,
    message: `${(error as Error).message} (스택: ${log})`,
    fix: `npm run og:preview -- ${id}로 한 장만 다시 그려 보세요`,
  };
}

async function preview(key: string): Promise<void> {
  let found: { setup: ShareSetup; item: QuizItem } | undefined;
  for (const setup of SHARE_SETUPS) {
    const item = (await readItems(setup)).find(
      (it) => shareKey({ prefix: setup.prefix, id: it.id }) === key,
    );
    if (item) found = { setup, item };
  }
  if (!found) {
    console.error(
      `문제 키 ${key}인 문제가 없어요(넌센스는 23, MBTI는 m12처럼)`,
    );
    process.exitCode = 1;
    return;
  }
  const { setup, item } = found;
  const id = key;
  try {
    const card =
      setup.card === 'topic' ? topicCard(topicCardText(setup)) : cardFor(item);
    const png = await renderPng(card, await loadFonts());
    const out = join(TMP, 'og', `${id}.png`);
    await write(out, png);
    console.log(out);
  } catch (error) {
    console.error(formatShareProblem(await logFailure(id, error)));
    process.exitCode = 1;
  }
}

async function build(): Promise<void> {
  const problems: ShareProblem[] = [];
  const origin = resolveOrigin({
    env: process.env.SITE_ORIGIN,
    config: siteConfig.SITE_ORIGIN,
  });
  if (!origin.ok) problems.push(origin.problem);
  const registries = await Promise.all(
    SHARE_SETUPS.map(async (setup) => ({
      setup,
      ...(await readRegistry(setup.registryFile)),
    })),
  );
  const shape = registries.flatMap((registry) => registry.problems);
  problems.push(...shape);
  let template: string | undefined;
  try {
    template = await readFile(join(DIST, 'index.html'), 'utf8');
  } catch {
    problems.push({
      code: 'DIST_ASSET_MISSING',
      where: 'dist/index.html',
      message: '빌드된 앱이 없어요',
      fix: 'npm run build:app을 먼저 돌리세요',
    });
  }
  let fonts: CardFonts | undefined;
  try {
    fonts = await loadFonts();
  } catch (error) {
    problems.push(await logFailure('fonts', error));
  }
  if (!origin.ok || !template || !fonts || shape.length > 0) {
    for (const problem of problems) console.error(formatShareProblem(problem));
    process.exitCode = 1;
    return;
  }

  const base = origin.origin;
  const only = arg('--only')
    ?.split(',')
    .map((key) => key.trim());

  const defaultPng = await renderPng(defaultCard(), fonts);
  const defaultImage = ogImagePath('default', defaultPng);
  await write(join(DIST, defaultImage), defaultPng);
  // 첫 화면도 공통 카드로.
  await write(
    join(DIST, 'index.html'),
    pageHtml({
      template,
      meta: {
        title: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        url: `${base}/`,
        image: `${base}${defaultImage}`,
      },
    }),
  );

  const counts: string[] = [];
  for (const { setup, entries } of registries) {
    const items = new Map(
      (await readItems(setup)).map((item) => [item.id, item]),
    );
    // 주제 공통 카드(card: topic)는 한 장만 그려 그 주제의 모든 페이지가 같이 쓴다(쉬는 중 포함).
    let topicImage: string | undefined;
    if (setup.card === 'topic') {
      const png = await renderPng(topicCard(topicCardText(setup)), fonts);
      topicImage = ogImagePath(`${setup.topic.id}-card`, png);
      await write(join(DIST, topicImage), png);
    }
    let challenges = 0;
    let resting = 0;
    for (const entry of entries) {
      const key = shareKey({ prefix: setup.prefix, id: entry.id });
      if (only && !only.includes(key)) continue;
      const item = items.get(entry.id);
      const url = `${base}/${setup.prefix}/${entry.id}/`;
      try {
        let html: string;
        if (item?.shareable === true) {
          let image = topicImage;
          if (!image) {
            const png = await renderPng(cardFor(item), fonts);
            image = ogImagePath(key, png);
            await write(join(DIST, image), png);
          }
          html = pageHtml({
            template,
            meta: {
              title: `${setup.card === 'topic' ? topicCardText(setup).title : '이 문제 풀 수 있어?'} · ${SITE_NAME}`,
              description: cardText(item),
              url,
              image: `${base}${image}`,
            },
            qdata: publicItem(item),
          });
          challenges++;
        } else {
          html = pageHtml({
            template,
            meta: {
              title: SITE_NAME,
              description: DEFAULT_DESCRIPTION,
              url,
              image: `${base}${topicImage ?? defaultImage}`,
            },
          });
          resting++;
        }
        await write(join(DIST, setup.prefix, entry.id, 'index.html'), html);
      } catch (error) {
        problems.push(await logFailure(key, error));
      }
    }
    counts.push(
      `${setup.topic.label} dist/${setup.prefix}/ (문제 ${challenges}, 쉬는 중 ${resting})`,
    );
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(formatShareProblem(problem));
    process.exitCode = 1;
    return;
  }
  console.log(`OG 페이지 완료 → ${counts.join(', ')} · origin ${base}`);
}

const previewId = arg('--preview');
await (previewId ? preview(previewId) : build());
