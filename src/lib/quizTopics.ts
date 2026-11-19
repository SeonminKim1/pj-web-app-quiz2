import type { PlayMode, QuizTopic, QuizTopicId } from '../types/quiz.ts';

/** 퀴즈 데이터 JSON 형식 버전. 필드 의미가 바뀌면 올리고, 앱은 다른 버전이면 에러 화면을 보여 준다. */
export const QUIZ_DATA_VERSION = 1;

/** 카테고리 단위가 아닌 주제는 이 수 이상 문제가 있어야 플레이할 수 있다(한 판 규칙은 게임 기능에서 확정). */
export const PLAYABLE_MIN_COUNT = 30;

/**
 * 주제 설정 목록. 이 순서로 manifest에 나열한다.
 * 주제를 추가할 때 data/<id>.json과 여기 한 덩어리를 함께 추가한다(CLAUDE.md "주제별 설정 + 공유 부품").
 */
export const QUIZ_TOPICS: readonly QuizTopic[] = [
  {
    id: 'nonsense',
    label: '넌센스',
    play: ['typing'],
    hints: [
      { type: 'text', paid: false },
      { type: 'revealLetter', paid: true },
      { type: 'text', paid: true },
    ],
    round: { byCategory: false, stageSize: 10 },
  },
];

const TOPIC_IDS: ReadonlySet<string> = new Set(
  QUIZ_TOPICS.map((topic) => topic.id),
);

/** 값이 등록된 주제 id인지 확인한다. */
export function isQuizTopicId(value: unknown): value is QuizTopicId {
  return typeof value === 'string' && TOPIC_IDS.has(value);
}

/** 주제 id로 설정을 찾는다. 목록에 없는 id는 타입상 들어올 수 없다. */
export function getQuizTopic(id: QuizTopicId): QuizTopic {
  const found = QUIZ_TOPICS.find((topic) => topic.id === id);
  if (!found) {
    // QuizTopicId와 QUIZ_TOPICS가 어긋났을 때만 온다(테스트로 막는다).
    throw new Error(`알 수 없는 주제 id: ${id}`);
  }
  return found;
}

/** 데이터·생성 파일 이름(<주제 id>.json). */
export function getQuizTopicFileName(id: QuizTopicId): string {
  return `${id}.json`;
}

/** 지금 구현된 풀이 방식 부품. 부품을 만들면 여기에 추가한다. */
const IMPLEMENTED_PLAY_MODES: ReadonlySet<PlayMode> = new Set(['typing']);

/** 화면에서 들어갈 수 있는 주제인지: 기본 풀이 방식(play[0])이 구현된 부품이어야 한다. */
export function isEnterableTopic(topic: QuizTopic): boolean {
  const main = topic.play[0];
  return main !== undefined && IMPLEMENTED_PLAY_MODES.has(main);
}

/** 주소의 주제 id가 들어갈 수 있는 주제인지(스테이지형·카테고리 단위 모두). */
export function isEnterableTopicId(id: string | undefined): boolean {
  return (
    findStageTopic(id) !== undefined || findCategoryTopic(id) !== undefined
  );
}

/** 고정 스테이지로 나뉘는 주제(카테고리 단위가 아님). */
export type StageTopic = QuizTopic & {
  round: { byCategory: false; stageSize: number };
};

/**
 * 주소의 주제 id로 화면에서 들어갈 수 있는 스테이지형 주제를 찾는다.
 * 등록되지 않았거나, 기본 풀이 방식이 아직 없거나, 카테고리 단위 주제면 undefined.
 */
export function findStageTopic(id: string | undefined): StageTopic | undefined {
  if (!isQuizTopicId(id)) return undefined;
  const topic = getQuizTopic(id);
  if (!isEnterableTopic(topic) || topic.round.byCategory) return undefined;
  return topic as StageTopic;
}

/** 그 주제의 문장 힌트(text) 단계 수 = 문제마다 쓸 수 있는 hints 최대 개수. */
export function textHintCount(topic: QuizTopic): number {
  return topic.hints.filter((step) => step.type === 'text').length;
}

/** 카테고리로 나뉘는 주제(카테고리 하나의 문제 size개가 한 판). */
export type CategoryTopic = QuizTopic & {
  round: { byCategory: true; size: number };
};

/**
 * 주소의 주제 id로 화면에서 들어갈 수 있는 카테고리 단위 주제를 찾는다(findStageTopic과 짝).
 * 등록되지 않았거나, 기본 풀이 방식이 아직 없거나, 스테이지형 주제면 undefined.
 */
export function findCategoryTopic(
  id: string | undefined,
): CategoryTopic | undefined {
  if (!isQuizTopicId(id)) return undefined;
  const topic = getQuizTopic(id);
  if (!isEnterableTopic(topic) || !topic.round.byCategory) return undefined;
  return topic as CategoryTopic;
}
