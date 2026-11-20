// 스티커첩 보상(설계 docs/designs/rewards-playground.md): 판(스테이지·카테고리)을 다 풀면 받는 꾸미기 보상.
// 보상 id는 진행(earnedRewards)에 영원히 남으므로 이름을 바꾸거나 지우지 않는다(rewards.test.ts가 목록을 고정한다).
// 그림은 src/components/RewardArt.tsx.
import type { QuizTopic } from '../types/quiz.ts';
import type { Stage } from './stages.ts';

/** 모자(동물이 쓴다) / 놀이터 작은 물건 / 5스테이지마다 오는 큰 물건. */
type RewardKind = 'hat' | 'item' | 'big';

/** 보상 색 변형(D22: 분홍·민트·노랑·하늘 네 가지만). */
export type RewardColor = 'pink' | 'mint' | 'yellow' | 'sky';

/** 보상 하나. shape는 그림 종류, color는 그 그림의 주 색(큰 물건은 없음). */
export type Reward = {
  id: string;
  kind: RewardKind;
  shape: string;
  color: RewardColor | undefined;
  /** 화면에 보일 이름("분홍 리본"). */
  name: string;
};

const COLOR_NAMES: Record<RewardColor, string> = {
  pink: '분홍',
  mint: '민트',
  yellow: '노랑',
  sky: '하늘',
};

const SHAPE_NAMES: Record<string, string> = {
  // 모자
  ribbon: '리본',
  straw: '밀짚모자',
  crown: '왕관',
  party: '고깔모자',
  beanie: '털모자',
  cap: '야구모자',
  flower: '화관',
  tophat: '신사 모자',
  // 작은 물건
  yarn: '털실 공',
  bone: '뼈다귀 장난감',
  ball: '비치볼',
  pot: '꽃 화분',
  mushroom: '버섯 의자',
  balloon: '풍선',
  kite: '연',
  // 큰 물건
  slide: '미끄럼틀',
  swing: '그네',
  tent: '텐트',
  sandcastle: '모래성',
  'acorn-tree': '도토리 나무',
  'carrot-patch': '당근 밭',
  seesaw: '시소',
  fountain: '분수',
  treehouse: '나무집',
  pond: '연못',
  rainbow: '무지개 다리',
};

/** 넌센스 스테이지 1~55번의 보상(D4: 표 밖 스테이지는 보상 없음). 5의 배수는 큰 물건. */
export const NONSENSE_REWARDS: readonly string[] = [
  'hat-ribbon-pink',
  'item-yarn-pink',
  'item-bone-pink',
  'hat-straw-pink',
  'big-slide',
  'item-ball-pink',
  'hat-crown-pink',
  'hat-party-pink',
  'item-pot-pink',
  'big-swing',
  'hat-beanie-pink',
  'item-mushroom-pink',
  'hat-cap-pink',
  'hat-flower-pink',
  'big-tent',
  'item-balloon-pink',
  'hat-tophat-pink',
  'item-kite-pink',
  'hat-ribbon-mint',
  'big-sandcastle',
  'hat-straw-mint',
  'item-yarn-mint',
  'hat-crown-mint',
  'item-bone-mint',
  'big-acorn-tree',
  'hat-party-mint',
  'item-ball-mint',
  'hat-beanie-mint',
  'hat-cap-mint',
  'big-carrot-patch',
  'item-pot-mint',
  'hat-flower-mint',
  'item-mushroom-mint',
  'hat-tophat-mint',
  'big-seesaw',
  'hat-ribbon-yellow',
  'item-balloon-mint',
  'hat-straw-yellow',
  'item-kite-mint',
  'big-fountain',
  'hat-crown-yellow',
  'hat-party-yellow',
  'item-yarn-sky',
  'hat-beanie-yellow',
  'big-treehouse',
  'item-bone-sky',
  'hat-cap-yellow',
  'item-ball-sky',
  'hat-flower-yellow',
  'big-pond',
  'hat-tophat-yellow',
  'item-pot-sky',
  'hat-ribbon-sky',
  'item-mushroom-sky',
  'big-rainbow',
];

/** MBTI 카테고리 이름 → 보상(이름으로 정해 데이터 순서가 바뀌어도 칸이 움직이지 않는다). */
export const MBTI_REWARDS: Readonly<Record<string, string>> = {
  일상: 'hat-straw-sky',
  연애: 'hat-crown-sky',
  카톡: 'item-balloon-sky',
  여행: 'hat-party-sky',
  소비: 'item-kite-sky',
  직장: 'hat-beanie-sky',
  스트레스: 'hat-cap-sky',
};

/** 보상 id("hat-ribbon-pink", "big-acorn-tree")를 풀어 보상으로. 모르는 id면 undefined. */
function parseReward(id: string): Reward | undefined {
  const match = /^(hat|item|big)-([a-z-]+?)(?:-(pink|mint|yellow|sky))?$/.exec(
    id,
  );
  if (!match) return undefined;
  const kind = match[1] as RewardKind;
  const shape = match[2]!;
  const color = match[3] as RewardColor | undefined;
  const shapeName = SHAPE_NAMES[shape];
  if (!shapeName || (kind === 'big') !== (color === undefined))
    return undefined;
  return {
    id,
    kind,
    shape,
    color,
    name: color ? `${COLOR_NAMES[color]} ${shapeName}` : shapeName,
  };
}

/** 받을 수 있는 보상 전체(표에 나오는 순서, 중복 없음). */
export const REWARDS: ReadonlyMap<string, Reward> = new Map(
  [...NONSENSE_REWARDS, ...Object.values(MBTI_REWARDS)].map((id) => {
    const reward = parseReward(id);
    if (!reward) throw new Error(`보상 id 형식이 틀렸어요: ${id}`);
    return [id, reward];
  }),
);

/** id로 보상을 찾는다(모르는 id면 undefined). */
export function getReward(id: string): Reward | undefined {
  return REWARDS.get(id);
}

/** 주제의 한 판을 다 풀면 받는 보상. 보상 표가 없는 주제이거나 표 밖의 판이면 undefined. */
export function rewardFor({
  topic,
  round,
}: {
  topic: QuizTopic;
  round: Stage & { name?: string };
}): Reward | undefined {
  const table = topic.rewards;
  if (!table) return undefined;
  const id =
    'byStage' in table
      ? table.byStage[round.no - 1]
      : round.name === undefined
        ? undefined
        : table.byCategory[round.name];
  return id === undefined ? undefined : getReward(id);
}
