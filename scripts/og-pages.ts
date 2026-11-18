// npm run build:og [-- --only 23,41]   빌드된 dist/에 문제별 OG 페이지와 카드 PNG를 만든다.
// npm run og:preview -- <id>          그 문제의 카드 한 장만 .tmp/og/<id>.png에 그린다(origin 필요 없음).
//
// 등록부의 id마다:
//   지금 shareable: true → /q/<id>/index.html(문제 카드 + #q-data)
//   아니면              → /q/<id>/index.html(공통 카드, "쉬는 중"은 앱이 그린다)
// 실패는 모두 모아서 출력하고 종료 코드 1. 스택은 .tmp/og-error-<id>.log.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import siteConfig from '../site.config.json' with { type: 'json' };
import type { QuizItem } from '../src/types/quiz.ts';
import {
  OgError,
  challengeCard,
  defaultCard,
  loadFonts,
  renderPng,
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

async function readItems(): Promise<QuizItem[]> {
  return JSON.parse(await readFile('data/nonsense.json', 'utf8')) as QuizItem[];
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

async function preview(id: string): Promise<void> {
  const item = (await readItems()).find((it) => it.id === id);
  if (!item) {
    console.error(`id ${id}인 문제가 data/nonsense.json에 없어요`);
    process.exitCode = 1;
    return;
  }
  try {
    const png = await renderPng(cardFor(item), await loadFonts());
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
  const { entries, problems: shape } = await readRegistry();
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
    .map((id) => id.trim());
  const items = new Map((await readItems()).map((item) => [item.id, item]));

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

  let challenges = 0;
  let resting = 0;
  for (const entry of entries) {
    if (only && !only.includes(entry.id)) continue;
    const item = items.get(entry.id);
    const url = `${base}/q/${entry.id}/`;
    try {
      let html: string;
      if (item?.shareable === true) {
        const png = await renderPng(cardFor(item), fonts);
        const image = ogImagePath(entry.id, png);
        await write(join(DIST, image), png);
        html = pageHtml({
          template,
          meta: {
            title: `이 문제 풀 수 있어? · ${SITE_NAME}`,
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
            image: `${base}${defaultImage}`,
          },
        });
        resting++;
      }
      await write(join(DIST, 'q', entry.id, 'index.html'), html);
    } catch (error) {
      problems.push(await logFailure(entry.id, error));
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(formatShareProblem(problem));
    process.exitCode = 1;
    return;
  }
  console.log(
    `OG 페이지 완료 → dist/q/ (문제 ${challenges}, 쉬는 중 ${resting}) · origin ${base}`,
  );
}

const previewId = arg('--preview');
await (previewId ? preview(previewId) : build());
