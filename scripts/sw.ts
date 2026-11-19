// npm run build:sw   dist/를 훑어 dist/sw.js(오프라인용 서비스 워커)를 만든다. build:og 뒤, check:dist 앞에 돈다.
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildSwConfig, swSource, type DistFile } from './sw/config.ts';

const DIST = 'dist';
// 공유 페이지·카드 그림은 수가 많고 미리 받지 않으므로 해시도 읽지 않는다.
const SKIP = new Set(['/q', '/m', '/og']);

async function walk(base = ''): Promise<DistFile[]> {
  const out: DistFile[] = [];
  for (const entry of await readdir(join(DIST, base), {
    withFileTypes: true,
  })) {
    const path = `${base}/${entry.name}`;
    if (SKIP.has(path)) continue;
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else {
      const hash = createHash('sha256')
        .update(await readFile(join(DIST, path)))
        .digest('hex');
      out.push({ path, hash });
    }
  }
  return out;
}

const config = buildSwConfig(await walk());
const worker = await readFile('scripts/sw/worker.js', 'utf8');
await writeFile(join(DIST, 'sw.js'), swSource(config, worker));
console.log(
  `서비스 워커 완료 → dist/sw.js (버전 ${config.version}, 미리 받기 ${config.precache.length}개)`,
);
