import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Vite 설정. vitest/config의 defineConfig를 써서 테스트 설정도 같은 파일에 둔다.
export default defineConfig({
  plugins: [react()],
  build: {
    // 3D 방해꾼(three.js) 청크는 풀이 화면에서만 따로 받는다(압축 약 134KB). 첫 화면 번들과 무관해 경고 기준을 올린다.
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // .claude/(서브모듈)의 템플릿 테스트 파일을 잡지 않도록 대상 폴더를 한정한다.
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
});
