import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PestMotion } from '../hooks/usePestMotion.ts';
import { PestLayer, type LoadPetScene } from './PestLayer.tsx';

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

const failing: LoadPetScene = () => Promise.reject(new Error('no webgl'));

function renderLayer({
  motion = fakeMotion(),
  loadScene = failing,
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
      loadScene={loadScene}
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
  it('풀이 화면은 그대로 보이고, 3D를 못 쓰면 2D 젤리로 그린다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderLayer();
    expect(
      screen.getByText('지구가 제일 힘들었던 시기는?'),
    ).toBeInTheDocument();
    expect(screen.getByText('안 보이지~?')).toBeInTheDocument();
    expect(screen.getByTestId('pest-2d')).toBeInTheDocument();
    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(screen.getByTestId('pest-2d')).toBeInTheDocument();
  });

  it('잡는 영역 버튼이 탭·키보드를 움직임 처리로 올린다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
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

  it('3D 장면이 만들어지면 2D 그림은 내리고, 화면을 떠나면 장면을 정리한다', async () => {
    const dispose = vi.fn();
    const loadScene = (() =>
      Promise.resolve({
        createPetScene: () => ({
          render: vi.fn(),
          resize: vi.fn(),
          dispose,
        }),
      })) as unknown as LoadPetScene;
    const areaRef = createRef<HTMLDivElement>();
    const { unmount } = render(
      <PestLayer
        areaRef={areaRef}
        behavior="roaming"
        mood="idle"
        dizzy={false}
        line={undefined}
        motion={fakeMotion()}
        loadScene={loadScene}
      >
        <p>문제</p>
      </PestLayer>,
    );
    await waitFor(() =>
      expect(screen.queryByTestId('pest-2d')).not.toBeInTheDocument(),
    );
    unmount();
    expect(dispose).toHaveBeenCalled();
  });

  it('그리는 중 WebGL이 끊기면 2D 그림으로 바꾼다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let lost: (() => void) | undefined;
    const loadScene = (() =>
      Promise.resolve({
        createPetScene: ({ onContextLost }: { onContextLost: () => void }) => {
          lost = onContextLost;
          return { render: vi.fn(), resize: vi.fn(), dispose: vi.fn() };
        },
      })) as unknown as LoadPetScene;
    renderLayer({ loadScene, line: undefined });
    await waitFor(() =>
      expect(screen.queryByTestId('pest-2d')).not.toBeInTheDocument(),
    );
    act(() => lost?.());
    expect(screen.getByTestId('pest-2d')).toBeInTheDocument();
  });
});
