// 퀴즈 데이터 스크립트의 파일 입출력. 다른 모듈은 파일을 직접 읽거나 쓰지 않는다.
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Problem, RawFiles } from './check.ts';

/** 쓸 파일 하나: 경로와 내용. */
export type OutputFile = {
  path: string;
  content: string;
};

/**
 * dir 바로 아래의 .json 파일을 모두 읽는다(하위 폴더는 보지 않음).
 * JSON이 아닌 파일은 위반으로 모으고 나머지는 계속 읽는다. 폴더가 없으면 빈 결과.
 */
export async function readTopicFiles(
  dir: string,
): Promise<{ files: RawFiles; problems: Problem[] }> {
  const files: RawFiles = {};
  const problems: Problem[] = [];
  const entries = await readdir(dir, { withFileTypes: true }).catch(
    (error: unknown) => {
      if (isNotFound(error)) return [];
      throw error;
    },
  );
  const names = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();
  // 파일은 동시에 읽고, 파싱·보고는 이름 순서대로 한다.
  const texts = await Promise.all(
    names.map((name) => readFile(join(dir, name), 'utf8')),
  );
  names.forEach((name, index) => {
    try {
      files[name] = JSON.parse(texts[index]!);
    } catch (error) {
      problems.push({
        file: name,
        message: `JSON 형식이 아니에요: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  });
  return { files, problems };
}

/**
 * dir의 .json 파일을 새 내용으로 통째로 바꾼다(생성물 폴더 전용).
 * 새 파일을 모두 쓴 뒤에만, 새 목록에 없는 예전 .json과 이전 실행이 남긴 .tmp를 지운다
 * (지운 주제의 파일·중단된 실행의 임시 파일이 public/에 남아 배포되지 않게).
 */
export async function replaceJsonFiles({
  dir,
  files,
}: {
  dir: string;
  files: Record<string, unknown>;
}): Promise<void> {
  await writeFilesTogether(
    Object.entries(files).map(([name, value]) => ({
      path: join(dir, name),
      content: `${JSON.stringify(value, null, 2)}\n`,
    })),
  );
  const keep = new Set(Object.keys(files));
  const stale = (await readdir(dir)).filter(
    (name) =>
      name.endsWith('.tmp') || (name.endsWith('.json') && !keep.has(name)),
  );
  await Promise.all(stale.map((name) => rm(join(dir, name), { force: true })));
}

/**
 * 여러 파일을 한꺼번에 쓴다. 모두 임시 파일(.tmp)로 먼저 쓰고, 전부 성공하면 이름을 바꾼다.
 * 임시 파일 단계에서 실패하면 임시 파일을 지우고 대상 파일은 하나도 바꾸지 않는다.
 */
export async function writeFilesTogether(
  files: readonly OutputFile[],
): Promise<void> {
  const written: string[] = [];
  try {
    for (const file of files) {
      const tmpPath = `${file.path}.tmp`;
      await mkdir(dirname(file.path), { recursive: true });
      await writeFile(tmpPath, file.content);
      written.push(tmpPath);
    }
  } catch (error) {
    await Promise.all(written.map((tmpPath) => rm(tmpPath, { force: true })));
    throw error;
  }
  // 이름 바꾸기 도중 실패하면 아직 남은 임시 파일을 지운다(이미 바뀐 파일은 다시 실행하면 같은 결과로 덮인다).
  for (const [index, file] of files.entries()) {
    try {
      await rename(`${file.path}.tmp`, file.path);
    } catch (error) {
      await Promise.all(
        files
          .slice(index)
          .map((rest) => rm(`${rest.path}.tmp`, { force: true })),
      );
      throw error;
    }
  }
}

// Node 파일 시스템의 "파일 없음" 에러인지 확인한다.
function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
