import { describe, expect, it } from 'vitest';
import { pestCue } from './usePestSound.ts';

const roaming = { behavior: 'roaming', seated: false, dizzy: false } as const;

describe('방해꾼 효과음', () => {
  it('행동이 바뀐 순간에 맞는 소리를 고른다', () => {
    expect(pestCue(roaming, { ...roaming, behavior: 'fleeing' })).toBe('flee');
    expect(pestCue(roaming, { ...roaming, behavior: 'dragged' })).toBe('grab');
    expect(
      pestCue({ ...roaming, behavior: 'dragged' }, { ...roaming, dizzy: true }),
    ).toBe('drop');
    expect(
      pestCue(
        { ...roaming, behavior: 'covering' },
        { ...roaming, behavior: 'covering', seated: true },
      ),
    ).toBe('plop');
  });

  it('바뀐 게 없거나 가리러 가는 중이면 조용하다', () => {
    expect(pestCue(roaming, roaming)).toBeUndefined();
    expect(
      pestCue(roaming, { ...roaming, behavior: 'covering' }),
    ).toBeUndefined();
    expect(
      pestCue({ ...roaming, dizzy: true }, { ...roaming, dizzy: true }),
    ).toBeUndefined();
  });
});
