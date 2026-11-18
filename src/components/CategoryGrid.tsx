import type { CSSProperties, ReactElement } from 'react';
import type { CategoryCellView } from '../hooks/useCategoryList.ts';
import styles from './CategoryGrid.module.css';

type CategoryGridProps = {
  categories: readonly CategoryCellView[];
  onSelect: (no: number) => void;
};

/** 카테고리 카드 2칸 격자(이름, 5 / 16, 진행 막대, 완료). */
export function CategoryGrid({
  categories,
  onSelect,
}: CategoryGridProps): ReactElement {
  return (
    <ul className={styles.grid}>
      {categories.map((category) => (
        <li key={category.no}>
          <button
            type="button"
            className={styles.cell}
            data-completed={category.completed}
            aria-label={`${category.name}, ${category.total}문제 중 ${category.solvedCount}문제 맞힘${category.completed ? ', 완료' : ''}`}
            onClick={() => onSelect(category.no)}
          >
            <span className={styles.name}>{category.name}</span>
            {category.completed ? (
              <span className={styles.done}>완료</span>
            ) : (
              <>
                <span className={styles.count}>
                  {category.solvedCount} / {category.total}
                </span>
                <span
                  className={styles.bar}
                  style={
                    {
                      '--progress': `${(category.solvedCount / Math.max(1, category.total)) * 100}%`,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                />
              </>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
