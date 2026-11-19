// Value: protects=머리 줄 진행 칸이 문제마다 한 칸이고 맞힌 칸·지금 칸을 표시하며 읽는 이름은 "판 · n / N"; fails_when=칸 수가 문제 수와 어긋나거나 맞힘·지금 표시가 다른 칸에 붙으면; why_new=진행 칸은 FINDING-004에서 새로 생김; seam=none; no_claim=칸 색(CSS)
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { QuestionNav } from './QuestionNav.tsx';

it('진행 칸: 문제마다 한 칸, 맞힌 칸과 지금 칸을 표시한다', () => {
  const { container } = render(
    <QuestionNav
      label="스테이지 2"
      current={2}
      total={4}
      solved={[true, false, true, false]}
      canPrev
      next="next"
      onPrev={() => {}}
      onNext={() => {}}
    />,
  );
  const cells = [
    ...container.querySelectorAll('[data-current], [class*="cell"]'),
  ];
  expect(cells).toHaveLength(4);
  expect(cells.map((c) => c.hasAttribute('data-solved'))).toEqual([
    true,
    false,
    true,
    false,
  ]);
  expect(cells.map((c) => c.hasAttribute('data-current'))).toEqual([
    false,
    true,
    false,
    false,
  ]);
  expect(screen.getByText('스테이지 2 · 2 / 4')).toBeInTheDocument();
});
