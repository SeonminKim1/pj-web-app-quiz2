import { render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CoinBurst } from './CoinBurst.tsx';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

it('골드 배지 쪽으로 동전 5개를 날리고, 사라지면 정리한다', () => {
  const badge = document.createElement('span');
  badge.dataset.goldBadge = '';
  document.body.append(badge);
  const animate = vi.fn();
  HTMLElement.prototype.animate = animate as never;
  const { unmount } = render(<CoinBurst />);
  expect(animate).toHaveBeenCalledTimes(5);
  expect(document.body.querySelectorAll('span[class*=coin]')).toHaveLength(5);
  unmount();
  expect(document.body.querySelectorAll('span[class*=coin]')).toHaveLength(0);
});
