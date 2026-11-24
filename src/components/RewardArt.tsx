/** @jsxRuntime automatic */
// 보상 그림(인라인 SVG, 직접 그림). 스티커첩 칸, 결과 카드, 모은 스티커 시트가 같이 쓴다.
// 모자는 PetPortrait의 머리 좌표(머리 꼭대기 64, 40)에 맞춰 그려 두어, 동물에게 씌울 때도 같은 그림을 쓴다(T1).
// 색은 src/index.css의 토큰과 같은 값이다(SVG 속성은 CSS 변수를 읽지 못해 값을 적는다).
import type { ReactElement, ReactNode } from 'react';
import type { Reward, RewardColor } from '../lib/rewards.ts';

const LINE = '#6b4f4a';
const W = 2.2;
const WHITE = '#ffffff';
const LEAF = '#7cc49a';
const WOOD = '#c98d5a';
const SAND = '#f6d58e';
const SOIL = '#b9835a';

/** 보상 색: [주 색, 짙은 색]. 토큰 --color-pink, --color-mint, --color-gold(노랑), --color-sky. */
const COLORS: Record<RewardColor, readonly [string, string]> = {
  pink: ['#ff9ebb', '#ff7aa3'],
  mint: ['#9be3cc', '#5fcfab'],
  yellow: ['#ffd66b', '#f5b942'],
  sky: ['#a9d8ff', '#6fb8f0'],
};

type Paint = { main: string; dark: string; color: RewardColor };

// 모자를 스티커로 그릴 때 보이는 영역(모자마다 꽉 차게, 정사각형). 동물에게 씌울 때는 쓰지 않는다.
const HAT_VIEW: Record<string, string> = {
  ribbon: '42 19 44 44',
  straw: '31 4 66 66',
  crown: '44 14 40 40',
  party: '45 10 38 38',
  beanie: '42 9 44 44',
  cap: '45 8 54 54',
  flower: '38 15 52 52',
  tophat: '41 12 46 46',
};

function hat(shape: string, { main, dark, color }: Paint): ReactElement | null {
  switch (shape) {
    case 'ribbon':
      return (
        <g>
          <path
            d="M64 41 C56 32 46 33 47 41 C46 49 56 50 64 41 Z"
            fill={main}
          />
          <path
            d="M64 41 C72 32 82 33 81 41 C82 49 72 50 64 41 Z"
            fill={main}
          />
          <circle cx="64" cy="41" r="4.2" fill={dark} />
        </g>
      );
    case 'straw':
      return (
        <g>
          <ellipse cx="64" cy="44" rx="30" ry="6.5" fill={main} />
          <path
            d="M48 44 C48 30 54 24 64 24 C74 24 80 30 80 44 Z"
            fill={main}
          />
          <path
            d="M48.5 38 C58 40.5 70 40.5 79.5 38 L80 43 C70 45.5 58 45.5 48 43 Z"
            fill={WHITE}
            strokeWidth="1.6"
          />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path
            d="M50 44 L48 28 L56 35 L64 24 L72 35 L80 28 L78 44 Z"
            fill={main}
          />
          <circle cx="64" cy="37" r="2.6" fill={WHITE} strokeWidth="1.4" />
          <circle cx="55" cy="39" r="1.8" fill={WHITE} strokeWidth="1.2" />
          <circle cx="73" cy="39" r="1.8" fill={WHITE} strokeWidth="1.2" />
        </g>
      );
    case 'party':
      return (
        <g>
          <path d="M51 44 L64 17 L77 44 Z" fill={main} />
          <path
            d="M57 32 L70 37 M54 39 L74 44"
            stroke={WHITE}
            strokeWidth="2.6"
          />
          <circle cx="64" cy="17" r="4" fill={WHITE} />
        </g>
      );
    case 'beanie':
      return (
        <g>
          <path
            d="M47 42 C47 28 54 23 64 23 C74 23 81 28 81 42 Z"
            fill={main}
          />
          <rect x="45" y="37" width="38" height="9" rx="4.5" fill={dark} />
          <path d="M53 38 v7 M60 38 v7 M67 38 v7 M74 38 v7" strokeWidth="1.4" />
          <circle cx="64" cy="21" r="5" fill={WHITE} />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path
            d="M75 39 C86 37 94 39 96 44 C88 46 80 45 73 44 Z"
            fill={dark}
          />
          <path
            d="M48 43 C48 29 55 24 64 24 C73 24 80 29 80 43 Z"
            fill={main}
          />
          <path d="M64 24 V43" strokeWidth="1.4" />
          <circle cx="64" cy="24" r="2.2" fill={dark} />
        </g>
      );
    case 'flower': {
      const centers: [number, number][] = [
        [45, 44],
        [54, 39],
        [64, 37],
        [74, 39],
        [83, 44],
      ];
      const middle = color === 'yellow' ? WHITE : '#ffd66b';
      return (
        <g>
          <path
            d="M42 46 C50 38 78 38 86 46"
            stroke={LEAF}
            strokeWidth="3"
            fill="none"
          />
          {centers.map(([x, y]) => (
            <g key={x}>
              {[0, 72, 144, 216, 288].map((angle) => (
                <circle
                  key={angle}
                  cx={x + 3.4 * Math.cos((angle * Math.PI) / 180)}
                  cy={y + 3.4 * Math.sin((angle * Math.PI) / 180)}
                  r="2.8"
                  fill={main}
                  strokeWidth="1.2"
                />
              ))}
              <circle cx={x} cy={y} r="2" fill={middle} strokeWidth="1" />
            </g>
          ))}
        </g>
      );
    }
    case 'tophat':
      return (
        <g>
          <ellipse cx="64" cy="44" rx="21" ry="5" fill={dark} />
          <rect x="52" y="20" width="24" height="24" rx="3" fill={main} />
          <rect
            x="52"
            y="35"
            width="24"
            height="5"
            fill={WHITE}
            strokeWidth="1.6"
          />
        </g>
      );
    default:
      return null;
  }
}

function item(shape: string, { main, dark }: Paint): ReactElement | null {
  switch (shape) {
    case 'yarn':
      return (
        <g>
          <path d="M46 46 C56 52 54 60 44 59" fill="none" />
          <circle cx="30" cy="32" r="20" fill={main} />
          <path
            d="M14 26 C26 30 36 22 44 14 M12 36 C28 40 42 32 49 22 M17 47 C30 48 44 42 50 34"
            stroke={dark}
            fill="none"
          />
        </g>
      );
    case 'bone':
      return (
        <g transform="rotate(-30 32 32)">
          <circle cx="15" cy="27" r="6" fill={main} />
          <circle cx="15" cy="37" r="6" fill={main} />
          <circle cx="49" cy="27" r="6" fill={main} />
          <circle cx="49" cy="37" r="6" fill={main} />
          <rect
            x="14"
            y="26"
            width="36"
            height="12"
            rx="5"
            fill={main}
            stroke="none"
          />
          <path d="M18 26 H46 M18 38 H46" />
        </g>
      );
    case 'ball':
      return (
        <g>
          <circle cx="32" cy="32" r="21" fill={main} />
          <path
            d="M32 11 C42 22 42 42 32 53 C22 42 22 22 32 11 Z"
            fill={WHITE}
          />
          <path d="M11.5 30 C22 26 42 26 52.5 30" fill="none" stroke={dark} />
          <circle cx="32" cy="32" r="21" fill="none" />
        </g>
      );
    case 'pot':
      return (
        <g>
          <path d="M32 34 V20" stroke={LEAF} strokeWidth="3" />
          <path
            d="M32 28 C26 26 24 22 25 20 C29 21 31 24 32 28 Z"
            fill={LEAF}
          />
          {[0, 72, 144, 216, 288].map((angle) => (
            <circle
              key={angle}
              cx={32 + 5 * Math.cos((angle * Math.PI) / 180)}
              cy={14 + 5 * Math.sin((angle * Math.PI) / 180)}
              r="4"
              fill={WHITE}
            />
          ))}
          <circle cx="32" cy="14" r="3" fill="#ffd66b" />
          <path d="M20 40 L44 40 L40 57 L24 57 Z" fill={main} />
          <rect x="17" y="35" width="30" height="7" rx="2.5" fill={dark} />
        </g>
      );
    case 'mushroom':
      return (
        <g>
          <rect x="25" y="32" width="14" height="22" rx="5" fill="#fff3e0" />
          <path d="M9 36 C9 14 55 14 55 36 Z" fill={main} />
          <circle cx="22" cy="27" r="3.5" fill={WHITE} strokeWidth="1.4" />
          <circle cx="36" cy="22" r="4" fill={WHITE} strokeWidth="1.4" />
          <circle cx="45" cy="31" r="2.8" fill={WHITE} strokeWidth="1.4" />
        </g>
      );
    case 'balloon':
      return (
        <g>
          <path d="M32 44 C27 50 37 54 32 61" fill="none" />
          <ellipse cx="32" cy="25" rx="15" ry="18" fill={main} />
          <path d="M29 43 L35 43 L32 47 Z" fill={dark} />
          <ellipse
            cx="25"
            cy="18"
            rx="3.5"
            ry="5.5"
            fill={WHITE}
            stroke="none"
            opacity="0.7"
          />
        </g>
      );
    case 'kite':
      return (
        <g>
          <path d="M32 48 C27 54 37 56 32 62" fill="none" />
          <path
            d="M28 54 l4 2 l-4 2 Z M36 57 l-4 2 l4 2 Z"
            fill={dark}
            strokeWidth="1.2"
          />
          <path d="M32 6 L49 27 L32 48 L15 27 Z" fill={main} />
          <path d="M32 6 V48 M15 27 H49" stroke={dark} />
        </g>
      );
    default:
      return null;
  }
}

function big(shape: string): ReactElement | null {
  switch (shape) {
    case 'slide':
      return (
        <g>
          <path
            d="M14 58 V16 M24 58 V16 M14 26 H24 M14 36 H24 M14 46 H24"
            strokeWidth="2.6"
          />
          <rect x="12" y="12" width="14" height="6" rx="2" fill={WOOD} />
          <path
            d="M24 14 C34 14 38 22 44 36 C49 48 54 52 60 52 L60 58 C50 58 44 52 39 40 C34 28 30 21 24 21 Z"
            fill="#ff9ebb"
          />
        </g>
      );
    case 'swing':
      return (
        <g>
          <path
            d="M8 58 L16 10 L48 10 L56 58"
            fill="none"
            stroke={WOOD}
            strokeWidth="4"
          />
          <path d="M8 58 L16 10 L48 10 L56 58" fill="none" strokeWidth="1.2" />
          <path d="M26 10 V42 M38 10 V42" strokeWidth="1.6" />
          <rect x="22" y="41" width="20" height="6" rx="3" fill="#a9d8ff" />
        </g>
      );
    case 'tent':
      return (
        <g>
          <path d="M6 54 L32 12 L58 54 Z" fill="#9be3cc" />
          <path d="M32 12 L24 54 H40 Z" fill="#5fcfab" />
          <path
            d="M32 12 L32 6 L40 9 L32 11"
            fill="#ff9ebb"
            strokeWidth="1.6"
          />
          <path d="M4 56 H60" />
        </g>
      );
    case 'sandcastle':
      return (
        <g>
          <path d="M8 58 H56 V36 H8 Z" fill={SAND} />
          <path d="M14 36 V22 H24 V36 M40 36 V22 H50 V36" fill={SAND} />
          <path
            d="M14 22 v-4 h3 v4 M21 22 v-4 h3 v4 M40 22 v-4 h3 v4 M47 22 v-4 h3 v4"
            fill={SAND}
            strokeWidth="1.6"
          />
          <path d="M27 36 V28 H37 V36" fill={SAND} />
          <path d="M28 58 V48 C28 44 36 44 36 48 V58" fill={WOOD} />
          <path d="M32 28 V14 L40 17 L32 20" fill="#ff9ebb" strokeWidth="1.6" />
        </g>
      );
    case 'acorn-tree':
      return (
        <g>
          <rect x="27" y="36" width="10" height="22" rx="3" fill={WOOD} />
          <path
            d="M10 34 C6 18 20 6 32 8 C46 6 58 18 54 34 C52 42 12 42 10 34 Z"
            fill={LEAF}
          />
          {[
            [22, 26],
            [38, 20],
            [44, 32],
          ].map(([x, y]) => (
            <g key={x}>
              <ellipse
                cx={x}
                cy={y! + 3}
                rx="3.6"
                ry="4.4"
                fill="#d9a066"
                strokeWidth="1.4"
              />
              <path
                d={`M${x! - 4.5} ${y} h9 a4.5 3 0 0 0 -9 0`}
                fill="#8a5a3c"
                strokeWidth="1.4"
              />
            </g>
          ))}
        </g>
      );
    case 'carrot-patch':
      return (
        <g>
          <path d="M4 58 C8 44 56 44 60 58 Z" fill={SOIL} />
          {[16, 32, 48].map((x) => (
            <g key={x}>
              <path
                d={`M${x} 46 C${x - 6} 38 ${x - 6} 30 ${x - 3} 28 C${x - 1} 34 ${x} 40 ${x} 46 Z`}
                fill={LEAF}
                strokeWidth="1.6"
              />
              <path
                d={`M${x} 46 C${x + 6} 38 ${x + 6} 30 ${x + 3} 28 C${x + 1} 34 ${x} 40 ${x} 46 Z`}
                fill={LEAF}
                strokeWidth="1.6"
              />
              <path
                d={`M${x - 5} 46 h10 l-5 9 Z`}
                fill="#ffa055"
                strokeWidth="1.6"
              />
            </g>
          ))}
        </g>
      );
    case 'seesaw':
      return (
        <g>
          <path d="M24 56 L32 40 L40 56 Z" fill={WOOD} />
          <rect
            x="4"
            y="34"
            width="56"
            height="7"
            rx="3"
            fill="#ffd66b"
            transform="rotate(-12 32 37)"
          />
          <rect
            x="8"
            y="34"
            width="6"
            height="10"
            rx="2"
            fill="#ff9ebb"
            transform="rotate(-12 32 37)"
          />
          <rect
            x="50"
            y="34"
            width="6"
            height="10"
            rx="2"
            fill="#ff9ebb"
            transform="rotate(-12 32 37)"
          />
          <path d="M4 58 H60" />
        </g>
      );
    case 'fountain':
      return (
        <g>
          <path
            d="M32 30 C26 16 16 14 12 22 M32 30 C38 16 48 14 52 22 M32 30 V10"
            fill="none"
            stroke="#6fb8f0"
            strokeWidth="3"
          />
          <rect x="28" y="30" width="8" height="12" fill="#e9dfd8" />
          <path d="M6 42 H58 L54 56 H10 Z" fill="#e9dfd8" />
          <path d="M10 44 H54" stroke="#a9d8ff" strokeWidth="3" />
        </g>
      );
    case 'treehouse':
      return (
        <g>
          <rect x="28" y="30" width="8" height="28" rx="2" fill={WOOD} />
          <path d="M8 26 C4 12 18 4 32 6 C46 4 60 12 56 26 Z" fill={LEAF} />
          <rect x="16" y="24" width="32" height="16" fill="#ffd66b" />
          <path d="M12 26 L32 14 L52 26 Z" fill="#ff9ebb" />
          <rect x="28" y="30" width="8" height="10" fill={WOOD} />
          <path
            d="M20 40 V58 M24 40 V58 M20 46 H24 M20 52 H24"
            strokeWidth="1.6"
          />
        </g>
      );
    case 'pond':
      return (
        <g>
          <ellipse cx="32" cy="40" rx="28" ry="14" fill="#a9d8ff" />
          <path
            d="M14 40 C20 37 26 43 32 40 C38 37 44 43 50 40"
            fill="none"
            stroke={WHITE}
            strokeWidth="2"
          />
          <path
            d="M38 34 a7 4 0 1 0 6 -3 l-3 3 Z"
            fill={LEAF}
            strokeWidth="1.6"
          />
          <circle cx="22" cy="44" r="3" fill="#ff9ebb" strokeWidth="1.4" />
        </g>
      );
    case 'rainbow':
      return (
        <g fill="none" strokeLinecap="round">
          {[
            ['#ff9ebb', 26],
            ['#ffd66b', 21],
            ['#9be3cc', 16],
            ['#a9d8ff', 11],
          ].map(([color, r]) => (
            <path
              key={color}
              d={`M${32 - Number(r)} 46 A${r} ${r} 0 0 1 ${32 + Number(r)} 46`}
              stroke={String(color)}
              strokeWidth="5"
            />
          ))}
          <path
            d="M2 50 C2 42 12 40 14 44 C18 40 26 44 22 50 Z M42 50 C40 44 48 40 52 44 C56 40 64 44 62 50 Z"
            fill={WHITE}
            stroke={LINE}
            strokeWidth={W}
          />
        </g>
      );
    default:
      return null;
  }
}

function paintOf(reward: Reward): Paint {
  const color = reward.color ?? 'pink';
  return { main: COLORS[color][0], dark: COLORS[color][1], color };
}

// 보상 그림의 선(색·굵기·이음). 모자 경로 대부분은 선을 이 묶음에서 받는다.
function Outlined({ children }: { children: ReactNode }): ReactElement {
  return (
    <g
      stroke={LINE}
      strokeWidth={W}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {children}
    </g>
  );
}

/**
 * 동물에게 씌우는 모자(PetPortrait의 머리 좌표, 설계 T1). 모자가 아닌 보상이면 아무것도 그리지 않는다.
 * PetPortrait는 이것만 쓰고 색·선은 여기서 정한다.
 */
export function HatShape({ reward }: { reward: Reward }): ReactElement | null {
  if (reward.kind !== 'hat') return null;
  return (
    <g data-part="hat" data-reward={reward.id}>
      <Outlined>{hat(reward.shape, paintOf(reward))}</Outlined>
    </g>
  );
}

/** 보상 그림. 장식이라 보조 기술에는 숨긴다(이름은 쓰는 쪽이 글자로 준다). */
export function RewardArt({
  reward,
  size = 56,
}: {
  reward: Reward;
  size?: number;
}): ReactElement {
  const paint = paintOf(reward);
  const drawing =
    reward.kind === 'hat'
      ? hat(reward.shape, paint)
      : reward.kind === 'item'
        ? item(reward.shape, paint)
        : big(reward.shape);
  return (
    <svg
      viewBox={
        reward.kind === 'hat'
          ? (HAT_VIEW[reward.shape] ?? '30 12 68 40')
          : '0 0 64 64'
      }
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      data-reward={reward.id}
    >
      <Outlined>{drawing}</Outlined>
    </svg>
  );
}
