// 등록부 파일 입출력. 쓰기는 임시 파일 → 이름 바꾸기(중간에 끊겨도 반쯤 쓴 파일이 남지 않음).
import { execFile } from 'node:child_process';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
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

/**
 * 비교 기준 커밋의 등록부(git이 없거나 그 커밋에 파일이 없으면 undefined → 비교하지 않음).
 * Netlify 빌드에서는 HEAD가 지금 배포할 커밋 자신이라 줄어든 것을 못 잡으므로,
 * 지난번 배포 커밋(CACHED_COMMIT_REF)과 비교한다. 로컬에서는 HEAD(직전 커밋).
 */
export async function readPreviousRegistry(
  file: string = REGISTRY_FILE,
  ref: string = process.env.CACHED_COMMIT_REF || 'HEAD',
): Promise<RegistryEntry[] | undefined> {
  try {
    const { stdout } = await run('git', ['show', `${ref}:${file}`], {
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
  try {
    await writeFile(tmp, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
    await rename(tmp, file);
  } catch (error) {
    // 반쯤 쓴 임시 파일이 남아 등록부 옆에 커밋되지 않게 지운다.
    await rm(tmp, { force: true });
    throw error;
  }
}
