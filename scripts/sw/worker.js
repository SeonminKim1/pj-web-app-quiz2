// 서비스 워커 본문. 빌드(scripts/sw.ts)가 앞에 self.SW_CONFIG = { version, precache, assets }를 붙여 dist/sw.js로 쓴다.
// 목표: 홈 화면에 설치하고, 한 번 연 뒤에는 인터넷이 없어도 문제를 풀 수 있게.
//
//   요청                   전략
//   페이지 이동(HTML)      네트워크 먼저 → 실패하면 저장한 같은 페이지 → 앱 껍데기('/')
//   /data/quiz/*           네트워크 먼저 → 실패하면 저장본(앱과 데이터 버전이 어긋나지 않게)
//   /assets/*, /fonts/*,   저장본 먼저 → 없으면 받아서 저장(이름에 해시가 있거나 거의 안 바뀜)
//   /icons/*
//   그 밖(통계·다른 도메인) 손대지 않는다
//
// 진행 상황(localStorage)은 여기서 다루지 않는다. 캐시를 지워도 진행은 그대로다.
const { version, precache, assets } = self.SW_CONFIG;
const SHELL = `qp-shell-${version}`;
const RUNTIME = 'qp-runtime';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) =>
        cache.addAll(
          precache.map((path) => new Request(path, { cache: 'reload' })),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith('qp-shell-') && key !== SHELL)
          await caches.delete(key);
      }
      // 지난 배포의 해시 파일은 버린다(글꼴 조각처럼 이번 배포에도 있는 것은 둔다).
      const runtime = await caches.open(RUNTIME);
      const current = new Set(assets);
      for (const request of await runtime.keys()) {
        const { pathname } = new URL(request.url);
        if (pathname.startsWith('/assets/') && !current.has(pathname)) {
          await runtime.delete(request);
        }
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(page(request));
  } else if (url.pathname.startsWith('/data/quiz/')) {
    event.respondWith(networkFirst(request));
  } else if (/^\/(assets|fonts|icons)\//.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

async function page(request) {
  try {
    const response = await fetch(request);
    // 공유 링크마다 ?s=1&from=…가 달라도 한 페이지로 저장한다.
    if (response.ok) await put(withoutSearch(request.url), response.clone());
    return response;
  } catch (error) {
    // 공유 링크의 ?s=1&from=…가 달라도 같은 페이지로 본다.
    const saved =
      (await caches.match(request, { ignoreSearch: true })) ??
      (await caches.match('/', { cacheName: SHELL }));
    if (saved) return saved;
    throw error;
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) await put(request, response.clone());
    return response;
  } catch (error) {
    const saved = await caches.match(request);
    if (saved) return saved;
    throw error;
  }
}

async function cacheFirst(request) {
  const saved = await caches.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) await put(request, response.clone());
  return response;
}

function withoutSearch(href) {
  const url = new URL(href);
  return `${url.origin}${url.pathname}`;
}

async function put(request, response) {
  try {
    const cache = await caches.open(RUNTIME);
    await cache.put(request, response);
  } catch {
    // 저장 공간이 모자라도 화면은 네트워크 응답으로 계속한다.
  }
}
