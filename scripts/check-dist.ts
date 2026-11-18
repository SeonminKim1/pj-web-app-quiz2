// npm run check:dist   빌드 마지막 단계. dist/의 HTML을 모두 읽어 검사하고, 위반이 있으면 모두 출력하고 종료 코드 1.
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import siteConfig from '../site.config.json' with { type: 'json' };
import type { QuizItem } from '../src/types/quiz.ts';
import { checkDist, type DistPage } from './build-check/check.ts';
import { resolveOrigin } from './og/pages.ts';
import { readRegistry } from './share/io.ts';
import { formatShareProblem } from './share/registry.ts';

const DIST = 'dist';

async function htmlFiles(dir: string, base = ''): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(join(dir, base), { withFileTypes: true })) {
    const rel = `${base}/${entry.name}`;
    if (entry.isDirectory()) out.push(...(await htmlFiles(dir, rel)));
    else if (entry.name.endsWith('.html')) out.push(rel);
  }
  return out;
}

const origin = resolveOrigin({
  env: process.env.SITE_ORIGIN,
  config: siteConfig.SITE_ORIGIN,
});
const { entries, problems: shape } = await readRegistry();
if (!origin.ok || shape.length > 0) {
  for (const problem of [...(origin.ok ? [] : [origin.problem]), ...shape])
    console.error(formatShareProblem(problem));
  process.exitCode = 1;
} else {
  const pages: DistPage[] = await Promise.all(
    (await htmlFiles(DIST)).map(async (path) => ({
      path,
      html: await readFile(join(DIST, path), 'utf8'),
    })),
  );
  const items = JSON.parse(
    await readFile('data/nonsense.json', 'utf8'),
  ) as QuizItem[];
  const problems = checkDist({
    pages,
    exists: (path) => existsSync(join(DIST, path)),
    origin: origin.origin,
    production: process.env.CONTEXT === 'production',
    registry: entries,
    items,
  });
  if (problems.length > 0) {
    for (const problem of problems) console.error(formatShareProblem(problem));
    console.error(`dist 검사 위반 ${problems.length}건`);
    process.exitCode = 1;
  } else {
    console.log(
      `dist 검사 통과: HTML ${pages.length}개, 등록부 ${entries.length}개 · origin ${origin.origin}`,
    );
  }
}
