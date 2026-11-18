// 퀴즈 데이터 검사(spec "비즈니스 규칙"). 주제 설정을 입력으로 받아 규칙을 고른다(주제 id로 분기하지 않음).
// 입력은 파싱만 한 값(unknown)이고, 위반을 모두 모아 돌려준다(첫 위반에서 멈추지 않음).
import {
  QUIZ_TOPICS,
  getQuizTopicFileName,
  textHintCount,
} from '../../src/lib/quizTopics.ts';
import { isRecord } from '../../src/lib/records.ts';
import type { QuizTopic } from '../../src/types/quiz.ts';
import { QuizDataError } from './errors.ts';

/** 위반 하나: 파일(또는 설정), 문제 id(있으면), 내용. */
export type Problem = {
  file: string;
  id?: string;
  message: string;
};

/** 주제 파일 이름 → 파싱한 값. data/ 바로 아래에 있는 .json만 담는다. */
export type RawFiles = Record<string, unknown>;

/** 카테고리 한 판 검사용: 문제 표시(id 또는 "N번째")와 정답(잘못됐으면 없음). */
type CategoryMember = {
  label: string;
  answer: string | undefined;
};

/** 주제 설정 위반을 보고할 때 쓰는 파일 이름. */
export const TOPICS_CONFIG_FILE = 'src/lib/quizTopics.ts';

/** 원본 메타 필드. 문제에 들어가면 개인정보 위반으로 따로 표시한다. */
export const SOURCE_META_FIELDS = [
  'status',
  'created_at',
  'submit_at',
  'solved_user',
  'create_user',
];

const ITEM_KEYS = [
  'id',
  'question',
  'answer',
  'hints',
  'category',
  // 공유 카드(설계 문서 "문제 데이터"): 없으면 공유하지 않음.
  'shareable',
  'ogText',
  'allowAnswerInCard',
];
const MAX_HINT_STEPS = 3;
const TOPIC_ID_PATTERN = /^[a-z0-9-]+$/;
const ID_PATTERN = /^[1-9][0-9]*$/;
/** Slack 사용자 ID 형태(예: U05MZ542F43, U1ABCDEF23, W012ABCDEF). 숫자가 하나 이상 있어야 해서 영단어(WORLDWIDE)는 걸리지 않는다. */
const SLACK_ID_PATTERN = /\b[UW](?=[0-9A-Z]*[0-9])[0-9A-Z]{8,}\b/;

/** 주제 설정 자체를 검사한다. */
export function checkTopicConfig(topic: QuizTopic): Problem[] {
  const problems: Problem[] = [];
  const add = (message: string): void => {
    problems.push({
      file: TOPICS_CONFIG_FILE,
      message: `${topic.id}: ${message}`,
    });
  };
  if (!TOPIC_ID_PATTERN.test(topic.id)) {
    add('주제 id는 소문자·숫자·-만 쓸 수 있어요');
  }
  if (topic.play.length === 0) add('풀이 방식(play)이 하나 이상 있어야 해요');
  if (new Set(topic.play).size !== topic.play.length) {
    add('풀이 방식(play)이 겹쳐요');
  }
  if (topic.hints.length > MAX_HINT_STEPS) {
    add(
      `힌트 단계: 기대 ${MAX_HINT_STEPS}개 이하, 지금 ${topic.hints.length}개`,
    );
  }
  topic.hints.forEach((step, index) => {
    if (index > 0 && !step.paid) {
      add(`힌트 ${index + 1}단계: 무료(paid: false)는 첫 단계만 될 수 있어요`);
    }
  });
  if (topic.round.byCategory) {
    if (!isPositiveInteger(topic.round.size)) {
      add(
        `카테고리당 문제 수(size)는 1 이상 정수여야 해요 (지금: ${topic.round.size})`,
      );
    }
  } else if (!isPositiveInteger(topic.round.stageSize)) {
    add(
      `스테이지당 문제 수(stageSize)는 1 이상 정수여야 해요 (지금: ${topic.round.stageSize})`,
    );
  }
  return problems;
}

/** 주제 파일 하나를 주제 설정에 맞춰 검사한다. */
export function checkTopicItems({
  topic,
  value,
}: {
  topic: QuizTopic;
  value: unknown;
}): Problem[] {
  const file = getQuizTopicFileName(topic.id);
  const problems: Problem[] = [];
  const add = (message: string, id?: string): void => {
    problems.push({ file, id, message });
  };
  if (!Array.isArray(value)) {
    add('문제 배열이 아니에요');
    return problems;
  }

  const seenIds = new Set<string>();
  const byCategory = new Map<string, CategoryMember[]>();
  value.forEach((item: unknown, index) => {
    if (!isRecord(item)) {
      add(`${index + 1}번째 문제가 객체가 아니에요`);
      return;
    }
    const id =
      typeof item.id === 'string' && ID_PATTERN.test(item.id)
        ? item.id
        : undefined;
    const addItem = (message: string): void => add(message, id);
    if (!id) {
      addItem(
        `${index + 1}번째 문제: id는 0으로 시작하지 않는 숫자 문자열이어야 해요 (지금: ${show(item.id)})`,
      );
    } else if (seenIds.has(id)) {
      addItem('id가 겹쳐요');
    } else {
      seenIds.add(id);
    }
    checkKeys({ value: item, add: addItem });
    for (const flag of ['shareable', 'allowAnswerInCard'] as const) {
      if (item[flag] !== undefined && typeof item[flag] !== 'boolean') {
        addItem(`${flag}는 true/false여야 해요 (지금: ${show(item[flag])})`);
      }
    }
    if (item.ogText !== undefined && !isFilledText(item.ogText)) {
      addItem('ogText는 앞뒤 공백 없는 비어 있지 않은 문자열이어야 해요');
    }
    for (const field of ['question', 'answer'] as const) {
      if (!isFilledText(item[field])) {
        addItem(`${field}는 앞뒤 공백 없는 비어 있지 않은 문자열이어야 해요`);
      }
    }
    const answer = isFilledText(item.answer) ? item.answer : undefined;
    if (answer) checkAnswerForPlay({ topic, answer, add: addItem });
    checkHints({ topic, hints: item.hints, answer, add: addItem });
    const category = checkCategoryField({ topic, item, add: addItem });
    if (category !== undefined) {
      // id·정답이 잘못된 문제도 카테고리 문제 수에는 센다(엉뚱한 "문제 수 부족" 오류 방지).
      const members = byCategory.get(category) ?? [];
      members.push({ label: id ?? `${index + 1}번째`, answer });
      byCategory.set(category, members);
    }
  });

  if (topic.round.byCategory) {
    if (byCategory.size === 0) {
      add(
        '카테고리 단위 주제인데 카테고리가 하나도 없어요(문제가 없거나 category가 빠짐)',
      );
    }
    problems.push(
      ...checkCategoryRounds({ file, size: topic.round.size, byCategory }),
    );
  }
  return problems;
}

/**
 * 주제 설정과 파일 일치, 설정 검사, 주제별 데이터 검사, 유출 검사를 모은다.
 * unreadable: JSON이 깨져 읽지 못한 파일 이름. 이미 위반으로 보고됐으므로 "파일 없음"으로 다시 보고하지 않는다.
 */
export function checkTopics({
  files,
  unreadable = [],
  topics = QUIZ_TOPICS,
}: {
  files: RawFiles;
  unreadable?: readonly string[];
  topics?: readonly QuizTopic[];
}): Problem[] {
  const problems: Problem[] = [];
  const registered = new Set<string>();
  const skip = new Set(unreadable);
  for (const topic of topics) {
    problems.push(...checkTopicConfig(topic));
    const file = getQuizTopicFileName(topic.id);
    if (registered.has(file)) {
      problems.push({
        file: TOPICS_CONFIG_FILE,
        message: `${topic.id}: 주제 id가 겹쳐요(QUIZ_TOPICS에 두 번 있음)`,
      });
      continue;
    }
    registered.add(file);
    if (skip.has(file)) continue;
    if (!(file in files)) {
      problems.push({ file, message: `주제 파일이 없어요 (data/${file})` });
      continue;
    }
    problems.push(...checkTopicItems({ topic, value: files[file] }));
  }
  for (const file of [...Object.keys(files), ...unreadable]) {
    if (!registered.has(file)) {
      problems.push({
        file,
        message: `등록되지 않은 주제 파일이에요 (${TOPICS_CONFIG_FILE}의 QUIZ_TOPICS에 추가하세요)`,
      });
    }
  }
  problems.push(...findLeaks(files));
  return problems;
}

/**
 * 검사를 돌려 위반이 있으면 quiz_data_invalid로 실패한다.
 * readProblems: 파일을 읽다 생긴 위반(깨진 JSON). 검사 위반과 함께 한 번에 보고한다.
 */
export function validateQuizData({
  files,
  readProblems = [],
}: {
  files: RawFiles;
  readProblems?: readonly Problem[];
}): void {
  const problems = [
    ...readProblems,
    ...checkTopics({
      files,
      unreadable: readProblems.map((problem) => problem.file),
    }),
  ];
  if (problems.length === 0) return;
  throw new QuizDataError(
    'quiz_data_invalid',
    `퀴즈 데이터에 위반이 ${problems.length}건 있어요`,
    describeProblems(problems),
  );
}

/** 위반 목록을 콘솔용 한 줄씩으로 바꾼다. */
export function describeProblems(problems: readonly Problem[]): string[] {
  return problems.map(
    (problem) =>
      `${problem.file}${problem.id ? ` id ${problem.id}` : ''}: ${problem.message}`,
  );
}

// 풀이 방식별 정답 규칙. 주제가 쓰는 방식마다 검사한다.
function checkAnswerForPlay({
  topic,
  answer,
  add,
}: {
  topic: QuizTopic;
  answer: string;
  add: (message: string) => void;
}): void {
  for (const mode of topic.play) {
    if (mode === 'typing' && withoutSpaces(answer).length === 0) {
      add('answer에 공백 말고 글자가 있어야 해요');
    }
  }
}

// 문장 힌트: 배열, 비어 있지 않은 문자열, 개수는 text 단계 수 이하, 정답(2글자 이상) 포함 금지.
function checkHints({
  topic,
  hints,
  answer,
  add,
}: {
  topic: QuizTopic;
  hints: unknown;
  answer: string | undefined;
  add: (message: string) => void;
}): void {
  if (hints === undefined) return;
  if (!Array.isArray(hints) || !hints.every(isFilledText)) {
    add('hints는 앞뒤 공백 없는 비어 있지 않은 문자열 배열이어야 해요');
    return;
  }
  const max = textHintCount(topic);
  if (hints.length > max) {
    add(`문장 힌트: 기대 ${max}개 이하, 지금 ${hints.length}개`);
  }
  const key = answer ? compareKey(answer) : '';
  if (key.length < 2) return; // 1글자 정답은 질문 글자와 겹치기 쉬워 사람이 확인한다.
  for (const hint of hints) {
    if (compareKey(hint).includes(key))
      add(`문장 힌트에 정답이 들어 있어요: "${hint}"`);
  }
}

// 카테고리 필드: 카테고리 단위 주제는 필수, 아니면 넣지 않는다. 쓸 수 있는 값이면 돌려준다.
function checkCategoryField({
  topic,
  item,
  add,
}: {
  topic: QuizTopic;
  item: Record<string, unknown>;
  add: (message: string) => void;
}): string | undefined {
  const has = 'category' in item;
  if (!topic.round.byCategory) {
    if (has) add('이 주제는 카테고리 단위가 아니라 category를 넣지 않아요');
    return undefined;
  }
  if (!isFilledText(item.category)) {
    add('category가 있어야 해요(앞뒤 공백 없는 비어 있지 않은 문자열)');
    return undefined;
  }
  return item.category;
}

// 카테고리 한 판 단위: 카테고리마다 정확히 size문제, 카테고리 안 정답 중복 금지.
function checkCategoryRounds({
  file,
  size,
  byCategory,
}: {
  file: string;
  size: number;
  byCategory: ReadonlyMap<string, CategoryMember[]>;
}): Problem[] {
  const problems: Problem[] = [];
  for (const [category, members] of byCategory) {
    if (members.length !== size) {
      problems.push({
        file,
        message: `카테고리 "${category}": 문제 수 기대 ${size}, 지금 ${members.length}`,
      });
    }
    const owners = new Map<string, string[]>();
    for (const { label, answer } of members) {
      if (!answer) continue;
      const key = compareKey(answer);
      owners.set(key, [...(owners.get(key) ?? []), label]);
    }
    for (const [, ids] of owners) {
      if (ids.length > 1) {
        problems.push({
          file,
          message: `카테고리 "${category}": 정답이 겹쳐요 (id ${ids.join(', ')})`,
        });
      }
    }
  }
  return problems;
}

// 허용하지 않은 키를 보고한다. 원본 메타 필드면 개인정보로 따로 표시한다.
function checkKeys({
  value,
  add,
}: {
  value: Record<string, unknown>;
  add: (message: string) => void;
}): void {
  for (const key of Object.keys(value)) {
    if (ITEM_KEYS.includes(key)) continue;
    add(
      SOURCE_META_FIELDS.includes(key)
        ? `원본 메타 필드 "${key}"가 들어 있어요 (개인정보)`
        : `모르는 필드 "${key}"가 있어요`,
    );
  }
}

// 모든 주제 파일의 문자열 값에서 Slack ID 형태를 찾는다.
function findLeaks(files: RawFiles): Problem[] {
  const problems: Problem[] = [];
  for (const [file, value] of Object.entries(files)) {
    visitStrings({
      value,
      visit: (text, id) => {
        if (SLACK_ID_PATTERN.test(text)) {
          problems.push({
            file,
            id,
            message: 'Slack ID 형태의 값이 들어 있어요 (개인정보)',
          });
        }
      },
    });
  }
  return problems;
}

// 값 안의 모든 문자열을 돌며, 가장 가까운 문제 id와 함께 넘긴다.
function visitStrings({
  value,
  visit,
  id,
}: {
  value: unknown;
  visit: (text: string, id?: string) => void;
  id?: string;
}): void {
  if (typeof value === 'string') {
    visit(value, id);
  } else if (Array.isArray(value)) {
    for (const element of value) visitStrings({ value: element, visit, id });
  } else if (isRecord(value)) {
    const ownId = typeof value.id === 'string' ? value.id : id;
    for (const element of Object.values(value)) {
      visitStrings({ value: element, visit, id: ownId });
    }
  }
}

// 비교용 키: 공백을 빼고 소문자로.
function compareKey(text: string): string {
  return withoutSpaces(text).toLowerCase();
}

function withoutSpaces(text: string): string {
  return text.replace(/\s/g, '');
}

function isFilledText(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length > 0 && value.trim() === value
  );
}

// 메시지에 넣을 값 표현.
function show(value: unknown): string {
  return value === undefined ? '없음' : JSON.stringify(value);
}

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 1;
}
