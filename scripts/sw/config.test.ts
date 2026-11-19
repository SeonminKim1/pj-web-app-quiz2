import { describe, expect, it } from 'vitest';
import { buildSwConfig, swSource } from './config.ts';

const FILES = [
  { path: '/index.html', hash: 'h1' },
  { path: '/manifest.webmanifest', hash: 'h2' },
  { path: '/icon.svg', hash: 'h3' },
  { path: '/icons/icon-192.png', hash: 'h4' },
  { path: '/assets/index-abc.js', hash: 'h5' },
  { path: '/assets/index-abc.css', hash: 'h6' },
  { path: '/assets/jua-1-400-normal-x.woff2', hash: 'h7' },
  { path: '/data/quiz/manifest.json', hash: 'h8' },
  { path: '/data/quiz/nonsense.json', hash: 'h9' },
  { path: '/fonts/pretendard/pretendard.css', hash: 'h10' },
  { path: '/fonts/pretendard/Pretendard-Bold.subset.0.woff2', hash: 'h11' },
  { path: '/q/7/index.html', hash: 'h12' },
  { path: '/og/7-aaaa.png', hash: 'h13' },
  { path: '/count.js', hash: 'h14' },
];

describe('buildSwConfig', () => {
  it('앱 껍데기·코드·문제 데이터만 미리 받고, 껍데기는 /로 받는다', () => {
    expect(buildSwConfig(FILES).precache).toEqual([
      '/assets/index-abc.css',
      '/assets/index-abc.js',
      '/data/quiz/manifest.json',
      '/data/quiz/nonsense.json',
      '/fonts/pretendard/pretendard.css',
      '/icon.svg',
      '/icons/icon-192.png',
      '/',
      '/manifest.webmanifest',
    ]);
  });

  it('이번 배포의 /assets/ 파일을 모두 알려 준다(글꼴 조각 포함)', () => {
    expect(buildSwConfig(FILES).assets).toEqual([
      '/assets/index-abc.css',
      '/assets/index-abc.js',
      '/assets/jua-1-400-normal-x.woff2',
    ]);
  });

  it('미리 받는 파일이 바뀔 때만 버전이 바뀐다', () => {
    const base = buildSwConfig(FILES).version;
    expect(buildSwConfig([...FILES].reverse()).version).toBe(base);
    expect(
      buildSwConfig(
        FILES.map((f) =>
          f.path === '/q/7/index.html' ? { ...f, hash: 'x' } : f,
        ),
      ).version,
    ).toBe(base);
    expect(
      buildSwConfig(
        FILES.map((f) =>
          f.path === '/data/quiz/nonsense.json' ? { ...f, hash: 'x' } : f,
        ),
      ).version,
    ).not.toBe(base);
  });

  it('index.html이 없으면 멈춘다', () => {
    expect(() =>
      buildSwConfig(FILES.filter((f) => f.path !== '/index.html')),
    ).toThrow(/index\.html/);
  });
});

describe('swSource', () => {
  it('설정을 워커 본문 앞에 붙인다', () => {
    const source = swSource(
      { version: 'v', precache: ['/'], assets: [] },
      'const x = self.SW_CONFIG;\n',
    );
    expect(source).toBe(
      'self.SW_CONFIG = {"version":"v","precache":["/"],"assets":[]};\nconst x = self.SW_CONFIG;\n',
    );
  });
});
