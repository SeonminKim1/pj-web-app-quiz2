// 등록부 파일 입출력. 쓰기는 임시 파일 → 이름 바꾸기(중간에 끊겨도 반쯤 쓴 파일이 남지 않음).
import { execFile } from 'node:child_process';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import {
  REGISTRY_FILE,
  checkRegistryShape,
  type RegistryEntry,
  type ShareProblem,
} from './registry.ts';

const run = promisify(execFile);

export async function readRegistry(file: string = REGISTRY_FILE): Promise<{
  entries: RegistryEntry[];
  problems: ShareProblem[];
}> {
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch {
    return { entries: [], problems: [] }; // 아직 없음 = 빈 등록부
  }
  try {
    return checkRegistryShape(JSON.parse(text) as unknown, file);
  } catch {
    return checkRegistryShape(undefined, file);
  }
}

/** 직전 커밋의 등록부(git이 없거나 커밋이 없으면 undefined → 비교하지 않음). */
export async function readPreviousRegistry(
  file: string = REGISTRY_FILE,
): Promise<RegistryEntry[] | undefined> {
  try {
    const { stdout } = await run('git', ['show', `HEAD:${file}`], {
      encoding: 'utf8',
    });
    const { entries, problems } = checkRegistryShape(
      JSON.parse(stdout) as unknown,
      file,
    );
    return problems.length === 0 ? entries : undefined;
  } catch {
    return undefined;
  }
}

export async function writeRegistry(
  entries: readonly RegistryEntry[],
  file: string = REGISTRY_FILE,
): Promise<void> {
  const tmp = `${file}.tmp`;
  await writeFile(tmp, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
  await rename(tmp, file);
}
