// @vitest-environment node
// 저장소의 실제 문제 데이터(data/*.json)와 공유 등록부가 검사를 통과하는지(npm run build:data와 같은 규칙).
import { describe, expect, it } from 'vitest';
import type { QuizItem } from '../../src/types/quiz.ts';
import { readRegistry } from '../share/io.ts';
import { checkShareData } from '../share/registry.ts';
import { SHARE_SETUPS } from '../share/topics.ts';
import { checkTopics } from './check.ts';
import { readTopicFiles } from './io.ts';

describe('실제 데이터(data/)', () => {
  it('모든 주제 파일이 위반 없이 읽힌다', async () => {
    const { files, problems } = await readTopicFiles('data');
    expect(problems).toEqual([]);
    expect(checkTopics({ files })).toEqual([]);
  });

  it.each(SHARE_SETUPS.map((setup) => [setup.topic.id, setup] as const))(
    '%s: 공유 대상은 모두 등록부에 있고 공유 카드 검사를 통과한다',
    async (_id, setup) => {
      const { files } = await readTopicFiles('data');
      const { entries, problems } = await readRegistry(setup.registryFile);
      expect(problems).toEqual([]);
      expect(
        checkShareData({
          items: files[`${setup.topic.id}.json`] as QuizItem[],
          registry: entries,
          dataFile: setup.dataFile,
          registryFile: setup.registryFile,
          card: setup.card,
        }),
      ).toEqual([]);
    },
  );
});
