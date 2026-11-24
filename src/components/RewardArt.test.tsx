import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { REWARDS } from '../lib/rewards.ts';
import { RewardArt } from './RewardArt.tsx';

// Value: protects=보상 표의 모든 보상에 그림이 있다(빈 스티커가 없다); fails_when=보상 표에 새 모양을 넣고 RewardArt에 그림을 안 그리면(switch default가 null을 돌려 빈 <g>); why_new=보상 그림 테스트가 없음; seam=none; no_claim=그림이 보기 좋은지, 모자 보이는 영역
it('모든 보상에 그림이 있다', () => {
  for (const reward of REWARDS.values()) {
    const { container, unmount } = render(<RewardArt reward={reward} />);
    const group = container.querySelector('svg > g');
    expect(group, reward.id).not.toBeNull();
    expect(group!.childElementCount, reward.id).toBeGreaterThan(0);
    unmount();
  }
});
