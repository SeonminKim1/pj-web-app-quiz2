// 방해꾼을 끌어 본 적이 있는지(localStorage). 한 번 끌어 보면 "날 잡아서 끌어 봐" 안내를 그만한다.
const KEY = 'qp_dragged_pest';

export type DragHint = {
  known: () => boolean;
  learned: () => void;
};

export const browserDragHint: DragHint = {
  known: () => {
    try {
      return globalThis.localStorage?.getItem(KEY) === '1';
    } catch {
      return false;
    }
  },
  learned: () => {
    try {
      globalThis.localStorage?.setItem(KEY, '1');
    } catch {
      // 저장 못 해도 이번 화면에서는 안내를 그친다.
    }
  },
};
