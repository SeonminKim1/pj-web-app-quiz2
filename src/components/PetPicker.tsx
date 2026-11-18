// 방해꾼 고르기 시트(첫 화면 "방해꾼" 버튼). 고르면 바로 저장하고(설정), 다음 풀이부터 그 동물이 나온다.
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { PEST_ANIMALS, TREAT_NAME, getPestAnimal } from '../lib/pestAnimals.ts';
import { pickLine } from '../lib/pest.ts';
import { playCue } from '../lib/sound.ts';
import type { PetId } from '../types/settings.ts';
import { FeedEffect } from './FeedEffect.tsx';
import { PetPortrait } from './PetPortrait.tsx';
import { TreatIcon } from './TreatIcon.tsx';
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
  // 간식은 무료, 아무 때나. 줄 때마다 먹는 연출을 새로 한다.
  const [fedId, setFedId] = useState(0);
  const [line, setLine] = useState<string>();
  const feed = () => {
    playCue('treat');
    setFedId((n) => n + 1);
    setLine(pickLine({ kind: 'treat', random: Math.random }));
  };
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
        <section className={styles.treat} aria-labelledby="treat-title">
          <span className={styles.treatPet} aria-hidden="true">
            <span key={fedId} className={fedId > 0 ? styles.munch : undefined}>
              <PetPortrait
                animal={current}
                mood={fedId > 0 ? 'happy' : 'idle'}
                size={64}
              />
            </span>
            {fedId > 0 && <FeedEffect key={fedId} animal={current} />}
          </span>
          <div className={styles.treatText}>
            <h3 id="treat-title" className={styles.treatTitle}>
              간식 주기
            </h3>
            <p className={styles.desc} role="status">
              {line ??
                `${getPestAnimal(current).label}가 좋아하는 ${TREAT_NAME[current]}`}
            </p>
          </div>
          <button type="button" className={styles.treatButton} onClick={feed}>
            <TreatIcon animal={current} size={22} />
            주기
          </button>
        </section>
        <button type="button" className={styles.done} onClick={onClose}>
          다 골랐어요
        </button>
      </div>
    </div>
  );
}
