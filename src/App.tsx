import type { ReactElement, ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { ProgressStore } from './data/progressRepository.ts';
import type { SettingsStore } from './data/settingsRepository.ts';
import { ProgressContext } from './hooks/progressContext.ts';
import { useProgressState } from './hooks/useProgressState.ts';
import { SettingsContext } from './hooks/settingsContext.ts';
import { useSettingsState } from './hooks/useSettingsState.ts';
import { HomePage } from './pages/HomePage';
import { TopicPage } from './pages/TopicPage.tsx';
import { CategoryPlayPage, StagePlayPage } from './pages/StagePlayPage.tsx';
import { QuestionPage } from './pages/QuestionPage.tsx';
import { PrivacyPage } from './pages/PrivacyPage.tsx';

type ProgressProviderProps = {
  children: ReactNode;
  /** 테스트에서 메모리 저장소를 넣는다. 기본은 브라우저 localStorage. */
  store?: ProgressStore;
};

/** 골드·진행을 앱 전체에 공유한다. */
export function ProgressProvider({
  children,
  store,
}: ProgressProviderProps): ReactElement {
  return (
    <ProgressContext value={useProgressState(store)}>
      {children}
    </ProgressContext>
  );
}

type SettingsProviderProps = {
  children: ReactNode;
  /** 테스트에서 메모리 저장소를 넣는다. 기본은 브라우저 localStorage. */
  store?: SettingsStore;
};

/** 설정(방해꾼 동물 등)을 앱 전체에 공유한다. */
export function SettingsProvider({
  children,
  store,
}: SettingsProviderProps): ReactElement {
  return (
    <SettingsContext value={useSettingsState(store)}>
      {children}
    </SettingsContext>
  );
}

/** 화면 라우트. 테스트는 MemoryRouter로 감싸 원하는 주소에서 시작한다. */
export function AppRoutes(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/topics/:topicId" element={<TopicPage />} />
      <Route
        path="/topics/:topicId/stages/:stageNo"
        element={<StagePlayPage />}
      />
      <Route
        path="/topics/:topicId/categories/:categoryNo"
        element={<CategoryPlayPage />}
      />
      <Route path="/q/:id" element={<QuestionPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** 앱 루트: 최상위 ErrorBoundary, 진행(골드·푼 문제)·설정 공유, 라우팅. */
export function App(): ReactElement {
  return (
    <ErrorBoundary>
      <ProgressProvider>
        <SettingsProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SettingsProvider>
      </ProgressProvider>
    </ErrorBoundary>
  );
}
