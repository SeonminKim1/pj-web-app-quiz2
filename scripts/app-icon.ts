// npx tsx scripts/app-icon.ts   AppIcon 그림으로 public/icon.svg(파비콘)를 다시 만든다.
import { writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppIcon } from '../src/components/AppIcon.tsx';

const svg = renderToStaticMarkup(createElement(AppIcon, { size: 512 })).replace(
  ' aria-hidden="true" focusable="false"',
  '',
);
await writeFile('public/icon.svg', `${svg}\n`);
console.log('public/icon.svg');
