// 사용자 진행 상황(localStorage 'quiz-progress').
import type { PetId } from './settings.ts';

/** 주제 하나의 진행. */
export type TopicProgress = {
  /** 맞힌 문제 id(중복 없음). */
  solved: string[];
  /** 문제 id → 연 힌트 단계 수. */
  hintsOpened: Record<string, number>;
};

/** 북마크 하나: 주제 id와 문제 id. */
export type Bookmark = {
  topic: string;
  id: string;
};

/** 저장되는 진행 전체. 형식이 바뀌면 version을 올린다. */
export type Progress = {
  version: number;
  gold: number;
  /** 주제 id → 진행. 아직 플레이하지 않은 주제는 없을 수 있다. */
  topics: Record<string, TopicProgress>;
  /** 북마크(선택 필드). 주제를 섞은 하나의 목록, 북마크한 순서(뒤가 최근). 없으면 빈 목록. */
  bookmarks?: Bookmark[];
  /** 받은 보상 id(선택 필드, src/lib/rewards.ts). 한 번 받으면 빼앗지 않는다. 받은 순서. */
  earnedRewards?: string[];
  /** 사용자에게 보여 준 보상 id(선택 필드). 결과 카드나 "그동안 모은 스티커" 시트로 본 것. */
  seenRewards?: string[];
  /**
   * 동물마다 쓰고 있는 모자 id(선택 필드). 받은 모자만 씌울 수 있다(equipHat).
   * 모르는 모자나 받지 않은 모자를 가리키면 그리지 않는다(hatOf). 저장에서는 지우지 않는다(설계 D30).
   */
  equipped?: Partial<Record<PetId, string>>;
  /** 상점에서 산 놀이터 물건 id(선택 필드, 산 순서). */
  ownedItems?: string[];
  /**
   * 놀이터 칸("0"~"5", 지금 없는 숫자 칸도 지우지 않는다) → 놓은 물건 id(선택 필드). 한 번도 저장하지 않았으면 기본 물건이 0번 칸에 있다(설계 D14).
   * 빈 객체는 "다 치웠다"는 뜻이라 지우지 않는다(F4).
   */
  placed?: Record<string, string>;
};
