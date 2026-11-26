import { render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { standingPoint } from '../lib/pestMotion.ts';
import { getYardItem, type Reward } from '../lib/rewards.ts';
import type { PetId } from '../types/settings.ts';
import { YardScene } from './YardScene.tsx';

// jsdom에는 배치가 없어 마당(section)과 칸 목록(ol) 상자를 직접 준다.
const YARD = { left: 10, top: 40, width: 360, height: 300 };
const LAYER = { left: 17, top: 106, width: 346, height: 225 };
const LAYER_IN_YARD = { left: 7, top: 66, width: 346, height: 225 };

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }) as MediaQueryList);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      const r =
        this.tagName === 'SECTION'
          ? YARD
          : this.tagName === 'OL'
            ? LAYER
            : { left: 0, top: 0, width: 0, height: 0 };
      return {
        ...r,
        x: r.left,
        y: r.top,
        right: r.left + r.width,
        bottom: r.top + r.height,
        toJSON: () => ({}),
      } as DOMRect;
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderYard(items: (Reward | undefined)[], pet: PetId) {
  const { container } = render(
    <YardScene
      items={items}
      pet={pet}
      hatOf={() => undefined}
      placing={undefined}
      onCell={() => {}}
      onCancelPlacing={() => {}}
    />,
  );
  // 그림 상자 왼쪽 위(px) = 발밑 − (크기/2, 크기).
  return (id: PetId) => {
    const el = container
      .querySelector(`[data-animal="${id}"]`)!
      .closest<HTMLElement>('[data-by-item]')!;
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(el.style.transform);
    expect(m).not.toBeNull();
    return { left: Number(m![1]), top: Number(m![2]) };
  };
}

// Value: protects=좋아하는 물건이 여러 칸이면 가장 앞 번호 칸 옆에 선다(D39); fails_when=standingCell이 마지막·다른 칸을 고르면; why_new=페이지 테스트는 data-by-item만 봄(jsdom 배치 0); seam=none; no_claim=실제 CSS 배치(getBoundingClientRect 대역)
it('털실 공이 두 칸에 있으면 고양이는 앞 번호 칸 옆에 선다(움직임 줄이기)', () => {
  const items: (Reward | undefined)[] = Array(6).fill(undefined);
  items[1] = getYardItem('item-yarn-mint');
  items[4] = getYardItem('item-yarn-pink');
  const at = renderYard(items, 'dog');
  // 순서 rabbit, cat, squirrel, dog(고른 방해꾼은 마지막 자리): 고양이는 자리 1, 크기 50.
  const spot = standingPoint({
    layer: LAYER_IN_YARD,
    cell: 1,
    slot: 1,
    size: 50,
  });
  const cat = at('cat');
  expect(cat.left).toBeCloseTo(spot.x - 25);
  expect(cat.top).toBeCloseTo(spot.y - 50);
});

// Value: protects=고른 방해꾼은 아래 줄 맨 끝 자리에 60px로 선다(D18, PR ③ 순서); fails_when=정렬 비교가 틀리거나 크기를 바꾸면; why_new=hook 테스트는 slot·size를 직접 넣음; seam=none; no_claim=실제 CSS 배치(getBoundingClientRect 대역)
it('고른 방해꾼은 아래 줄 맨 끝 자리에 크게 선다(움직임 줄이기)', () => {
  const at = renderYard(Array(6).fill(undefined), 'dog');
  const dogSpot = standingPoint({
    layer: LAYER_IN_YARD,
    cell: undefined,
    slot: 3,
    size: 60,
  });
  const dog = at('dog');
  expect(dog.left).toBeCloseTo(dogSpot.x - 30);
  expect(dog.top).toBeCloseTo(dogSpot.y - 60);
  const rabbitSpot = standingPoint({
    layer: LAYER_IN_YARD,
    cell: undefined,
    slot: 0,
    size: 50,
  });
  const rabbit = at('rabbit');
  expect(rabbit.left).toBeCloseTo(rabbitSpot.x - 25);
  expect(rabbit.top).toBeCloseTo(rabbitSpot.y - 50);
});
