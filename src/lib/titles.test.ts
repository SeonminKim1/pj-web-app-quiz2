import { describe, expect, it } from 'vitest';
import { MASTER_TITLE, titleFor } from './titles.ts';

describe('titleFor', () => {
  it('맞힌 수로 칭호와 다음까지 남은 수를 정한다', () => {
    expect(titleFor({ solved: 0, total: 546 })).toEqual({
      level: 0,
      name: '넌센스 새싹',
      next: { name: '말장난 꿈나무', remaining: 10 },
    });
    expect(titleFor({ solved: 10, total: 546 })).toMatchObject({
      level: 1,
      name: '말장난 꿈나무',
    });
    expect(titleFor({ solved: 450, total: 546 })).toMatchObject({
      name: '넌센스 전설',
      next: { name: MASTER_TITLE, remaining: 96 },
    });
  });

  it('전부 맞히면 정복자, 다음 없음', () => {
    expect(titleFor({ solved: 546, total: 546 })).toEqual({
      level: 7,
      name: MASTER_TITLE,
      next: undefined,
    });
  });
});
