/** @jsxRuntime automatic */
// 동물별 간식 그림: 토끼 당근, 강아지 뼈다귀, 고양이 생선, 다람쥐 도토리.
import type { ReactElement } from 'react';
import type { PetId } from '../types/settings.ts';

const LINE = '#6b4f4a';

export function TreatIcon({
  animal,
  size = 24,
}: {
  animal: PetId;
  size?: number;
}): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <g
        stroke={LINE}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {animal === 'rabbit' && (
          <>
            <path d="M8 26 L20 10 C23 8 26 11 24 14 Z" fill="#ff9a4d" />
            <path d="M12 20 l3 2 M15 16 l3 2" fill="none" />
            <path
              d="M22 11 l3 -6 M23 12 l6 -3 M21 10 l0 -6"
              fill="none"
              stroke="#3fa66b"
            />
          </>
        )}
        {animal === 'dog' && (
          <path
            d="M9 10 a3.5 3.5 0 1 1 4 -3 L20 14 a3.5 3.5 0 1 1 3 4 a3.5 3.5 0 1 1 -4 3 L12 14 a3.5 3.5 0 1 1 -3 -4 z"
            fill="#fff6ec"
          />
        )}
        {animal === 'cat' && (
          <>
            <path d="M4 16 C9 9 18 9 23 16 C18 23 9 23 4 16 Z" fill="#8ec5ff" />
            <path d="M23 16 L29 11 L29 21 Z" fill="#8ec5ff" />
            <circle cx="9" cy="15" r="1.2" fill={LINE} stroke="none" />
          </>
        )}
        {animal === 'squirrel' && (
          <>
            <path
              d="M8 14 C8 24 13 28 16 28 C19 28 24 24 24 14 Z"
              fill="#d48c55"
            />
            <path d="M6 14 C6 8 26 8 26 14 Z" fill="#8a5a3c" />
            <path d="M16 9 L17 5" fill="none" />
          </>
        )}
      </g>
    </svg>
  );
}
