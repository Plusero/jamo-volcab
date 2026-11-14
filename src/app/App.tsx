import { lazy, Suspense, useEffect, useRef } from 'react';
import { HashRouter, matchPath, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext';
import { ErrorBoundary } from './ErrorBoundary';
import { UpdatePrompt } from './UpdatePrompt';
import { TodayPage } from '../features/today/TodayPage';

const StudyPage = lazy(() => import('../features/study/StudyPage').then((m) => ({ default: m.StudyPage })));
const LibraryPage = lazy(() => import('../features/library/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const WordDetailPage = lazy(() => import('../features/word-detail/WordDetailPage').then((m) => ({ default: m.WordDetailPage })));
const StatisticsPage = lazy(() => import('../features/statistics/StatisticsPage').then((m) => ({ default: m.StatisticsPage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const TABS = [
  { to: '/', label: '今日' },
  { to: '/library', label: '词库' },
  { to: '/stats', label: '统计' },
  { to: '/settings', label: '设置' },
];

function PageContent() {
  const { pathname } = useLocation();
  const { vocab } = useApp();
  const main = useRef<HTMLElement>(null);
  const word = matchPath('/word/:senseId', pathname);
  const sense = word && vocab.senseById.get(word.params.senseId!);
  const lexeme = sense && vocab.lexemeById.get(sense.lexemeId);
  const title = lexeme ? `${lexeme.lemma} · 词条详情`
    : TABS.find((tab) => tab.to === pathname)?.label ?? (pathname === '/study' ? '学习' : '未找到');

  useEffect(() => {
    document.title = `${title} | Dutch Vocab`;
    main.current!.focus();
  }, [pathname, title]);

  return (
    <main ref={main} id="main-content" className="app-main" tabIndex={-1} aria-label={title}>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/study" element={<StudyPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/word/:senseId" element={<WordDetailPage />} />
        <Route path="/stats" element={<StatisticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<h1>未找到</h1>} />
      </Routes>
    </main>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <HashRouter>
          <div className="app">
            <Suspense fallback={<main className="app-main"><div className="loading">加载中…</div></main>}>
              <PageContent />
            </Suspense>
            <nav className="tabbar" aria-label="主导航">
              {TABS.map((t) => (
                <NavLink key={t.to} to={t.to} end className="tab">{t.label}</NavLink>
              ))}
            </nav>
            <UpdatePrompt />
          </div>
        </HashRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}
