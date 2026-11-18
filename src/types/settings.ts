// 사용자 설정(localStorage 'quiz-settings'). 규칙은 docs/ui-pest-skin/spec.md "설정 저장".

/** 방해꾼 동물 id. 목록·값은 src/lib/pestAnimals.ts의 PEST_ANIMALS. */
export type PetId = 'rabbit' | 'dog' | 'cat' | 'squirrel';

/** 저장되는 설정 전체. 형식이 바뀌면 version을 올린다. */
export type Settings = {
  version: number;
  /** 풀이 화면에서 뛰어놀 방해꾼 동물. */
  pet: PetId;
};
