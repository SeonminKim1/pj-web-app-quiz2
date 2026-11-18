// 방해꾼 고르기 시트(첫 화면 "방해꾼" 버튼). 고르면 바로 저장하고(설정), 다음 풀이부터 그 동물이 나온다.
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { PEST_ANIMALS, getPestAnimal } from '../lib/pestAnimals.ts';
import { TREAT_MAX, TREAT_PRICE, TREAT_QUESTIONS } from '../lib/progress.ts';
import { playCue } from '../lib/sound.ts';
import type { PetId } from '../types/settings.ts';
import { PetPortrait } from './PetPortrait.tsx';
import styles from './PetPicker.module.css';

export function PetPicker({
  current,
  onChoose,
  onClose,
  gold,
  treats,
  onBuyTreat,
}: {
  current: PetId;
  onChoose: (pet: PetId) => void;
  onClose: () => void;
  gold: number;
  /** 남은 간식 문제 수. */
  treats: number;
  onBuyTreat: () => 'ok' | 'insufficientGold' | 'full';
}): ReactElement {
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [treatNote, setTreatNote] = useState<string>();
  const [fedKey, setFedKey] = useState(0);
  const label = getPestAnimal(current).label;
  const feed = () => {
    const result = onBuyTreat();
    if (result === 'ok') {
      playCue('treat');
      setFedKey((key) => key + 1);
      setTreatNote(`${label}가 냠냠 먹었어요. 맞히는 문제마다 하나씩 먹어요`);
    } else if (result === 'full') {
      setTreatNote(`배불러요. 간식은 ${TREAT_MAX}문제까지만 쌓여요`);
    } else {
      setTreatNote(`골드가 모자라요. 문제를 맞혀 골드를 모아 보세요`);
    }
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
          <span key={fedKey} className={styles.treatPet} aria-hidden="true">
            <PetPortrait
              animal={current}
              mood={fedKey > 0 ? 'smug' : 'idle'}
              size={56}
            />
          </span>
          <div className={styles.treatText}>
            <h3 id="treat-title" className={styles.treatTitle}>
              간식 주기
            </h3>
            <p className={styles.desc}>
              {treats > 0
                ? `얌전히 먹는 중 · ${treats}문제 남음`
                : `${TREAT_QUESTIONS}문제 동안 문제를 안 가려요`}
            </p>
          </div>
          <button
            type="button"
            className={styles.treatButton}
            disabled={
              gold < TREAT_PRICE || treats + TREAT_QUESTIONS > TREAT_MAX
            }
            onClick={feed}
          >
            {TREAT_PRICE}골드
          </button>
          <p className={styles.treatNote} role="status">
            {treatNote}
          </p>
        </section>
        <button type="button" className={styles.done} onClick={onClose}>
          다 골랐어요
        </button>
      </div>
    </div>
  );
}
