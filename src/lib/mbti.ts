// MBTI 4축 고르기(풀이 방식 mbtiAxes). 고른 값은 4글자 문자열로 다룬다: 안 고른 축은 '_'.
// 축 공개 힌트를 연 만큼 앞 축부터 정답 글자로 고정한다(progress.openableHints와 같은 순서).

/** 축 하나: 두 글자와 뜻. */
export type MbtiAxis = {
  /** 축 이름(그룹 이름, 설명). */
  name: string;
  /** 설명(ⓘ)에서 축을 묻는 말. */
  question: string;
  options: readonly [MbtiOption, MbtiOption];
};

type MbtiOption = {
  letter: string;
  label: string;
  /** 설명(ⓘ) 한 줄. */
  desc: string;
};

/** 4축. 순서가 유형 글자 순서다. */
export const MBTI_AXES: readonly MbtiAxis[] = [
  {
    name: '에너지 방향',
    question: '에너지를 어디서 얻나요?',
    options: [
      { letter: 'E', label: '외향', desc: '사람들과 어울리며 힘을 얻어요' },
      { letter: 'I', label: '내향', desc: '혼자만의 시간으로 힘을 채워요' },
    ],
  },
  {
    name: '정보 인식',
    question: '정보를 어떻게 받아들이나요?',
    options: [
      { letter: 'S', label: '감각', desc: '눈앞의 사실과 경험을 믿어요' },
      { letter: 'N', label: '직관', desc: '숨은 의미와 가능성을 떠올려요' },
    ],
  },
  {
    name: '결정 방식',
    question: '결정할 때 무엇을 먼저 보나요?',
    options: [
      { letter: 'T', label: '사고', desc: '논리와 원칙으로 정해요' },
      { letter: 'F', label: '감정', desc: '사람과 관계를 먼저 생각해요' },
    ],
  },
  {
    name: '생활 양식',
    question: '생활을 어떻게 꾸리나요?',
    options: [
      { letter: 'J', label: '판단', desc: '계획을 세우고 그대로 움직여요' },
      { letter: 'P', label: '인식', desc: '상황에 맞춰 유연하게 움직여요' },
    ],
  },
];

const EMPTY = '_';

/** 데이터의 정답이 MBTI 유형(4축 글자)인지. */
export const MBTI_TYPE_PATTERN = /^[EI][SN][TF][JP]$/;

/** 고른 값(문자열)을 축별 글자로. 안 고른 축은 undefined. */
export function mbtiLetters(input: string): (string | undefined)[] {
  return MBTI_AXES.map((axis, index) => {
    const letter = input[index];
    return axis.options.some((option) => option.letter === letter)
      ? letter
      : undefined;
  });
}

/** 한 축을 고른 새 값. */
export function pickMbtiAxis({
  input,
  axis,
  letter,
}: {
  input: string;
  axis: number;
  letter: string;
}): string {
  const letters = mbtiLetters(input);
  letters[axis] = letter;
  return letters.map((value) => value ?? EMPTY).join('');
}

/** 공개된 축(앞에서 locked개)을 정답 글자로 덮은 고른 값. */
export function withRevealedAxes({
  input,
  answer,
  locked,
}: {
  input: string;
  answer: string;
  locked: number;
}): string {
  const letters = mbtiLetters(input);
  for (let index = 0; index < Math.min(locked, MBTI_AXES.length); index++) {
    letters[index] = answer[index];
  }
  return letters.map((value) => value ?? EMPTY).join('');
}

/** 4축을 모두 골랐는지. */
export function isCompleteMbti(input: string): boolean {
  return mbtiLetters(input).every((letter) => letter !== undefined);
}

/** 정답과 자리가 같은 축 수(어느 축인지는 알리지 않는다). */
export function matchedAxisCount({
  answer,
  input,
}: {
  answer: string;
  input: string;
}): number {
  return mbtiLetters(input).filter((letter, index) => letter === answer[index])
    .length;
}

/** 축 공개 힌트 문구(HintPanel이 따옴표 속 글자를 크게 보여 준다). */
export function revealAxisText(position: number, letter: string): string {
  const axis = MBTI_AXES[position - 1];
  const option = axis?.options.find((item) => item.letter === letter);
  if (!axis || !option) return `${position}번째 글자는 '${letter}'`;
  const pair = axis.options.map((item) => item.letter).join('/');
  return `${pair} 축은 '${letter}' ${option.label}`;
}
