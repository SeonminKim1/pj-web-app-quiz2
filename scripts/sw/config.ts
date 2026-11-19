// 서비스 워커 설정 만들기. 순수 함수: dist 파일 목록(경로·내용 해시)을 받아 미리 받을 목록과 버전을 정한다.
import { createHash } from 'node:crypto';

export type DistFile = { path: string; hash: string };

export type SwConfig = {
  /** 미리 받을 파일 내용이 바뀌면 바뀐다(새 워커 설치 → 옛 캐시 정리). */
  version: string;
  /** 설치 때 받아 두는 파일. 첫 화면과 문제 풀이에 꼭 필요한 것만(오프라인 플레이). */
  precache: string[];
  /** 이번 배포의 /assets/ 파일 전부. 지난 배포의 해시 파일을 지울 때 쓴다. */
  assets: string[];
};

// 공유 페이지(/q/), OG 카드(/og/), 글꼴 조각, 옛 브라우저용 .woff는 미리 받지 않는다(쓸 때 저장).
const PRECACHE = [
  /^\/index\.html$/,
  /^\/manifest\.webmanifest$/,
  /^\/icon\.svg$/,
  /^\/icons\/[^/]+\.png$/,
  /^\/assets\/[^/]+\.(js|css)$/,
  /^\/data\/quiz\/[^/]+\.json$/,
  /^\/fonts\/pretendard\/pretendard\.css$/,
];

export function buildSwConfig(files: readonly DistFile[]): SwConfig {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const picked = sorted.filter((file) =>
    PRECACHE.some((pattern) => pattern.test(file.path)),
  );
  if (!picked.some((file) => file.path === '/index.html')) {
    throw new Error('dist/index.html이 없어요. vite build를 먼저 돌리세요');
  }
  const version = createHash('sha256')
    .update(picked.map((file) => `${file.path} ${file.hash}`).join('\n'))
    .digest('hex')
    .slice(0, 12);
  return {
    version,
    // 앱 껍데기는 '/'로 받는다(오프라인 페이지 이동이 이 주소로 돌아간다).
    precache: picked.map((file) =>
      file.path === '/index.html' ? '/' : file.path,
    ),
    assets: sorted
      .map((file) => file.path)
      .filter((path) => path.startsWith('/assets/')),
  };
}

/** dist/sw.js 내용: 설정 한 줄 + 워커 본문. */
export function swSource(config: SwConfig, worker: string): string {
  return `self.SW_CONFIG = ${JSON.stringify(config)};\n${worker}`;
}
