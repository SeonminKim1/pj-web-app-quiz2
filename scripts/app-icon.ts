// npx tsx scripts/app-icon.ts   AppIcon 그림으로 파비콘과 PWA 아이콘을 다시 만든다(결과는 커밋한다).
//   public/icon.svg                  파비콘(둥근 모서리)
//   public/icons/icon-192.png, -512  설치 아이콘(purpose any, 둥근 모서리)
//   public/icons/maskable-512.png    안드로이드 모양 맞춤 아이콘(꽉 찬 바탕, 토끼는 가운데 안전 영역 안)
//   public/icons/apple-touch-icon.png  iOS 홈 화면(180, 꽉 찬 바탕. 모서리는 iOS가 깎는다)
//   android/store/play-icon-512.png  플레이스토어 등록 아이콘(512, 꽉 찬 바탕. 모서리는 스토어가 깎는다)
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppIcon } from '../src/components/AppIcon.tsx';
import { PetPortrait } from '../src/components/PetPortrait.tsx';

const BG = '#FF9EBB';

function squareIcon(petSize: number): string {
  // 꽉 찬 바탕에서는 머리만 그리면 잘린 아랫부분이 떠 보여서, 몸 전체 토끼를 가운데에 둔다.
  const x = (512 - petSize) / 2;
  const y = x;
  return renderToStaticMarkup(
    createElement(
      'svg',
      { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 512 512' },
      createElement('rect', { width: 512, height: 512, fill: BG }),
      createElement(PetPortrait, {
        animal: 'rabbit',
        x,
        y,
        size: petSize,
      }),
    ),
  );
}

function png(svg: string, size: number): Uint8Array {
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } })
    .render()
    .asPng();
}

const require = createRequire(import.meta.url);
await initWasm(
  await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')),
);

const rounded = renderToStaticMarkup(
  createElement(AppIcon, { size: 512 }),
).replace(' aria-hidden="true" focusable="false"', '');
// 마스크 안전 영역은 가운데 지름 80% 원. 토끼를 그 안에 넣는다.
const maskable = squareIcon(380);
const apple = squareIcon(440);

await mkdir('public/icons', { recursive: true });
const outputs: [string, string | Uint8Array][] = [
  ['public/icon.svg', `${rounded}\n`],
  ['public/icons/icon-192.png', png(rounded, 192)],
  ['public/icons/icon-512.png', png(rounded, 512)],
  ['public/icons/maskable-512.png', png(maskable, 512)],
  ['public/icons/apple-touch-icon.png', png(apple, 180)],
  ['android/store/play-icon-512.png', png(apple, 512)],
];
for (const [path, data] of outputs) {
  await writeFile(path, data);
  console.log(path);
}
