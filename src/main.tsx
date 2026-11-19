import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadGoatCounter } from './lib/analytics.ts';
import { analytics } from './lib/analyticsInstance.ts';
import { unlockMusic } from './lib/music.ts';
import { unlockSound } from './lib/sound.ts';
import siteConfig from '../site.config.json';
import '@fontsource/jua/400.css';
import './index.css';

// 배포 뒤 옛 HTML이 사라진 청크를 부르면 한 번만 새로 고친다(10초 안에 또 나면 그대로 둔다).
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'qp_chunk_reload';
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return; // 기록을 못 하면 무한 새로 고침을 피하려고 새로 고치지 않는다.
  }
  event.preventDefault();
  window.location.reload();
});

// 효과음·배경음악: 첫 탭·키에서 소리 장치를 깨운다(설정이 꺼져 있으면 아무것도 안 함).
for (const type of ['pointerdown', 'keydown'] as const) {
  window.addEventListener(type, unlockSound, { capture: true, passive: true });
  window.addEventListener(type, unlockMusic, { capture: true, passive: true });
}

// 통계: 개발자 제외(?dev=1)·디버그 플래그를 먼저 확인한 뒤에만 스크립트를 부른다.
loadGoatCounter({
  analytics,
  code: siteConfig.GOATCOUNTER_CODE,
  search: window.location.search,
});
analytics.pageview(window.location.pathname);

// 오프라인·설치(PWA): 정식 빌드에서만 서비스 워커를 둔다(dev 서버에는 sw.js가 없다).
// 실패해도 앱은 그대로 돈다. 새 워커는 다음 페이지 이동부터 쓰이므로 화면을 새로 고치지 않는다.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// 엔트리포인트: index.html의 #root에 앱을 붙인다.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
