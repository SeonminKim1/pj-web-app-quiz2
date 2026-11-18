import type { ReactElement } from 'react';
import type { PestMood } from '../lib/pest.ts';
import type { PetId } from '../types/settings.ts';

type PetPortraitProps = {
  animal: PetId;
  mood?: PestMood;
};

// 앱 색과 맞춘 선·볼·혀. SVG 속성이라 CSS 변수 대신 값을 둔다.
const LINE = '#3a2e2e';
const CHEEK = '#ff9ebb';
const TONGUE = '#e86a93';

// 표정별 눈·입(64×64 좌표). 몸통은 모든 표정이 같다.
function Face({ mood }: { mood: PestMood }): ReactElement {
  switch (mood) {
    case 'smug':
      return (
        <g stroke={LINE} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M19 31 Q24 28 29 31" />
          <path d="M35 31 Q40 28 45 31" />
          <path d="M25 43 Q34 48 41 40" />
        </g>
      );
    case 'taunt':
      return (
        <g>
          <circle cx="24" cy="31" r="3.5" fill={LINE} />
          <path
            d="M35 31 L45 31"
            stroke={LINE}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M24 40 Q32 48 40 40 Z" fill={LINE} />
          <path d="M30 43 Q32 50 36 44 Z" fill={TONGUE} />
        </g>
      );
    case 'sulky':
      return (
        <g stroke={LINE} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M18 25 L28 28" />
          <path d="M46 25 L36 28" />
          <circle cx="24" cy="33" r="2.5" fill={LINE} stroke="none" />
          <circle cx="40" cy="33" r="2.5" fill={LINE} stroke="none" />
          <path d="M26 46 Q32 41 38 46" />
        </g>
      );
    case 'surprised':
      return (
        <g>
          <circle
            cx="24"
            cy="30"
            r="5.5"
            fill="#fff"
            stroke={LINE}
            strokeWidth="2"
          />
          <circle
            cx="40"
            cy="30"
            r="5.5"
            fill="#fff"
            stroke={LINE}
            strokeWidth="2"
          />
          <circle cx="24" cy="30" r="2.5" fill={LINE} />
          <circle cx="40" cy="30" r="2.5" fill={LINE} />
          <ellipse cx="32" cy="44" rx="4" ry="5" fill={LINE} />
        </g>
      );
    case 'idle':
      return (
        <g>
          <circle cx="24" cy="32" r="3.5" fill={LINE} />
          <circle cx="40" cy="32" r="3.5" fill={LINE} />
          <path
            d="M26 41 Q32 46 38 41"
            stroke={LINE}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      );
  }
}

// 동물별 머리 뒤(귀·꼬리)와 머리 색. 얼굴(눈·입)은 모든 동물이 같은 표정을 쓴다.
const HEAD_FILL: Record<PetId, string> = {
  rabbit: '#fff6ec',
  dog: '#e9c9a1',
  cat: '#d6d0e2',
  squirrel: '#d99a62',
};

function Behind({ animal }: { animal: PetId }): ReactElement {
  const fill = HEAD_FILL[animal];
  switch (animal) {
    case 'rabbit':
      return (
        <g stroke={LINE} strokeWidth="2">
          <ellipse cx="23" cy="12" rx="5.5" ry="12" fill={fill} />
          <ellipse cx="41" cy="12" rx="5.5" ry="12" fill={fill} />
          <ellipse cx="23" cy="13" rx="2.5" ry="8" fill={CHEEK} stroke="none" />
          <ellipse cx="41" cy="13" rx="2.5" ry="8" fill={CHEEK} stroke="none" />
        </g>
      );
    case 'dog':
      return <g />;
    case 'cat':
      return (
        <g stroke={LINE} strokeWidth="2" strokeLinejoin="round">
          <path d="M13 26 L16 6 L29 18 Z" fill={fill} />
          <path d="M51 26 L48 6 L35 18 Z" fill={fill} />
          <path d="M17 20 L18 11 L24 17 Z" fill={CHEEK} stroke="none" />
          <path d="M47 20 L46 11 L40 17 Z" fill={CHEEK} stroke="none" />
        </g>
      );
    case 'squirrel':
      return (
        <g stroke={LINE} strokeWidth="2">
          {/* 머리 뒤로 보이는 복슬 꼬리 */}
          <path
            d="M44 40 C62 40 64 14 50 8 C44 6 40 12 46 16 C54 20 50 32 42 32 Z"
            fill="#e8b382"
          />
          <circle cx="17" cy="17" r="6" fill={fill} />
          <circle cx="47" cy="17" r="6" fill={fill} />
        </g>
      );
  }
}

// 머리 위(앞)에 붙는 것: 강아지 처진 귀와 주둥이.
function Front({ animal }: { animal: PetId }): ReactElement | null {
  if (animal !== 'dog') return null;
  return (
    <g stroke={LINE} strokeWidth="2">
      <ellipse
        cx="13"
        cy="33"
        rx="6"
        ry="12"
        fill="#b98a5e"
        transform="rotate(18 13 33)"
      />
      <ellipse
        cx="51"
        cy="33"
        rx="6"
        ry="12"
        fill="#b98a5e"
        transform="rotate(-18 51 33)"
      />
      <ellipse cx="32" cy="45" rx="9" ry="6" fill="#f6e2c8" />
    </g>
  );
}

// 가지고 노는 물건(오른쪽 아래).
function Toy({ animal }: { animal: PetId }): ReactElement {
  switch (animal) {
    case 'rabbit':
      return (
        <g stroke={LINE} strokeWidth="1.5" strokeLinejoin="round">
          <path d="M45 61 L58 47 L61 50 Z" fill="#ff9a4d" />
          <path
            d="M58 47 L57 41 M59 48 L63 44 M58 47 L62 42"
            stroke="#5aa858"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      );
    case 'dog':
      return (
        <g stroke={LINE} strokeWidth="1.5" fill="#fffaf0">
          <rect x="45" y="53" width="12" height="4" rx="2" />
          <circle cx="45" cy="53" r="2.6" />
          <circle cx="45" cy="57.5" r="2.6" />
          <circle cx="57" cy="53" r="2.6" />
          <circle cx="57" cy="57.5" r="2.6" />
        </g>
      );
    case 'cat':
      return (
        <g stroke={LINE} strokeWidth="1.5">
          <circle cx="53" cy="54" r="7" fill={CHEEK} />
          <path
            d="M47 52 Q53 56 59 51 M48 57 Q54 53 58 58"
            fill="none"
            stroke={TONGUE}
          />
        </g>
      );
    case 'squirrel':
      return (
        <g stroke={LINE} strokeWidth="1.5">
          <ellipse cx="53" cy="56" rx="5" ry="6" fill="#c9874a" />
          <path d="M47 52 Q53 46 59 52 Z" fill="#7a5232" />
          <path d="M53 48 L53 45" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
  }
}

/**
 * 방해꾼 동물 2D 그림(직접 그린 인라인 SVG): 머리·귀(동물별), 표정 5개, 가지고 노는 물건.
 * 설정 화면 미리보기와 3D를 못 쓸 때의 대체 그림. 장식이라 보조 기술에는 숨긴다.
 */
export function PetPortrait({
  animal,
  mood = 'idle',
}: PetPortraitProps): ReactElement {
  return (
    <svg
      viewBox="0 0 64 64"
      width="56"
      height="56"
      aria-hidden="true"
      focusable="false"
      data-animal={animal}
    >
      <Behind animal={animal} />
      <circle
        cx="32"
        cy="36"
        r="21"
        fill={HEAD_FILL[animal]}
        stroke={LINE}
        strokeWidth="2"
      />
      <Front animal={animal} />
      <ellipse cx="17" cy="42" rx="4.5" ry="2.8" fill={CHEEK} opacity="0.8" />
      <ellipse cx="47" cy="42" rx="4.5" ry="2.8" fill={CHEEK} opacity="0.8" />
      <g transform="translate(0 2)">
        <Face mood={mood} />
      </g>
      <Toy animal={animal} />
    </svg>
  );
}
