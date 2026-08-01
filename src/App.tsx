import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { initThemeAndDirection } from './features/shell/theme';
import { Shell } from './features/shell/Shell';
import { DashboardPage } from './features/shell/DashboardPage';
import { ProgressPage } from './features/shell/ProgressPage';
import { AnalyticsPage } from './features/shell/AnalyticsPage';
import { SettingsPage } from './features/shell/SettingsPage';
import './styles/global.css';

export function App() {
  useEffect(() => {
    useAppStore.getState().rehydrateFromStorage(Date.now());
    const cleanupTheme = initThemeAndDirection();
    return cleanupTheme;
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route index element={<DashboardPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
