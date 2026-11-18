import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadGoatCounter } from './lib/analytics.ts';
import { analytics } from './lib/analyticsInstance.ts';
import siteConfig from '../site.config.json';
import './index.css';

// 통계: 개발자 제외(?dev=1)·디버그 플래그를 먼저 확인한 뒤에만 스크립트를 부른다.
loadGoatCounter({
  analytics,
  code: siteConfig.GOATCOUNTER_CODE,
  search: window.location.search,
});
analytics.pageview(window.location.pathname);

// 엔트리포인트: index.html의 #root에 앱을 붙인다.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
