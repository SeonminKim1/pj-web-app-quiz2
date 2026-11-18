// @vitest-environment node
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { readTopicFiles, replaceJsonFiles, writeFilesTogether } from './io.ts';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'quiz-data-io-'));
});

describe('readTopicFiles', () => {
  it('바로 아래 .json만 읽고, 하위 폴더·다른 확장자는 보지 않는다', async () => {
    await writeFile(join(dir, 'nonsense.json'), '[{"id":"1"}]');
    await writeFile(join(dir, 'notes.txt'), 'x');
    await mkdir(join(dir, 'excluded'));
    await writeFile(join(dir, 'excluded', 'nonsense.json'), '[]');

    await expect(readTopicFiles(dir)).resolves.toEqual({
      files: { 'nonsense.json': [{ id: '1' }] },
      problems: [],
    });
  });

  it('JSON이 깨진 파일은 위반으로 모으고 나머지는 계속 읽는다', async () => {
    await writeFile(join(dir, 'a.json'), '[1, ');
    await writeFile(join(dir, 'b.json'), '[]');

    const { files, problems } = await readTopicFiles(dir);
    expect(files).toEqual({ 'b.json': [] });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ file: 'a.json' });
    expect(problems[0]!.message).toMatch(/^JSON 형식이 아니에요/);
  });

  it('폴더가 없으면 빈 결과', async () => {
    await expect(readTopicFiles(join(dir, 'missing'))).resolves.toEqual({
      files: {},
      problems: [],
    });
  });
});

describe('replaceJsonFiles', () => {
  it('폴더를 만들며 쓰고, 새 목록에 없는 예전 .json은 지운다(다른 파일은 둔다)', async () => {
    const out = join(dir, 'quiz');
    await mkdir(out);
    await writeFile(join(out, 'old-topic.json'), '[]');
    await writeFile(join(out, 'keep.txt'), 'x');

    await replaceJsonFiles({
      dir: out,
      files: { 'manifest.json': { version: 1 } },
    });

    expect((await readdir(out)).sort()).toEqual(['keep.txt', 'manifest.json']);
    await expect(readFile(join(out, 'manifest.json'), 'utf8')).resolves.toBe(
      '{\n  "version": 1\n}\n',
    );
  });
});

describe('replaceJsonFiles: 임시 파일 정리', () => {
  it('이전 실행이 남긴 .tmp 파일도 지운다', async () => {
    const out = join(dir, 'quiz');
    await mkdir(out);
    await writeFile(join(out, 'old-topic.json.tmp'), 'half');

    await replaceJsonFiles({ dir: out, files: { 'manifest.json': {} } });

    expect(await readdir(out)).toEqual(['manifest.json']);
  });
});

describe('writeFilesTogether', () => {
  it('폴더를 만들며 여러 파일을 쓰고 임시 파일을 남기지 않는다', async () => {
    await writeFilesTogether([
      { path: join(dir, 'out/a.json'), content: 'A' },
      { path: join(dir, 'out/sub/b.json'), content: 'B' },
    ]);

    await expect(readFile(join(dir, 'out/a.json'), 'utf8')).resolves.toBe('A');
    expect(await readdir(join(dir, 'out'))).toEqual(['a.json', 'sub']);
  });

  it('중간에 실패하면 대상 파일을 하나도 바꾸지 않는다', async () => {
    const first = join(dir, 'first.json');
    await writeFile(first, 'OLD');
    // 두 번째 파일의 상위 "폴더"가 실제로는 파일이라 쓰기가 실패한다.
    await writeFile(join(dir, 'blocker'), 'x');

    await expect(
      writeFilesTogether([
        { path: first, content: 'NEW' },
        { path: join(dir, 'blocker/second.json'), content: 'NEW' },
      ]),
    ).rejects.toThrow();

    await expect(readFile(first, 'utf8')).resolves.toBe('OLD');
    expect((await readdir(dir)).sort()).toEqual(['blocker', 'first.json']);
  });
});
