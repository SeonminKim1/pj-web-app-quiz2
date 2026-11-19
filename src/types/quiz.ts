// 퀴즈 주제 설정과 데이터 JSON의 타입. 앱과 개발용 스크립트(scripts/quiz-data/)가 함께 쓴다.
// 형식은 README.md "문제 데이터"에 있다.

/** 주제 id = 데이터 파일 이름(data/<id>.json). 목록은 src/lib/quizTopics.ts의 QUIZ_TOPICS. */
export type QuizTopicId = 'nonsense';

/** 풀이 방식 부품: 주관식(글자 수를 보고 직접 입력). */
export type PlayMode = 'typing';

/** 힌트 종류: 데이터에 쓴 문장 / 정답에서 앱이 한 글자를 공개. */
export type HintType = 'text' | 'revealLetter';

/** 힌트 한 단계. paid가 false면 무료(첫 단계만 가능), true면 골드. */
type HintStep = {
  type: HintType;
  paid: boolean;
};

/**
 * 한 판 단위. 카테고리 단위면 카테고리 하나의 문제 size개가 한 판,
 * 아니면 문제 id 순서로 stageSize개씩 나눈 고정 스테이지가 한 판이다.
 */
type QuizRound =
  { byCategory: false; stageSize: number } | { byCategory: true; size: number };

/** 주제 설정 한 덩어리. 풀이·힌트 방식은 공유 부품 중에서 고른다. */
export type QuizTopic = {
  id: QuizTopicId;
  /** 화면에 보일 주제 이름. */
  label: string;
  /** 쓸 풀이 방식(1개 이상). 앞의 것이 기본 방식. */
  play: readonly PlayMode[];
  /** 힌트 단계(0~3개). 앞에서부터 하나씩 연다. */
  hints: readonly HintStep[];
  round: QuizRound;
};

/** 문제 하나. 이 필드들 외에는 넣지 않는다(원본 메타 필드 유출 방지). */
export type QuizItem = {
  /** 숫자 문자열. 주제마다 독립적으로 매기고 주제 안에서 유일하다. */
  id: string;
  question: string;
  /** 공백은 어절 구분(글자 수 표시)으로만 쓰고 채점에서는 무시한다. */
  answer: string;
  /** 문장 힌트. 그 주제의 text 단계 수 이하. 없으면 생략할 수 있다. */
  hints?: string[];
  /** 카테고리. 카테고리 단위 주제는 필수, 아닌 주제는 넣지 않는다. */
  category?: string;
  /** 공유 링크·OG 카드를 만들지. 데이터에서는 생략 가능(없으면 false), 생성 파일에는 항상 채운다. */
  shareable?: boolean;
  /** OG 카드에 문제 문구 대신 쓸 짧은 문구(글자 배치 검사를 못 넘는 문제용). */
  ogText?: string;
  /** 카드 문구에 정답이 들어가도 의도된 경우 true(정답 노출 검사 건너뜀). */
  allowAnswerInCard?: boolean;
};

/** 생성 주제 파일(public/data/quiz/<주제 id>.json). */
export type QuizTopicFile = {
  version: number;
  topic: QuizTopicId;
  /** 기준 데이터(data/<주제 id>.json) 순서 그대로. */
  items: QuizItem[];
};

/** manifest의 카테고리 요약(카테고리 단위 주제만). */
export type QuizCategoryInfo = {
  name: string;
  count: number;
};

/** manifest의 주제 요약 한 줄. 모두 주제 파일에서 계산되는 값이다. */
type QuizTopicInfo = {
  id: QuizTopicId;
  label: string;
  /** 문제 수. */
  count: number;
  /** 생성 주제 파일 이름(예: "nonsense.json"). */
  file: string;
  /** 게임 화면에 보여 줄지. */
  playable: boolean;
  /** 카테고리 단위 주제만. 주제 파일에 처음 나온 순서. */
  categories?: QuizCategoryInfo[];
};

/** public/data/quiz/manifest.json. 앱은 이 파일을 먼저 읽는다. 풀이·힌트 설정은 넣지 않는다. */
export type QuizManifest = {
  version: number;
  /** QUIZ_TOPICS 순서. */
  topics: QuizTopicInfo[];
};
