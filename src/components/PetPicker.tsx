// 방해꾼 고르기 시트(첫 화면 "방해꾼" 버튼). 고르면 바로 저장하고(설정), 다음 풀이부터 그 동물이 나온다.
// 간식은 풀이 화면 놀이터에서만 준다.
import { useEffect, useRef, type ReactElement } from 'react';
import { PEST_ANIMALS } from '../lib/pestAnimals.ts';
import type { PetId } from '../types/settings.ts';
import { PetPortrait } from './PetPortrait.tsx';
import styles from './PetPicker.module.css';

export function PetPicker({
  current,
  onChoose,
  onClose,
}: {
  current: PetId;
  onChoose: (pet: PetId) => void;
  onClose: () => void;
}): ReactElement {
  const selectedRef = useRef<HTMLButtonElement>(null);
  useEffect(() => selectedRef.current?.focus(), []);
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pet-picker-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
      >
        <h2 id="pet-picker-title" className={styles.title}>
          누가 방해할까요?
        </h2>
        <div className={styles.grid} role="radiogroup" aria-label="방해꾼">
          {PEST_ANIMALS.map((animal) => {
            const selected = animal.id === current;
            return (
              <button
                key={animal.id}
                ref={selected ? selectedRef : undefined}
                type="button"
                role="radio"
                aria-checked={selected}
                className={styles.option}
                onClick={() => onChoose(animal.id)}
              >
                <span className={styles.face} aria-hidden="true">
                  <PetPortrait
                    animal={animal.id}
                    mood={selected ? 'smug' : 'idle'}
                    size={72}
                  />
                </span>
                <span className={styles.name}>{animal.label}</span>
                <span className={styles.desc}>{animal.description}</span>
              </button>
            );
          })}
        </div>
        <button type="button" className={styles.done} onClick={onClose}>
          다 골랐어요
        </button>
      </div>
    </div>
  );
}
