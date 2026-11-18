// 주관식 정답 규칙(docs/ui-nonsense-play/spec.md "주관식 입력"): 정답 글자, 어절별 글자 수, 채점.

/** 정답에서 공백을 뺀 글자들(유니코드 문자 단위). 문장부호·숫자·영문도 글자다. */
export function answerChars(answer: string): string[] {
  return [...answer].filter((char) => !/\s/.test(char));
}

/** 띄어쓰기로 나눈 어절별 글자 수(글자 수 표시용). 예: "아싸 호랑나비" → [2, 4] */
export function answerWordLengths(answer: string): number[] {
  return answer
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => [...word].length);
}

/**
 * 정답 비교·해시·노출 검사가 함께 쓰는 단 하나의 정규화: NFC → 모든 공백 제거 → 소문자.
 * macOS에서 저장한 NFD 한글도 같은 값이 된다. 바꾸면 등록부(published-ids.json) 형식 버전을 올린다.
 */
export function canonicalAnswer(text: string): string {
  return answerChars(text.normalize('NFC')).join('').toLowerCase();
}

/** 채점용 값(canonicalAnswer와 같다). */
export function normalizeAnswer(text: string): string {
  return canonicalAnswer(text);
}

/** 입력이 정답인지: 띄어쓰기·영문 대소문자는 무시하고 나머지는 정확히 같아야 한다. 빈 입력은 오답. */
export function isCorrectAnswer({
  answer,
  input,
}: {
  answer: string;
  input: string;
}): boolean {
  const normalized = normalizeAnswer(input);
  return normalized.length > 0 && normalized === normalizeAnswer(answer);
}

/** 글자 칸: 어절별 칸 묶음(쓴 글자 또는 빈칸)과 칸보다 많이 쓴 글자 수. */
export type AnswerSlots = {
  groups: (string | undefined)[][];
  overflow: number;
};

/**
 * 입력을 정답 글자 칸에 채운다(docs/ui-play-layout/spec.md "글자 칸"). 입력의 공백은 빼고
 * 앞에서부터 한 칸에 한 글자씩. 쓴 띄어쓰기 위치는 반영하지 않는다(채점이 무시하므로).
 */
export function answerSlots({
  answer,
  input,
}: {
  answer: string;
  input: string;
}): AnswerSlots {
  const chars = answerChars(input);
  let next = 0;
  const groups = answerWordLengths(answer).map((length) =>
    Array.from({ length }, () => chars[next++]),
  );
  return { groups, overflow: Math.max(0, chars.length - next) };
}
