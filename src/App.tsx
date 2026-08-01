import { t } from './i18n';
import './styles/global.css';
import './App.css';

export function App() {
  return (
    <main className="app-container">
      <div className="card">
        <h1 className="app-title">{t('app.name')}</h1>
      </div>
    </main>
  );
}

export default App;
