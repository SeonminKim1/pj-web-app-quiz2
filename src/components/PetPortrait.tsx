/** @jsxRuntime automatic */
// ↑ 빌드 스크립트(tsx, scripts/og/card.ts)도 이 그림을 그린다. tsx가 tsconfig의 jsx 설정을 쓰지 않아 파일에 적어 둔다.
//
// 방해꾼 그림(2D). 모든 동물이 같은 규칙으로 그린다:
// - 머리가 몸보다 훨씬 크고(아기 비율), 몸은 작고 통통하다.
// - 머리는 완벽한 원이 아니라 아래가 살짝 넓은 찹쌀떡 모양.
// - 눈은 얼굴 아래쪽에 크게, 반짝임 두 개. 입은 작게.
// - 선은 검정 대신 짙은 갈색, 볼은 번지는 볼 터치.
// - 한쪽을 살짝 다르게(접힌 귀, 기운 꼬리) 해서 손으로 그린 느낌을 낸다.
// 움직임(깜빡임·숨쉬기·착지)은 PestLayer의 CSS가 data-part를 보고 붙인다.
import { useId, type ReactElement } from 'react';
import type { PestMood } from '../lib/pest.ts';
import type { PetId } from '../types/settings.ts';

type PetPortraitProps = {
  animal: PetId;
  mood?: PestMood;
  /** 얼굴만(앱 아이콘). 몸 아래쪽을 잘라 머리를 크게 보인다. */
  headOnly?: boolean;
  /** 다른 SVG 안에 넣을 때의 자리와 크기(앱 아이콘). */
  x?: number;
  y?: number;
  size?: number;
};

const LINE = '#6b4f4a';
const EYE = '#3a2e2e';
const BLUSH = '#ff8fb1';
const INNER = '#ffc7d6';
const W = 2.5;

type Palette = { top: string; bottom: string; accent: string };

const PALETTE: Record<PetId, Palette> = {
  rabbit: { top: '#ffffff', bottom: '#f3e9e4', accent: INNER },
  dog: { top: '#fdebd0', bottom: '#f2d3a9', accent: '#b8794d' },
  cat: { top: '#ffe3c2', bottom: '#f8c995', accent: '#e9a15f' },
  squirrel: { top: '#f3c491', bottom: '#e2a56f', accent: '#c97f48' },
};

// 머리 가운데(64, 70). 눈 높이 75, 입 85.
const HEAD =
  'M64 40 C88 40 100 56 98 74 C96 92 82 100 64 100 C46 100 32 92 30 74 C28 56 40 40 64 40 Z';
const BODY = 'M46 97 C44 112 52 120 64 120 C76 120 84 112 82 97 Z';

function Eyes({ mood }: { mood: PestMood }): ReactElement {
  const arc = (x: number, up: boolean) => (
    <path
      d={up ? `M${x - 6} 76 q6 -7 12 0` : `M${x - 6} 73 q6 7 12 0`}
      stroke={EYE}
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
  );
  const open = (x: number, scale = 1) => (
    <g>
      <ellipse cx={x} cy="75" rx={6 * scale} ry={7.5 * scale} fill={EYE} />
      <circle cx={x + 2.5} cy="72" r={2.6 * scale} fill="#fff" />
      <circle cx={x - 2} cy="79" r={1.2 * scale} fill="#fff" />
    </g>
  );
  switch (mood) {
    case 'smug':
      return (
        <g>
          {arc(50, true)}
          {arc(78, true)}
        </g>
      );
    case 'taunt':
      // 한쪽 눈 찡긋 + 메롱.
      return (
        <g>
          {open(50)}
          <path
            d="M73 70 l9 5 l-9 5"
            stroke={EYE}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
    case 'sulky':
      // 반쯤 감은 눈 + 안쪽으로 내려간 눈썹.
      return (
        <g>
          <path d="M44 74 h12 a6 6 0 0 1 -12 0 z" fill={EYE} />
          <path d="M72 74 h12 a6 6 0 0 1 -12 0 z" fill={EYE} />
          <path
            d="M43 66 l12 4 M85 66 l-12 4"
            stroke={LINE}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </g>
      );
    case 'surprised':
      return (
        <g data-part="eyes">
          <circle
            cx="50"
            cy="75"
            r="8"
            fill="#fff"
            stroke={EYE}
            strokeWidth="2.5"
          />
          <circle
            cx="78"
            cy="75"
            r="8"
            fill="#fff"
            stroke={EYE}
            strokeWidth="2.5"
          />
          <circle cx="50" cy="76" r="3.2" fill={EYE} />
          <circle cx="78" cy="76" r="3.2" fill={EYE} />
        </g>
      );
    case 'idle':
      return (
        <g data-part="eyes">
          {open(50)}
          {open(78)}
        </g>
      );
  }
}

function Mouth({ mood }: { mood: PestMood }): ReactElement {
  const omega = (
    <path
      d="M58 85 q3 3 6 0 q3 3 6 0"
      stroke={LINE}
      strokeWidth="2.2"
      fill="none"
      strokeLinecap="round"
    />
  );
  switch (mood) {
    case 'smug':
      return (
        <g>
          {omega}
          <path
            d="M65 86.5 q2 6 5 1.5"
            fill={BLUSH}
            stroke={LINE}
            strokeWidth="1.6"
          />
        </g>
      );
    case 'taunt':
      return (
        <g>
          {omega}
          <path
            d="M60.5 87 q3.5 10 7 0"
            fill={BLUSH}
            stroke={LINE}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </g>
      );
    case 'sulky':
      return (
        <path
          d="M59 89 q5 -4 10 0"
          stroke={LINE}
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
      );
    case 'surprised':
      return <ellipse cx="64" cy="88" rx="3.5" ry="4.5" fill={LINE} />;
    case 'idle':
      return omega;
  }
}

function Nose({ animal }: { animal: PetId }): ReactElement {
  switch (animal) {
    case 'dog':
      return <ellipse cx="64" cy="81" rx="4" ry="2.8" fill={EYE} />;
    case 'cat':
      return (
        <path
          d="M61 80 h6 l-3 3 z"
          fill={BLUSH}
          stroke={LINE}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      );
    case 'squirrel':
      return <ellipse cx="64" cy="81" rx="3" ry="2.2" fill="#8a5a3c" />;
    case 'rabbit':
      return (
        <path
          d="M62 81.5 h4"
          stroke={BLUSH}
          strokeWidth="3"
          strokeLinecap="round"
        />
      );
  }
}

/** 머리 뒤: 귀·꼬리. */
function Behind({
  animal,
  fur,
}: {
  animal: PetId;
  fur: string;
}): ReactElement | null {
  const p = PALETTE[animal];
  switch (animal) {
    case 'rabbit':
      // 왼쪽 귀는 쫑긋, 오른쪽 귀는 접힘.
      return (
        <g stroke={LINE} strokeWidth={W} strokeLinejoin="round">
          <path d="M44 46 C38 22 42 6 50 8 C58 10 58 30 56 46 Z" fill={fur} />
          <path
            d="M47 40 C44 24 46 14 50 14 C54 15 54 28 53 40 Z"
            fill={INNER}
            stroke="none"
          />
          <path
            d="M72 44 C74 26 84 16 92 20 C100 24 96 34 84 36 C80 38 78 42 78 46 Z"
            fill={fur}
          />
          <path
            d="M78 38 C80 30 86 24 91 25 C94 27 90 31 84 32 Z"
            fill={INNER}
            stroke="none"
          />
        </g>
      );
    case 'cat':
      return (
        <g stroke={LINE} strokeWidth={W} strokeLinejoin="round">
          <path d="M36 56 L38 26 C40 22 44 22 46 25 L60 42 Z" fill={fur} />
          <path d="M92 56 L91 28 C90 24 86 23 83 26 L68 42 Z" fill={fur} />
          <path d="M41 48 L42 32 L52 42 Z" fill={INNER} stroke="none" />
          <path d="M87 48 L86 33 L76 42 Z" fill={INNER} stroke="none" />
        </g>
      );
    case 'squirrel':
      // 몸 뒤로 크게 말린 복슬 꼬리 + 작은 동그란 귀.
      return (
        <g stroke={LINE} strokeWidth={W} strokeLinejoin="round">
          <path
            d="M80 116 C108 118 122 92 114 66 C108 46 88 44 86 60 C85 70 98 70 100 82 C102 96 90 102 80 104 Z"
            fill={p.accent}
          />
          <path
            d="M98 66 C106 74 108 90 98 100"
            stroke="#f4cf9f"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="42" cy="46" r="9" fill={fur} />
          <circle cx="86" cy="46" r="9" fill={fur} />
          <circle cx="42" cy="47" r="4.5" fill={INNER} stroke="none" />
          <circle cx="86" cy="47" r="4.5" fill={INNER} stroke="none" />
        </g>
      );
    case 'dog':
      return null;
  }
}

/** 머리 앞: 강아지 처진 귀, 고양이 이마 무늬, 다람쥐 볼 무늬. */
function Front({ animal }: { animal: PetId }): ReactElement | null {
  const p = PALETTE[animal];
  switch (animal) {
    case 'dog':
      // 양쪽이 조금 다르게 처진 귀.
      return (
        <g stroke={LINE} strokeWidth={W} strokeLinejoin="round" fill={p.accent}>
          <path d="M40 48 C26 48 20 64 24 80 C26 88 34 88 36 80 C38 70 40 60 46 52 Z" />
          <path d="M88 48 C102 50 108 62 105 76 C103 84 95 85 93 77 C91 68 88 60 82 52 Z" />
        </g>
      );
    case 'cat':
      return (
        <g
          stroke={p.accent}
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M64 44 v8" />
          <path d="M56 46 l2 6" />
          <path d="M72 46 l-2 6" />
        </g>
      );
    case 'squirrel':
      return <ellipse cx="64" cy="86" rx="14" ry="10" fill="#fbe3c4" />;
    case 'rabbit':
      return null;
  }
}

export function PetPortrait({
  animal,
  mood = 'idle',
  headOnly = false,
  x,
  y,
  size = 56,
}: PetPortraitProps): ReactElement {
  // 같은 화면에 여러 장 있어도 그라데이션 id가 겹치지 않게.
  const id = `pet${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const p = PALETTE[animal];
  const fur = `url(#${id}f)`;
  return (
    <svg
      viewBox={headOnly ? '20 2 88 88' : '8 6 116 116'}
      x={x}
      y={y}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      data-animal={animal}
      data-mood={mood}
    >
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.top} />
          <stop offset="1" stopColor={p.bottom} />
        </linearGradient>
        <radialGradient id={`${id}c`}>
          <stop offset="0" stopColor={BLUSH} stopOpacity="0.75" />
          <stop offset="1" stopColor={BLUSH} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="64" cy="120" rx="26" ry="3.5" fill={EYE} opacity="0.1" />
      <g data-part="figure">
        <Behind animal={animal} fur={fur} />
        <path d={BODY} fill={fur} stroke={LINE} strokeWidth={W} />
        <ellipse
          cx="55"
          cy="118"
          rx="6"
          ry="3.5"
          fill="#fff"
          stroke={LINE}
          strokeWidth="2.2"
        />
        <ellipse
          cx="73"
          cy="118"
          rx="6"
          ry="3.5"
          fill="#fff"
          stroke={LINE}
          strokeWidth="2.2"
        />
        <path d={HEAD} fill={fur} stroke={LINE} strokeWidth={W} />
        <Front animal={animal} />
        <circle
          cx="43"
          cy="83"
          r={mood === 'sulky' ? 11 : 9}
          fill={`url(#${id}c)`}
        />
        <circle cx="85" cy="83" r="9" fill={`url(#${id}c)`} />
        <Eyes mood={mood} />
        <Nose animal={animal} />
        <Mouth mood={mood} />
      </g>
    </svg>
  );
}
