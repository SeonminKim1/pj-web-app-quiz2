// 방해꾼 고르기 시트(첫 화면 "방해꾼" 버튼). 고르면 바로 저장하고(설정), 다음 풀이부터 그 동물이 나온다.
// 모자도 여기서 씌운다(설계 D9, 배치 D31): 위에 고른 동물 미리보기(고정), 동물 네 마리 한 줄, 아래 모자 칸만 스크롤.
// 간식은 풀이 화면 놀이터에서만 준다.
import { useEffect, useRef, type ReactElement } from 'react';
import { useModalSheet } from '../hooks/useModalSheet.ts';
import { useProgress } from '../hooks/useProgress.ts';
import { PEST_ANIMALS, getPestAnimal } from '../lib/pestAnimals.ts';
import { hatOf } from '../lib/progress.ts';
import type { PetId } from '../types/settings.ts';
import { ClaimTopics } from './ClaimTopics.tsx';
import { HatRow } from './HatRow.tsx';
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
  const sheetRef = useModalSheet(onClose);
  const selectedRef = useRef<HTMLButtonElement>(null);
  // 시트에 포커스한 다음(useModalSheet) 고른 동물로 옮긴다: 동물 줄에서 바로 화살표·Tab을 쓸 수 있게.
  useEffect(() => selectedRef.current?.focus(), []);
  const { progress } = useProgress();
  const chosen = getPestAnimal(current);
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pet-picker-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.top}>
          <h2 id="pet-picker-title" className={styles.title}>
            누가 방해할까요?
          </h2>
          <div className={styles.preview} aria-hidden="true">
            <PetPortrait
              animal={current}
              hat={hatOf({ progress, pet: current })}
              mood="smug"
              size={96}
            />
          </div>
          <p className={styles.desc}>{chosen.description}</p>
          <div className={styles.animals} role="radiogroup" aria-label="방해꾼">
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
                      hat={hatOf({ progress, pet: animal.id })}
                      mood={selected ? 'smug' : 'idle'}
                      size={48}
                    />
                  </span>
                  <span className={styles.name}>{animal.label}</span>
                </button>
              );
            })}
          </div>
          <h3 className={styles.hatsTitle}>{chosen.label} 모자</h3>
        </div>
        <div className={styles.hats}>
          {/* 열려 있는 동안 모든 주제의 다 푼 판 보상을 기록한다(설계 D29: 목록을 안 연 사용자도 모자가 풀린다). */}
          <ClaimTopics />
          <HatRow animal={current} />
        </div>
        <button type="button" className={styles.done} onClick={onClose}>
          다 골랐어요
        </button>
      </div>
    </div>
  );
}
