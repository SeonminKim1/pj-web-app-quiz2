// 사용자 설정(localStorage 'quiz-settings').

/** 방해꾼 동물 id. 목록·값은 src/lib/pestAnimals.ts의 PEST_ANIMALS. */
export type PetId = 'rabbit' | 'dog' | 'cat' | 'squirrel';

/** 저장되는 설정 전체. 형식이 바뀌면 version을 올린다. */
export type Settings = {
  version: number;
  /** 풀이 화면에서 뛰어놀 방해꾼 동물. */
  pet: PetId;
  /** 효과음·진동(선택 필드, 없으면 꺼짐). */
  sound?: boolean;
  /** 배경음악(선택 필드, 없으면 꺼짐). */
  music?: boolean;
  /** 마지막으로 푼 주제 id(첫 화면 "이어서 풀기"가 이 주제로 간다). 없으면 넌센스. */
  lastTopic?: string;
};
