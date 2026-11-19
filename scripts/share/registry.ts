// 공개 id 등록부(주제마다 하나, scripts/share/topics.ts)와 공유 카드 검사. 설계 문서 "공개 id 등록부"·"빌드 파이프라인 1단계".
// 등록부는 추가만 한다. 같은 id = 같은 answerKey. 공유 대상(shareable: true) ⊆ 등록부.
import { createHash } from 'node:crypto';
import { canonicalAnswer } from '../../src/lib/answer.ts';
import { cutGraphemes } from '../../src/lib/shareLink.ts';
import type { QuizItem } from '../../src/types/quiz.ts';
import { fitCardText } from './textFit.ts';

export const REGISTRY_FILE = 'data/share/published-ids.json';

export type RegistryEntry = {
  id: string;
  answerKey: string;
  /** register-ids를 돌린 날(로컬 YYYY-MM-DD). 기록용. */
  firstPublished: string;
};

/** 위반 한 줄: 코드 + 위치 + 내용 + 고칠 방법. */
export type ShareProblem = {
  code: string;
  where: string;
  message: string;
  fix: string;
};

export function formatShareProblem(problem: ShareProblem): string {
  return `${problem.code} ${problem.where}: ${problem.message} → Fix: ${problem.fix} (docs/errors.md#${problem.code.toLowerCase()})`;
}

/** 정답 해시: canonicalAnswer의 SHA-256 16진수 앞 16자. 바꾸면 등록부 형식 버전을 올린다. */
export function answerKey(answer: string): string {
  return createHash('sha256')
    .update(canonicalAnswer(answer))
    .digest('hex')
    .slice(0, 16);
}

const ID_PATTERN = /^[1-9][0-9]*$/;
const KEY_PATTERN = /^[0-9a-f]{16}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 등록부 파일 자체의 형식 검사. file: 위반에 적을 등록부 경로. */
export function checkRegistryShape(
  value: unknown,
  file: string = REGISTRY_FILE,
): {
  entries: RegistryEntry[];
  problems: ShareProblem[];
} {
  const problems: ShareProblem[] = [];
  const add = (where: string, message: string) =>
    problems.push({
      code: 'QD_REGISTRY_SHAPE',
      where: `${file}${where}`,
      message,
      fix: 'git으로 이전 버전을 되살리세요(손으로 고치지 않음)',
    });
  if (!Array.isArray(value)) {
    add('', '배열이 아니에요');
    return { entries: [], problems };
  }
  const entries: RegistryEntry[] = [];
  const seen = new Set<string>();
  let previous = 0;
  value.forEach((entry: unknown, index) => {
    const at = `[${index}]`;
    const e = entry as Partial<RegistryEntry> | null;
    if (
      !e ||
      typeof e.id !== 'string' ||
      !ID_PATTERN.test(e.id) ||
      typeof e.answerKey !== 'string' ||
      !KEY_PATTERN.test(e.answerKey) ||
      typeof e.firstPublished !== 'string' ||
      !DATE_PATTERN.test(e.firstPublished)
    ) {
      add(at, `항목 형식이 틀려요: 실제 값 ${JSON.stringify(entry)}`);
      return;
    }
    if (seen.has(e.id)) add(at, `id ${e.id}가 두 번 있어요`);
    if (Number(e.id) < previous)
      add(at, `id 순서가 숫자 오름차순이 아니에요 (${e.id})`);
    previous = Number(e.id);
    seen.add(e.id);
    entries.push({
      id: e.id,
      answerKey: e.answerKey,
      firstPublished: e.firstPublished,
    });
  });
  return { entries, problems };
}

/** 카드에 실제로 그릴 문구. */
export function cardText(item: QuizItem): string {
  return item.ogText ?? item.question;
}

/**
 * 공유 데이터 검사(빌드 1단계): 공유 대상 ⊆ 등록부, answerKey 일치, 정답 노출, 글자 배치,
 * 직전 커밋 등록부와 비교해 지워진 id(append-only 위반).
 */
export function checkShareData({
  items,
  registry,
  previousRegistry,
  dataFile = 'data/nonsense.json',
  registryFile = REGISTRY_FILE,
  card = 'question',
}: {
  items: readonly QuizItem[];
  registry: readonly RegistryEntry[];
  previousRegistry?: readonly RegistryEntry[];
  /** 위반에 적을 데이터·등록부 경로. */
  dataFile?: string;
  registryFile?: string;
  /** topic(주제 공통 카드)이면 문제 문장을 카드에 그리지 않으므로 글자 배치는 검사하지 않는다. */
  card?: 'question' | 'topic';
}): ShareProblem[] {
  const problems: ShareProblem[] = [];
  const byId = new Map(registry.map((entry) => [entry.id, entry]));
  const drawsQuestion = card === 'question';
  items.forEach((item, index) => {
    const where = `${dataFile}[${index}]`;
    const registered = byId.get(item.id);
    if (registered && registered.answerKey !== answerKey(item.answer)) {
      problems.push({
        code: 'QD_ANSWER_CHANGED',
        where: `${where}.answer`,
        message: `id ${item.id}의 정답이 바뀌었어요 (등록 ${registered.answerKey}, 현재 ${answerKey(item.answer)})`,
        fix: `공개된 id는 정답을 바꿀 수 없어요. 예전 정답으로 되돌리거나, 새 id로 옮기고 ${item.id}는 shareable:false. ${registryFile}을 손으로 고치지 마세요`,
      });
    }
    if (item.shareable !== true) return;
    if (!registered) {
      problems.push({
        code: 'QD_UNREGISTERED',
        where,
        message: `id ${item.id}는 공유 대상인데 등록부에 없어요`,
        fix: 'npm run register-ids',
      });
    }
    const text = cardText(item);
    const card = canonicalAnswer(text);
    const answer = canonicalAnswer(item.answer);
    if (
      item.allowAnswerInCard !== true &&
      cutGraphemes(answer, 99).length >= 2 &&
      card.includes(answer)
    ) {
      problems.push({
        code: 'QD_ANSWER_IN_CARD',
        where: `${where}${item.ogText ? '.ogText' : '.question'}`,
        message: `카드 문구에 정답 "${item.answer}"가 들어 있어요`,
        fix: 'ogText로 문구를 바꾸거나, 의도된 경우 allowAnswerInCard: true',
      });
    }
    if (drawsQuestion && !fitCardText(text)) {
      problems.push({
        code: 'QD_TEXT_FIT',
        where: `${where}${item.ogText ? '.ogText' : '.question'}`,
        message: `카드에 들어가지 않아요: 실제 값 "${text}" (56px 10자×3줄, 48px 12자×4줄 한도)`,
        fix: 'ogText 추가(띄어쓰기 기준 한 줄 12자 이하, 4줄 이하)',
      });
    }
  });
  if (previousRegistry) {
    const now = new Set(registry.map((entry) => entry.id));
    for (const entry of previousRegistry) {
      if (!now.has(entry.id)) {
        problems.push({
          code: 'QD_REGISTRY_SHRUNK',
          where: registryFile,
          message: `직전 커밋에 있던 id ${entry.id}가 지워졌어요`,
          fix: '등록부는 추가만 해요. 공유를 멈추려면 그 문제를 shareable:false로 두세요',
        });
      }
    }
  }
  return problems;
}

/** register-ids: 아직 없는 공유 대상 id를 등록한다. 정답이 바뀐 id가 있으면 아무것도 바꾸지 않는다. */
export function planRegistration({
  items,
  registry,
  today,
}: {
  items: readonly QuizItem[];
  registry: readonly RegistryEntry[];
  today: string;
}):
  | { ok: true; next: RegistryEntry[]; added: string[]; unchanged: number }
  | { ok: false; problems: ShareProblem[] } {
  const changed = checkShareData({ items, registry }).filter(
    (problem) => problem.code === 'QD_ANSWER_CHANGED',
  );
  if (changed.length > 0) return { ok: false, problems: changed };
  const known = new Set(registry.map((entry) => entry.id));
  const added: string[] = [];
  const next = [...registry];
  for (const item of items) {
    if (item.shareable !== true || known.has(item.id)) continue;
    next.push({
      id: item.id,
      answerKey: answerKey(item.answer),
      firstPublished: today,
    });
    added.push(item.id);
  }
  next.sort((a, b) => Number(a.id) - Number(b.id));
  return { ok: true, next, added, unchanged: registry.length };
}
