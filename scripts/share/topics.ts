// 공유 링크가 있는 주제마다 빌드가 쓰는 파일과 주소(src/lib/quizTopics.ts의 share 설정에서 만든다).
import { SHARE_TOPICS, type ShareTopic } from '../../src/lib/quizTopics.ts';
import { REGISTRY_FILE } from './registry.ts';

export type ShareSetup = {
  topic: ShareTopic;
  /** 주소 앞부분(/<prefix>/<id>/). */
  prefix: string;
  card: ShareTopic['share']['card'];
  /** 문제 데이터(data/<주제 id>.json). */
  dataFile: string;
  /** 공개 id 등록부. 넌센스는 처음 만든 이름 그대로, 다른 주제는 data/share/<주제 id>-published-ids.json. */
  registryFile: string;
};

function shareSetup(topic: ShareTopic): ShareSetup {
  return {
    topic,
    prefix: topic.share.prefix,
    card: topic.share.card,
    dataFile: `data/${topic.id}.json`,
    registryFile:
      topic.id === 'nonsense'
        ? REGISTRY_FILE
        : `data/share/${topic.id}-published-ids.json`,
  };
}

export const SHARE_SETUPS: readonly ShareSetup[] = SHARE_TOPICS.map(shareSetup);
