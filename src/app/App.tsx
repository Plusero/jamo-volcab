import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { AppProvider } from './AppContext';
import { ErrorBoundary } from './ErrorBoundary';
import { UpdatePrompt } from './UpdatePrompt';
import { TodayPage } from '../features/today/TodayPage';
import { StudyPage } from '../features/study/StudyPage';
import { LibraryPage } from '../features/library/LibraryPage';
import { WordDetailPage } from '../features/word-detail/WordDetailPage';
import { StatisticsPage } from '../features/statistics/StatisticsPage';
import { SettingsPage } from '../features/settings/SettingsPage';

const TABS = [
  { to: '/', label: '今日' },
  { to: '/library', label: '词库' },
  { to: '/stats', label: '统计' },
  { to: '/settings', label: '设置' },
];

export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <HashRouter>
          <div className="app">
            <div className="app-main">
              <Routes>
                <Route path="/" element={<TodayPage />} />
                <Route path="/study" element={<StudyPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/word/:senseId" element={<WordDetailPage />} />
                <Route path="/stats" element={<StatisticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </div>
            <nav className="tabbar">
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
