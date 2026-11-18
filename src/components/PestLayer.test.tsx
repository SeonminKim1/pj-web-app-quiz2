import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PestMotion } from '../hooks/usePestMotion.ts';
import { PestLayer } from './PestLayer.tsx';

function fakeMotion(): PestMotion {
  return {
    subscribe: vi.fn(() => () => {}),
    handlers: {
      onPointerDown: vi.fn(),
      onPointerMove: vi.fn(),
      onPointerUp: vi.fn(),
      onPointerCancel: vi.fn(),
      onLostPointerCapture: vi.fn(),
      onClick: vi.fn(),
      onKeyDown: vi.fn(),
    },
  };
}

function renderLayer({
  motion = fakeMotion(),
  line = '안 보이지~?' as string | undefined,
} = {}) {
  render(
    <PestLayer
      areaRef={createRef<HTMLDivElement>()}
      behavior="roaming"
      mood="smug"
      dizzy={false}
      line={line}
      motion={motion}
    >
      <p>지구가 제일 힘들었던 시기는?</p>
    </PestLayer>,
  );
  return motion;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PestLayer', () => {
  it('풀이 화면은 그대로 보이고, 방해꾼은 2D 그림으로 그린다', () => {
    renderLayer();
    expect(
      screen.getByText('지구가 제일 힘들었던 시기는?'),
    ).toBeInTheDocument();
    expect(screen.getByText('안 보이지~?')).toBeInTheDocument();
    expect(screen.getByTestId('pest-2d')).toBeInTheDocument();
  });

  it('잡는 영역 버튼이 탭·키보드를 움직임 처리로 올린다', async () => {
    const user = userEvent.setup();
    const motion = renderLayer({ line: undefined });
    const button = screen.getByRole('button', { name: '방해꾼 쫓아내기' });

    await user.click(button);
    expect(motion.handlers.onPointerDown).toHaveBeenCalled();
    expect(motion.handlers.onPointerUp).toHaveBeenCalled();
    expect(motion.handlers.onClick).toHaveBeenCalledTimes(1);

    button.focus();
    await user.keyboard('{ArrowLeft}');
    expect(motion.handlers.onKeyDown).toHaveBeenCalled();
    expect(motion.subscribe).toHaveBeenCalled();
  });

  it('프레임마다 위치를 옮기고, 가는 쪽을 보고, 뜨면 길쭉해진다', () => {
    let push: ((frame: unknown) => void) | undefined;
    const motion = fakeMotion();
    motion.subscribe = vi.fn((fn) => {
      push = fn as (frame: unknown) => void;
      return () => {};
    });
    renderLayer({ motion, line: undefined });
    const jelly = screen.getByTestId('pest-2d');
    const figure = jelly.firstElementChild as HTMLElement;
    const area = { width: 360, height: 400 };
    act(() =>
      push?.({ x: 100, y: 200, hop: 0, size: 80, area, facing: -Math.PI / 2 }),
    );
    expect(jelly.style.transform).toBe('translate(60px, 120px)');
    expect(figure.style.transform).toBe('scale(-1, 1)');
    act(() =>
      push?.({ x: 120, y: 200, hop: 12, size: 80, area, facing: Math.PI / 2 }),
    );
    expect(figure.style.transform).toBe('scale(0.95, 1.08)');
  });

  it('표정이 바뀌면 그 표정으로 다시 그린다', () => {
    const areaRef = createRef<HTMLDivElement>();
    const props = {
      areaRef,
      behavior: 'roaming' as const,
      dizzy: false,
      line: undefined,
      motion: fakeMotion(),
    };
    const { rerender, container } = render(
      <PestLayer {...props} mood="idle">
        <p>문제</p>
      </PestLayer>,
    );
    expect(container.querySelector('svg')).toHaveAttribute('data-mood', 'idle');
    rerender(
      <PestLayer {...props} mood="smug">
        <p>문제</p>
      </PestLayer>,
    );
    expect(container.querySelector('svg')).toHaveAttribute('data-mood', 'smug');
  });
});
