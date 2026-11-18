import type { ReactElement } from 'react';

type AppIconProps = { size?: number };

/** 앱 아이콘(토끼 얼굴). public/icon.svg와 같은 그림을 화면 안에 그린다. 장식이라 보조 기술에는 숨긴다. */
export function AppIcon({ size = 64 }: AppIconProps): ReactElement {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="512" height="512" rx="112" fill="#FF9EBB" />
      <g stroke="#3A2E2E" strokeWidth="14" strokeLinejoin="round">
        <path
          d="M178 250 C150 170 150 70 196 60 C238 52 246 150 236 236 Z"
          fill="#FFF6EC"
        />
        <path
          d="M334 250 C362 170 362 70 316 60 C274 52 266 150 276 236 Z"
          fill="#FFF6EC"
        />
        <ellipse cx="256" cy="320" rx="150" ry="132" fill="#FFF6EC" />
      </g>
      <path
        d="M196 220 C186 160 188 100 200 92 C214 88 222 150 218 214 Z"
        fill="#FFC2D4"
      />
      <path
        d="M316 220 C326 160 324 100 312 92 C298 88 290 150 294 214 Z"
        fill="#FFC2D4"
      />
      <circle cx="204" cy="310" r="17" fill="#3A2E2E" />
      <circle cx="308" cy="310" r="17" fill="#3A2E2E" />
      <circle cx="209" cy="304" r="5" fill="#FFFFFF" />
      <circle cx="313" cy="304" r="5" fill="#FFFFFF" />
      <ellipse cx="170" cy="350" rx="22" ry="13" fill="#FF9EBB" opacity="0.8" />
      <ellipse cx="342" cy="350" rx="22" ry="13" fill="#FF9EBB" opacity="0.8" />
      <path
        d="M244 340 Q256 352 268 340 Q256 334 244 340 Z"
        fill="#E86A93"
        stroke="#3A2E2E"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path
        d="M256 348 V362 M256 362 Q244 374 232 366 M256 362 Q268 374 280 366"
        fill="none"
        stroke="#3A2E2E"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}
