// @vitest-environment node
// 앱 이름은 브라우저 탭·홈 화면·안드로이드 런처·공유 미리보기에서 같아야 한다.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { SITE_NAME } from './pages.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

// Value: protects=앱 이름이 index.html 제목·iOS 홈 이름·웹 매니페스트·TWA 런처·OG site_name에서 같다; fails_when=이름을 바꿀 때 한 파일(예: twa-manifest launcherName)만 옛 이름으로 남으면; why_new=이름 변경이 6곳에 흩어졌는데 서로 맞추는 테스트가 없음; seam=none; no_claim=스토어 등록 정보·이미 설치된 앱 이름
it('앱 이름은 index.html·매니페스트·TWA·OG에서 모두 같다', () => {
  expect(SITE_NAME).toBe('게임 놀이터');
  const html = read('index.html');
  expect(html.match(/<title>([^<]*)<\/title>/)?.[1]).toBe(SITE_NAME);
  expect(
    html.match(
      /<meta\s+name="apple-mobile-web-app-title"\s+content="([^"]*)"/,
    )?.[1],
  ).toBe(SITE_NAME);
  const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
    name: string;
    short_name: string;
  };
  expect([manifest.name, manifest.short_name]).toEqual([SITE_NAME, SITE_NAME]);
  const twa = JSON.parse(read('android/twa-manifest.json')) as {
    name: string;
    launcherName: string;
  };
  expect([twa.name, twa.launcherName]).toEqual([SITE_NAME, SITE_NAME]);
});
