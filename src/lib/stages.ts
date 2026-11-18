// 고정 스테이지(spec "스테이지"): 문제를 id 숫자 오름차순으로 stageSize개씩 나눈다.
import type { QuizItem } from '../types/quiz.ts';

/** 스테이지 하나. no는 1부터. */
export type Stage = {
  no: number;
  items: QuizItem[];
};

/** 스테이지 진행률. */
export type StageProgress = {
  solvedCount: number;
  total: number;
  completed: boolean;
};

const STAGE_NO_PATTERN = /^[1-9][0-9]*$/;

/** 문제를 id 숫자 오름차순으로 정렬해 stageSize개씩 나눈다(마지막은 적을 수 있음). */
export function buildStages({
  items,
  stageSize,
}: {
  items: readonly QuizItem[];
  stageSize: number;
}): Stage[] {
  const sorted = [...items].sort((a, b) => Number(a.id) - Number(b.id));
  const stages: Stage[] = [];
  for (let start = 0; start < sorted.length; start += stageSize) {
    stages.push({
      no: stages.length + 1,
      items: sorted.slice(start, start + stageSize),
    });
  }
  return stages;
}

/** 주소의 스테이지 번호를 읽는다. 1 이상 정수 문자열이고 스테이지 수 이하일 때만 번호, 아니면 undefined. */
export function parseStageNo({
  value,
  stageCount,
}: {
  value: string | undefined;
  stageCount: number;
}): number | undefined {
  if (value === undefined || !STAGE_NO_PATTERN.test(value)) return undefined;
  const no = Number(value);
  return no <= stageCount ? no : undefined;
}

/** 스테이지에서 푼 문제 수와 완료 여부. */
export function stageProgress({
  stage,
  solved,
}: {
  stage: Stage;
  solved: ReadonlySet<string>;
}): StageProgress {
  const solvedCount = stage.items.filter((item) => solved.has(item.id)).length;
  return {
    solvedCount,
    total: stage.items.length,
    completed: solvedCount === stage.items.length && stage.items.length > 0,
  };
}

/** 스테이지 한 번 풀기 계획. */
export type StagePlayPlan = {
  /** 스테이지 문제 전체(id 순서). 이전·다음으로 오간다. */
  items: QuizItem[];
  /** 처음 보여 줄 문제: 첫 번째 못 푼 문제, 다 풀었으면(다시 풀기) 0. */
  startIndex: number;
  /** 모두 푼 스테이지를 다시 푸는지(골드 없음). */
  replay: boolean;
  /** 들어오기 전에 맞힌 문제 id. 이 문제들은 정답이 보이는 상태로 보여 준다. 다시 풀기면 빈 집합. */
  solvedBefore: ReadonlySet<string>;
};

/**
 * 스테이지에 들어갈 때의 계획(spec "문제 목록과 이동"): 스테이지 전체를 두고 첫 못 푼 문제부터.
 * 모두 풀었으면 다시 풀기로 1번부터, 모든 문제를 다시 풀 수 있다(골드 규칙은 progress.ts).
 */
export function stagePlayPlan({
  stage,
  solved,
  allowReplay = true,
}: {
  stage: Stage;
  solved: ReadonlySet<string>;
  /** 다 푼 판을 다시 풀기로 열지. false면(MBTI 보드) 맞힌 문제는 늘 정답으로 보인다. */
  allowReplay?: boolean;
}): StagePlayPlan {
  const items = [...stage.items];
  const firstUnsolved = items.findIndex((item) => !solved.has(item.id));
  if (firstUnsolved === -1 && allowReplay) {
    return { items, startIndex: 0, replay: true, solvedBefore: new Set() };
  }
  return {
    items,
    startIndex: Math.max(0, firstUnsolved),
    replay: false,
    solvedBefore: new Set(
      items.filter((item) => solved.has(item.id)).map((item) => item.id),
    ),
  };
}
