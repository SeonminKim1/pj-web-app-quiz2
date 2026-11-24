import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { getReward } from '../lib/rewards.ts';
import { PetPortrait } from './PetPortrait.tsx';

// Value: protects=모자를 넘기지 않으면 그림이 그대로(앱 아이콘·공유 카드, 설계 OV7); fails_when=PetPortrait가 기본으로 모자를 그리거나 hat 없이 그림이 바뀌면; why_new=PetPortrait 테스트가 없음; seam=none; no_claim=공유 카드 PNG 픽셀
it('모자를 넘기지 않으면 모자를 그리지 않는다', () => {
  const { container } = render(<PetPortrait animal="rabbit" />);
  expect(container.querySelector('[data-part="hat"]')).toBeNull();
});

// Value: protects=모자가 숨쉬기 묶음 안 맨 마지막(얼굴 위)에 선과 함께 그려진다(설계 T1, OV2-1·2); fails_when=모자를 svg 바로 아래에 두어 숨쉴 때 떠 있거나, 선 묶음 없이 그려 윤곽이 사라지면; why_new=모자 그리기가 새로 생김; seam=none; no_claim=동물마다 보기 좋은지(T1 이미지)
it('모자는 숨쉬기 묶음 안 맨 마지막에, 선과 함께 그린다', () => {
  const hat = getReward('hat-crown-pink')!;
  const { container } = render(<PetPortrait animal="cat" hat={hat} />);
  const figure = container.querySelector('[data-part="figure"]')!;
  const drawn = figure.lastElementChild!;
  expect(drawn.getAttribute('data-part')).toBe('hat');
  expect(drawn.getAttribute('data-reward')).toBe('hat-crown-pink');
  expect(drawn.querySelector('g[stroke]')).not.toBeNull();
});
