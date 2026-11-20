import { describe, expect, it } from 'vitest';
import { buildAlbum } from './album.ts';
import { initialProgress } from './progress.ts';
import { getQuizTopic } from './quizTopics.ts';

const NONSENSE = getQuizTopic('nonsense');

function round(no: number, ids: string[]) {
  return { no, items: ids.map((id) => ({ id, question: '?', answer: '!' })) };
}

// Value: protects=스티커 칸은 "지금 다 푼 판 ∪ 기록된 보상"을 받은 것으로 보고(OV3), 표 밖 판은 보상이 없다(D4); fails_when=기록 전(목록이 막 열린 순간)에 받은 칸이 안 받은 것으로 보이거나 기록된 보상이 판이 덜 풀렸다고 사라지면; why_new=스티커첩이 새로 생김; seam=none; no_claim=칸 모양(CSS)
describe('buildAlbum', () => {
  it('다 푼 판과 기록된 보상을 받은 것으로, 장 수와 칭호를 함께', () => {
    const rounds = [round(1, ['1']), round(2, ['2', '3']), round(56, ['4'])];
    const album = buildAlbum({
      topic: NONSENSE,
      rounds,
      progress: {
        ...initialProgress(),
        topics: { nonsense: { solved: ['1', '2'], hintsOpened: {} } },
        // 2번은 전에 받았지만 지금은 덜 풂(문제가 늘었다).
        earnedRewards: ['item-yarn-pink'],
      },
    });
    expect(album.cells.map((cell) => [cell.no, cell.earned])).toEqual([
      [1, true],
      [2, true],
      [56, false],
    ]);
    expect(album.cells[2]?.reward).toBeUndefined();
    expect(album).toMatchObject({ earnedCount: 2, rewardCount: 2 });
    expect(album.title).toMatchObject({ name: '넌센스 새싹', progress: 0.2 });
  });
});
