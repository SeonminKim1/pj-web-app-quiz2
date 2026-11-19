// @vitest-environment node
// 저장소의 실제 문제 데이터(data/*.json)가 검사를 통과하는지(npm run quiz-data:check와 같은 규칙).
import { describe, expect, it } from 'vitest';
import { checkTopics } from './check.ts';
import { readTopicFiles } from './io.ts';

describe('실제 데이터(data/)', () => {
  it('모든 주제 파일이 위반 없이 읽힌다', async () => {
    const { files, problems } = await readTopicFiles('data');
    expect(problems).toEqual([]);
    expect(checkTopics({ files })).toEqual([]);
  });
});
