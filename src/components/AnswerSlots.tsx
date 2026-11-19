import type { CSSProperties, ReactElement } from 'react';
import type { PlayPhase } from '../hooks/useStagePlay.ts';
import type { AnswerSlots as AnswerSlotsModel } from '../lib/answer.ts';
import styles from './AnswerSlots.module.css';

type AnswerSlotsProps = {
  slots: AnswerSlotsModel;
  phase: PlayPhase;
};

/**
 * 글자 칸: 입력창에 쓴 글자를 어절별 칸에 비춰 보여 주기만 한다.
 * 같은 정보(글자 수)는 입력창 설명 문구가 읽어 주므로 보조 기술에는 숨긴다.
 */
export function AnswerSlots({ slots, phase }: AnswerSlotsProps): ReactElement {
  // 정답 연출에서 칸이 왼쪽부터 차례로 뒤집히도록, 어절마다 시작 번호를 미리 센다.
  const starts = slots.groups.map((_, groupIndex) =>
    slots.groups
      .slice(0, groupIndex)
      .reduce((sum, group) => sum + group.length, 0),
  );
  return (
    <div className={styles.slots} data-phase={phase} aria-hidden="true">
      {slots.groups.map((group, groupIndex) => (
        <span key={groupIndex} className={styles.word}>
          {group.map((char, index) => (
            <span
              key={index}
              className={styles.slot}
              data-filled={char !== undefined}
              style={{ '--i': starts[groupIndex]! + index } as CSSProperties}
            >
              {char}
            </span>
          ))}
        </span>
      ))}
      {slots.overflow > 0 && (
        <span className={styles.overflow}>+{slots.overflow}</span>
      )}
    </div>
  );
}
