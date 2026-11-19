// 글꼴 준비: npm run fonts. node_modules/pretendard의 동적 분할 글꼴에서 쓰는 굵기만
// public/fonts/pretendard/로 복사하고 CSS·라이선스를 쓴다(생성물, 커밋하지 않음).
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { licenseText, selectFontFaces } from './fonts/fontCss.ts';

const SOURCE_DIR = 'node_modules/pretendard/dist/web/static';
const OUTPUT_DIR = 'public/fonts/pretendard';
/** 본문 400, 버튼·제목 700, 로고·문제 800. */
const WEIGHTS = [400, 700, 800] as const;

async function main(): Promise<void> {
  const source = await readFile(
    join(SOURCE_DIR, 'pretendard-dynamic-subset.css'),
    'utf8',
  );
  const license = licenseText(source);
  const { css, files } = selectFontFaces({ css: source, weights: WEIGHTS });
  if (files.length === 0 || !license) {
    throw new Error('Pretendard CSS에서 글꼴을 찾지 못했어요');
  }
  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all(
    files.map((file) =>
      copyFile(
        join(SOURCE_DIR, 'woff2-dynamic-subset', file),
        join(OUTPUT_DIR, file),
      ),
    ),
  );
  await writeFile(
    join(OUTPUT_DIR, 'pretendard.css'),
    `/*\n${license}*/\n${css}\n`,
  );
  await writeFile(join(OUTPUT_DIR, 'LICENSE.txt'), license);
  console.log(`글꼴 준비 완료 → ${OUTPUT_DIR}/ (${files.length}개 파일)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
