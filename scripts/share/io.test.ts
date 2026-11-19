// @vitest-environment node
// 등록부 파일 입출력: 쓰다 실패하면 임시 파일을 남기지 않고, 축소 검사는 지난 배포 커밋(CACHED_COMMIT_REF)과 비교한다.
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readPreviousRegistry, writeRegistry } from './io.ts';

const entry = (id: string) => ({
  id,
  answerKey: '0123456789abcdef',
  firstPublished: '2026-11-19',
});

let dir: string;
const cwd = process.cwd();
afterEach(() => {
  process.chdir(cwd);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

describe('writeRegistry', () => {
  // Value: protects=쓰기가 실패해도 등록부 옆에 반쯤 쓴 .tmp가 남지 않는다; fails_when=실패 처리(rm)가 빠지면; why_new=io.ts에 테스트가 없었음; seam=none; no_claim=디스크가 가득 찬 경우
  it('이름 바꾸기가 실패하면 .tmp를 지우고 에러를 그대로 던진다', async () => {
    dir = mkdtempSync(join(tmpdir(), 'registry-io-'));
    const file = join(dir, 'published-ids.json');
    // 같은 이름의 비어 있지 않은 폴더가 있으면 rename이 실패한다.
    mkdirSync(file);
    writeFileSync(join(file, 'keep'), 'x');
    await expect(writeRegistry([entry('1')], file)).rejects.toThrow();
    expect(existsSync(`${file}.tmp`)).toBe(false);
  });
});

describe('readPreviousRegistry', () => {
  // Value: protects=Netlify에서는 지난 배포 커밋과 비교하고, 그 커밋이 없으면 알리고 HEAD로 비교한다; fails_when=ref를 HEAD로 고정하거나 실패를 조용히 넘기면; why_new=io.ts에 테스트가 없었음; seam=none(임시 git 저장소); no_claim=Netlify가 실제로 CACHED_COMMIT_REF를 주는지
  it('CACHED_COMMIT_REF가 있으면 그 커밋, 없으면 HEAD, 읽을 수 없으면 경고 후 HEAD', async () => {
    dir = mkdtempSync(join(tmpdir(), 'registry-git-'));
    const git = (...args: string[]) =>
      execFileSync(
        'git',
        [
          '-C',
          dir,
          '-c',
          'user.name=t',
          '-c',
          'user.email=t@example.test',
          ...args,
        ],
        { encoding: 'utf8' },
      ).trim();
    git('init', '-q');
    const file = 'ids.json';
    writeFileSync(join(dir, file), JSON.stringify([entry('1'), entry('2')]));
    git('add', file);
    git('commit', '-qm', 'two');
    const first = git('rev-parse', 'HEAD');
    writeFileSync(join(dir, file), JSON.stringify([entry('1')]));
    git('commit', '-qam', 'one');
    process.chdir(dir);

    expect(await readPreviousRegistry(file)).toHaveLength(1);
    vi.stubEnv('CACHED_COMMIT_REF', first);
    expect(await readPreviousRegistry(file)).toHaveLength(2);

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('CACHED_COMMIT_REF', 'f'.repeat(40));
    expect(await readPreviousRegistry(file)).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('HEAD 기준'));
  });
});
