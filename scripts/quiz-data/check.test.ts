// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { QuizTopic } from '../../src/types/quiz.ts';
import {
  TOPICS_CONFIG_FILE,
  validateQuizData,
  checkTopicConfig,
  checkTopicItems,
  checkTopics,
  describeProblems,
} from './check.ts';

// 문장 힌트 3단계, 카테고리 없음(넌센스와 같은 모양).
const TEXT_TOPIC: QuizTopic = {
  id: 'nonsense',
  label: '넌센스',
  play: ['typing'],
  hints: [
    { type: 'text', paid: false },
    { type: 'text', paid: true },
    { type: 'text', paid: true },
  ],
  round: { byCategory: false, stageSize: 10 },
  titles: undefined,
};

// 카테고리 단위 주제(가상): 문장 힌트 1단계, 카테고리당 2문제. 카테고리 검사 로직 확인용.
const MBTI_TOPIC: QuizTopic = {
  id: 'nonsense',
  label: '카테고리형',
  play: ['typing'],
  hints: [
    { type: 'revealLetter', paid: false },
    { type: 'text', paid: true },
  ],
  round: { byCategory: true, size: 2 },
  titles: undefined,
};

function messages(problems: ReturnType<typeof checkTopicItems>): string[] {
  return describeProblems(problems);
}

// MBTI 한 카테고리: 16유형이 한 번씩.
const MBTI_TYPES = [
  'ISTJ',
  'ISFJ',
  'INFJ',
  'INTJ',
  'ISTP',
  'ISFP',
  'INFP',
  'INTP',
  'ESTP',
  'ESFP',
  'ENFP',
  'ENTP',
  'ESTJ',
  'ESFJ',
  'ENFJ',
  'ENTJ',
];

// 실제 QUIZ_TOPICS로 통과하는 최소 파일: 넌센스 2문제, MBTI 한 카테고리.
function validFiles(): Record<string, unknown> {
  return {
    'mbti.json': MBTI_TYPES.map((answer, i) => ({
      id: String(i + 1),
      question: `상황 ${i + 1}`,
      answer,
      category: '일상',
    })),
    'nonsense.json': [
      {
        id: '1',
        question: '놀부가 좋아하는 술은?',
        answer: '심술',
        hints: ['마음씨예요', '술 종류처럼 ○술'],
      },
      { id: '2', question: '진짜 새는?', answer: '참새' },
    ],
  };
}

describe('MBTI 4축 고르기 정답', () => {
  it('정답은 MBTI 유형 4글자여야 한다', () => {
    const topic: QuizTopic = {
      ...MBTI_TOPIC,
      id: 'mbti',
      play: ['mbtiAxes'],
      hints: [],
    };
    const value = [
      { id: '1', question: '상황', answer: 'ISTJ', category: '일상' },
      { id: '2', question: '상황', answer: 'ABCD', category: '일상' },
    ];
    expect(messages(checkTopicItems({ topic, value }))).toEqual([
      'mbti.json id 2: answer는 MBTI 유형 4글자(예: ISTJ)여야 해요 (지금: "ABCD")',
    ]);
  });
});

describe('checkTopicConfig', () => {
  it('정상 설정은 위반이 없다', () => {
    expect(checkTopicConfig(TEXT_TOPIC)).toEqual([]);
    expect(checkTopicConfig(MBTI_TOPIC)).toEqual([]);
  });

  it('풀이 방식 없음·중복, 힌트 4단계, 둘째 단계 무료, 잘못된 size·id를 잡는다', () => {
    const bad: QuizTopic = {
      ...TEXT_TOPIC,
      id: 'Bad Topic' as QuizTopic['id'],
      play: [],
      hints: [
        { type: 'text', paid: false },
        { type: 'text', paid: false },
        { type: 'text', paid: true },
        { type: 'revealLetter', paid: true },
      ],
      round: { byCategory: true, size: 0 },
    };
    expect(describeProblems(checkTopicConfig(bad))).toEqual([
      `${TOPICS_CONFIG_FILE}: Bad Topic: 주제 id는 소문자·숫자·-만 쓸 수 있어요`,
      `${TOPICS_CONFIG_FILE}: Bad Topic: 풀이 방식(play)이 하나 이상 있어야 해요`,
      `${TOPICS_CONFIG_FILE}: Bad Topic: 힌트 단계: 기대 3개 이하, 지금 4개`,
      `${TOPICS_CONFIG_FILE}: Bad Topic: 힌트 2단계: 무료(paid: false)는 첫 단계만 될 수 있어요`,
      `${TOPICS_CONFIG_FILE}: Bad Topic: 카테고리당 문제 수(size)는 1 이상 정수여야 해요 (지금: 0)`,
    ]);
    expect(
      describeProblems(
        checkTopicConfig({ ...TEXT_TOPIC, play: ['typing', 'typing'] }),
      ),
    ).toEqual([`${TOPICS_CONFIG_FILE}: nonsense: 풀이 방식(play)이 겹쳐요`]);
  });
});

describe('checkTopicItems: 공통 필드', () => {
  it('정상 문제는 위반이 없다(hints는 생략 가능)', () => {
    expect(
      checkTopicItems({
        topic: TEXT_TOPIC,
        value: validFiles()['nonsense.json'],
      }),
    ).toEqual([]);
  });

  it('배열이 아니거나 문제가 객체가 아니면 위반', () => {
    expect(messages(checkTopicItems({ topic: TEXT_TOPIC, value: {} }))).toEqual(
      ['nonsense.json: 문제 배열이 아니에요'],
    );
    expect(
      messages(checkTopicItems({ topic: TEXT_TOPIC, value: ['x'] })),
    ).toEqual(['nonsense.json: 1번째 문제가 객체가 아니에요']);
  });

  it('id 형식·중복, 빈 질문·정답, 모르는 필드·원본 메타 필드', () => {
    const value = [
      { id: '1', question: '', answer: ' 답', solved_user: 'x', memo: 'x' },
      { id: '1', question: 'q', answer: 'a' },
      { id: '01', question: 'q', answer: 'a' },
    ];
    expect(messages(checkTopicItems({ topic: TEXT_TOPIC, value }))).toEqual([
      'nonsense.json id 1: 원본 메타 필드 "solved_user"가 들어 있어요 (개인정보)',
      'nonsense.json id 1: 모르는 필드 "memo"가 있어요',
      'nonsense.json id 1: question는 앞뒤 공백 없는 비어 있지 않은 문자열이어야 해요',
      'nonsense.json id 1: answer는 앞뒤 공백 없는 비어 있지 않은 문자열이어야 해요',
      'nonsense.json id 1: id가 겹쳐요',
      'nonsense.json: 3번째 문제: id는 0으로 시작하지 않는 숫자 문자열이어야 해요 (지금: "01")',
    ]);
  });
});

describe('checkTopicItems: 문장 힌트', () => {
  it('문장 힌트 개수는 text 단계 수 이하, 빈 힌트 금지', () => {
    const value = [
      { id: '1', question: 'q', answer: '정답', hints: ['a', 'b', 'c', 'd'] },
      { id: '2', question: 'q', answer: '정답', hints: ['a', ''] },
      { id: '3', question: 'q', answer: '정답', hints: 'a' },
    ];
    expect(messages(checkTopicItems({ topic: TEXT_TOPIC, value }))).toEqual([
      'nonsense.json id 1: 문장 힌트: 기대 3개 이하, 지금 4개',
      'nonsense.json id 2: hints는 앞뒤 공백 없는 비어 있지 않은 문자열 배열이어야 해요',
      'nonsense.json id 3: hints는 앞뒤 공백 없는 비어 있지 않은 문자열 배열이어야 해요',
    ]);
  });

  it('문장 힌트를 쓰지 않는 주제에 힌트가 있으면 위반', () => {
    const noText: QuizTopic = {
      ...TEXT_TOPIC,
      hints: [{ type: 'revealLetter', paid: false }],
    };
    expect(
      messages(
        checkTopicItems({
          topic: noText,
          value: [{ id: '1', question: 'q', answer: '정답', hints: ['a'] }],
        }),
      ),
    ).toEqual(['nonsense.json id 1: 문장 힌트: 기대 0개 이하, 지금 1개']);
  });

  it('힌트에 정답(공백·대소문자 무시, 2글자 이상)이 들어 있으면 위반, 1글자 정답은 검사하지 않음', () => {
    const value = [
      {
        id: '1',
        question: 'q',
        answer: '최저 임금',
        hints: ['왕 = 최저임금이에요'],
      },
      { id: '2', question: 'q', answer: 'KFC', hints: ['치킨 브랜드 kfc'] },
      {
        id: '3',
        question: '반지가 두 개면?',
        answer: '지',
        hints: ['반지 두 개'],
      },
    ];
    expect(messages(checkTopicItems({ topic: TEXT_TOPIC, value }))).toEqual([
      'nonsense.json id 1: 문장 힌트에 정답이 들어 있어요: "왕 = 최저임금이에요"',
      'nonsense.json id 2: 문장 힌트에 정답이 들어 있어요: "치킨 브랜드 kfc"',
    ]);
  });
});

describe('checkTopicItems: 풀이 방식별 정답과 카테고리', () => {
  it('카테고리 단위: 카테고리 필수, 카테고리당 문제 수, 정답 중복', () => {
    const value = [
      { id: '1', question: 'q', answer: 'ISTJ', category: '연애' },
      { id: '2', question: 'q', answer: 'ISTJ', category: '연애' },
      { id: '3', question: 'q', answer: 'ENFP', category: '일상' },
      { id: '4', question: 'q', answer: 'ENTP' },
    ];
    expect(messages(checkTopicItems({ topic: MBTI_TOPIC, value }))).toEqual([
      'nonsense.json id 4: category가 있어야 해요(앞뒤 공백 없는 비어 있지 않은 문자열)',
      'nonsense.json: 카테고리 "연애": 정답이 겹쳐요 (id 1, 2)',
      'nonsense.json: 카테고리 "일상": 문제 수 기대 2, 지금 1',
    ]);
  });

  it('카테고리 단위가 아닌 주제에 category가 있으면 위반', () => {
    expect(
      messages(
        checkTopicItems({
          topic: TEXT_TOPIC,
          value: [{ id: '1', question: 'q', answer: '답', category: '일상' }],
        }),
      ),
    ).toEqual([
      'nonsense.json id 1: 이 주제는 카테고리 단위가 아니라 category를 넣지 않아요',
    ]);
  });
});

describe('checkTopics / validateQuizData (실제 QUIZ_TOPICS)', () => {
  it('정상 파일은 위반이 없다', () => {
    expect(checkTopics({ files: validFiles() })).toEqual([]);
    expect(() => validateQuizData({ files: validFiles() })).not.toThrow();
  });

  it('등록된 주제의 파일이 없거나, 등록되지 않은 파일이 있으면 위반', () => {
    const files = validFiles();
    delete files['nonsense.json'];
    files['movie.json'] = [];

    expect(describeProblems(checkTopics({ files }))).toEqual([
      'nonsense.json: 주제 파일이 없어요 (data/nonsense.json)',
      `movie.json: 등록되지 않은 주제 파일이에요 (${TOPICS_CONFIG_FILE}의 QUIZ_TOPICS에 추가하세요)`,
    ]);
  });

  it('어느 문자열이든 Slack ID 형태를 찾고, 위반이 있으면 quiz_data_invalid로 실패한다', () => {
    const files = validFiles();
    (files['nonsense.json'] as Record<string, unknown>[])[1]!.answer =
      'U05MZ542F43';

    expect(describeProblems(checkTopics({ files }))).toEqual([
      'nonsense.json id 2: Slack ID 형태의 값이 들어 있어요 (개인정보)',
    ]);
    expect(() => validateQuizData({ files })).toThrowError(
      expect.objectContaining({
        code: 'quiz_data_invalid',
        details: [
          'nonsense.json id 2: Slack ID 형태의 값이 들어 있어요 (개인정보)',
        ],
      }),
    );
  });
});

describe('코드 리뷰 반영', () => {
  it('카테고리 주제에 문제가 하나도 없으면 위반(빈 MBTI가 통과하지 않음)', () => {
    expect(messages(checkTopicItems({ topic: MBTI_TOPIC, value: [] }))).toEqual(
      [
        'nonsense.json: 카테고리 단위 주제인데 카테고리가 하나도 없어요(문제가 없거나 category가 빠짐)',
      ],
    );
  });

  it('id·정답이 잘못된 문제도 카테고리 문제 수에 센다(엉뚱한 "문제 수" 오류 없음)', () => {
    const value = [
      { id: '01', question: 'q', answer: 'ISTJ', category: 'A' },
      { id: '2', question: 'q', answer: '', category: 'A' },
    ];
    expect(messages(checkTopicItems({ topic: MBTI_TOPIC, value }))).toEqual([
      'nonsense.json: 1번째 문제: id는 0으로 시작하지 않는 숫자 문자열이어야 해요 (지금: "01")',
      'nonsense.json id 2: answer는 앞뒤 공백 없는 비어 있지 않은 문자열이어야 해요',
    ]);
  });

  it('주제 설정에 같은 id가 두 번 있으면 위반', () => {
    const { 'mbti.json': _mbti, ...files } = validFiles();
    const nonsense = { ...TEXT_TOPIC };
    expect(
      describeProblems(
        checkTopics({
          files,
          topics: [nonsense, { ...nonsense, label: '복사본' }],
        }),
      ),
    ).toEqual([
      `${TOPICS_CONFIG_FILE}: nonsense: 주제 id가 겹쳐요(QUIZ_TOPICS에 두 번 있음)`,
    ]);
  });

  it('Slack ID: U0·U1·W 형태를 모두 잡고, 숫자 없는 영단어는 잡지 않는다', () => {
    const files = validFiles();
    const items = files['nonsense.json'] as Record<string, unknown>[];
    items[0]!.answer = 'U1ABCDEF23';
    items[1]!.answer = 'W012ABCDEF';
    items.push({
      id: '3',
      question: 'WORLDWIDE UNDERSTANDING',
      answer: 'UNIVERSITY',
    });

    expect(describeProblems(checkTopics({ files }))).toEqual([
      'nonsense.json id 1: Slack ID 형태의 값이 들어 있어요 (개인정보)',
      'nonsense.json id 2: Slack ID 형태의 값이 들어 있어요 (개인정보)',
    ]);
  });

  it('깨진 JSON(readProblems)은 "파일 없음"으로 다시 보고하지 않고, 다른 위반과 함께 실패한다', () => {
    const files = validFiles();
    delete files['nonsense.json'];
    files['movie.json'] = [];
    const readProblems = [
      { file: 'nonsense.json', message: 'JSON 형식이 아니에요: …' },
    ];

    expect(() => validateQuizData({ files, readProblems })).toThrowError(
      expect.objectContaining({
        code: 'quiz_data_invalid',
        details: [
          'nonsense.json: JSON 형식이 아니에요: …',
          `movie.json: 등록되지 않은 주제 파일이에요 (${TOPICS_CONFIG_FILE}의 QUIZ_TOPICS에 추가하세요)`,
        ],
      }),
    );
  });
});

describe('checkTopicConfig: 스테이지 크기', () => {
  it('카테고리 단위가 아닌 주제의 stageSize는 1 이상 정수여야 한다', () => {
    expect(
      describeProblems(
        checkTopicConfig({
          ...TEXT_TOPIC,
          round: { byCategory: false, stageSize: 0 },
        }),
      ),
    ).toEqual([
      `${TOPICS_CONFIG_FILE}: nonsense: 스테이지당 문제 수(stageSize)는 1 이상 정수여야 해요 (지금: 0)`,
    ]);
  });
});
