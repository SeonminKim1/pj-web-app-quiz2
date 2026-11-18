/** @jsxRuntime automatic */
import type { ReactElement } from 'react';
import { PetPortrait } from './PetPortrait.tsx';

type AppIconProps = { size?: number };

/**
 * 앱 아이콘(분홍 바탕 + 방해꾼 토끼 얼굴). public/icon.svg는 이 그림으로 만든다
 * (npx tsx scripts/app-icon.ts). 장식이라 보조 기술에는 숨긴다.
 */
export function AppIcon({ size = 64 }: AppIconProps): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="512" height="512" rx="112" fill="#FF9EBB" />
      <PetPortrait animal="rabbit" headOnly x={36} y={40} size={440} />
    </svg>
  );
}
