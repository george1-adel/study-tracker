import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Select } from '../../components/Select';
import { NumberInput } from '../../components/NumberInput';
import { Toggle } from '../../components/Toggle';
import { Modal } from '../../components/Modal';
import { Toast } from '../../components/Toast';
import { Ltr } from '../../components/Ltr';
import { requestPermission } from '../../platform/notify';
import { dayKeyFromTimestamp } from '../../domain/time/dayKey';
import { loadState, createMemoryAdapter } from '../../platform/storage';

function isValidDayStartHour(val: number): boolean {
  if (isNaN(val) || !Number.isInteger(val)) return false;
  if (val < 0) return false;
  if (val > 23) return false;
  return true;
}

function isValidVolume(val: number): boolean {
  if (isNaN(val)) return false;
  if (val < 0) return false;
  if (val > 1) return false;
  return true;
}

export function SettingsPage() {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const resetAll = useAppStore((s) => s.resetAll);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success' | 'warning' | 'error'>('info');

  // DayStartHour confirmation modal state
  const [pendingDayStartHour, setPendingDayStartHour] = useState<number | null>(null);
  const [dayStartHourInput, setDayStartHourInput] = useState<string>(String(settings.dayStartHour));

  // Reset modal state
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  // Import preview modal state
  const [importFileText, setImportFileText] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{
    taskCount: number;
    sessionCount: number;
    recovered: boolean;
    valid: boolean;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification permission state
  const [permissionState, setPermissionState] = useState<string>(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return 'blocked-by-browser';
    }
    return Notification.permission;
  });

  useEffect(() => {
    setDayStartHourInput(String(settings.dayStartHour));
  }, [settings.dayStartHour]);

  // Handle Appearance
  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'dark' | 'light';
    updateSettings({ theme: val });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'en' | 'ar';
    updateSettings({ language: val });
  };

  // Handle Day & Week
  const handleDayStartHourInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setDayStartHourInput(rawVal);

    const val = parseInt(rawVal, 10);
    if (isValidDayStartHour(val)) {
      if (val !== settings.dayStartHour) {
        setPendingDayStartHour(val);
      }
    }
  };

  const confirmDayStartHourChange = () => {
    if (pendingDayStartHour !== null) {
      updateSettings({ dayStartHour: pendingDayStartHour });
      setPendingDayStartHour(null);
    }
  };

  const cancelDayStartHourChange = () => {
    setPendingDayStartHour(null);
    setDayStartHourInput(String(settings.dayStartHour));
  };

  const handleWeekStartsOnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = parseInt(e.target.value, 10) as 0 | 1 | 6;
    if (val === 0 || val === 1 || val === 6) {
      updateSettings({ weekStartsOn: val });
    }
  };

  // Handle Goals
  const currentGoalHours = Math.floor(settings.dailyGoalMs / 3600000);
  const currentGoalMins = Math.floor((settings.dailyGoalMs % 3600000) / 60000);
  const [goalHoursInput, setGoalHoursInput] = useState<string>(String(currentGoalHours));
  const [goalMinsInput, setGoalMinsInput] = useState<string>(String(currentGoalMins));

  useEffect(() => {
    setGoalHoursInput(String(Math.floor(settings.dailyGoalMs / 3600000)));
    setGoalMinsInput(String(Math.floor((settings.dailyGoalMs % 3600000) / 60000)));
  }, [settings.dailyGoalMs]);

  const handleGoalHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setGoalHoursInput(rawVal);
    const h = parseInt(rawVal, 10);
    const m = parseInt(goalMinsInput, 10) || 0;
    if (!isNaN(h) && h >= 0 && !isNaN(m) && m >= 0) {
      const totalMs = (h * 60 + m) * 60000;
      if (totalMs > 0) {
        updateSettings({ dailyGoalMs: totalMs });
      }
    }
  };

  const handleGoalMinsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setGoalMinsInput(rawVal);
    const m = parseInt(rawVal, 10);
    const h = parseInt(goalHoursInput, 10) || 0;
    if (!isNaN(m) && m >= 0 && m < 60 && !isNaN(h) && h >= 0) {
      const totalMs = (h * 60 + m) * 60000;
      if (totalMs > 0) {
        updateSettings({ dailyGoalMs: totalMs });
      }
    }
  };

  const currentStreakMinMins = Math.floor(settings.streakMinFocusMs / 60000);
  const [streakMinInput, setStreakMinInput] = useState<string>(String(currentStreakMinMins));

  useEffect(() => {
    setStreakMinInput(String(Math.floor(settings.streakMinFocusMs / 60000)));
  }, [settings.streakMinFocusMs]);

  const handleStreakMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setStreakMinInput(rawVal);
    const m = parseInt(rawVal, 10);
    if (!isNaN(m) && m > 0) {
      updateSettings({ streakMinFocusMs: m * 60000 });
    }
  };

  // Handle Pomodoro
  const [workMinsInput, setWorkMinsInput] = useState<string>(String(settings.pomodoro.workMinutes));
  const [shortBreakMinsInput, setShortBreakMinsInput] = useState<string>(String(settings.pomodoro.shortBreakMinutes));
  const [longBreakMinsInput, setLongBreakMinsInput] = useState<string>(String(settings.pomodoro.longBreakMinutes));
  const [cyclesInput, setCyclesInput] = useState<string>(String(settings.pomodoro.cyclesBeforeLongBreak));

  useEffect(() => {
    setWorkMinsInput(String(settings.pomodoro.workMinutes));
    setShortBreakMinsInput(String(settings.pomodoro.shortBreakMinutes));
    setLongBreakMinsInput(String(settings.pomodoro.longBreakMinutes));
    setCyclesInput(String(settings.pomodoro.cyclesBeforeLongBreak));
  }, [settings.pomodoro]);

  const handleWorkMinsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setWorkMinsInput(rawVal);
    const val = parseInt(rawVal, 10);
    if (!isNaN(val) && val > 0) {
      updateSettings({ pomodoro: { ...settings.pomodoro, workMinutes: val } });
    }
  };

  const handleShortBreakMinsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setShortBreakMinsInput(rawVal);
    const val = parseInt(rawVal, 10);
    if (!isNaN(val) && val > 0) {
      updateSettings({ pomodoro: { ...settings.pomodoro, shortBreakMinutes: val } });
    }
  };

  const handleLongBreakMinsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setLongBreakMinsInput(rawVal);
    const val = parseInt(rawVal, 10);
    if (!isNaN(val) && val > 0) {
      updateSettings({ pomodoro: { ...settings.pomodoro, longBreakMinutes: val } });
    }
  };

  const handleCyclesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setCyclesInput(rawVal);
    const val = parseInt(rawVal, 10);
    if (!isNaN(val) && Number.isInteger(val) && val >= 1) {
      updateSettings({ pomodoro: { ...settings.pomodoro, cyclesBeforeLongBreak: val } });
    }
  };

  // Handle Alerts
  const [volumeInput, setVolumeInput] = useState<string>(String(settings.sound.volume));

  useEffect(() => {
    setVolumeInput(String(settings.sound.volume));
  }, [settings.sound.volume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setVolumeInput(rawVal);
    const val = parseFloat(rawVal);
    if (isValidVolume(val)) {
      updateSettings({ sound: { ...settings.sound, volume: val } });
    }
  };

  const handleRequestNotificationPermission = async () => {
    const result = await requestPermission();
    setPermissionState(result);
  };

  // Handle Export
  const handleExport = () => {
    const store = useAppStore.getState();
    const rawState = store.exportState();
    let prettyState: string;
    try {
      prettyState = JSON.stringify(JSON.parse(rawState), null, 2);
    } catch {
      prettyState = rawState;
    }

    const dayKey = dayKeyFromTimestamp(Date.now(), settings.dayStartHour);
    const filename = `study-tracker-${dayKey}.json`;

    const blob = new Blob([prettyState], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle Import
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const loaded = loadState(createMemoryAdapter(text));
      setImportFileText(text);

      let isStructurallyValid = true;
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed !== 'object' || parsed === null || parsed.schemaVersion !== 1) {
          isStructurallyValid = false;
        }
      } catch {
        isStructurallyValid = false;
      }

      setImportPreview({
        taskCount: loaded.state.tasks.length,
        sessionCount: loaded.state.sessions.length,
        recovered: loaded.recovered,
        valid: isStructurallyValid,
      });
    } catch {
      setToastMessage(t('settings.importError'));
      setToastType('error');
    }
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmImport = () => {
    if (!importFileText) return;
    const store = useAppStore.getState();
    const success = store.importState(importFileText);

    if (success) {
      const countTasks = importPreview?.taskCount ?? 0;
      const countSessions = importPreview?.sessionCount ?? 0;
      setToastMessage(t('settings.importSuccess', { tasks: countTasks, sessions: countSessions }));
      setToastType('success');
    } else {
      setToastMessage(t('settings.importError'));
      setToastType('error');
    }

    setImportFileText(null);
    setImportPreview(null);
  };

  const cancelImport = () => {
    setImportFileText(null);
    setImportPreview(null);
  };

  // Handle Reset
  const confirmReset = () => {
    resetAll();
    setShowResetModal(false);
    setToastMessage(t('toast.dataRecovered')); // Reset complete notification
    setToastType('info');
  };

  return (
    <div className="settings-page">
      <h1 className="settings-page-title">{t('settings.title')}</h1>

      {/* APPEARANCE */}
      <Card className="settings-section">
        <h2 className="settings-section-title">{t('settings.appearance')}</h2>
        <div className="settings-grid">
          <Select
            label={t('settings.theme')}
            value={settings.theme}
            onChange={handleThemeChange}
            options={[
              { value: 'dark', label: t('settings.themeDark') },
              { value: 'light', label: t('settings.themeLight') },
            ]}
          />
          <Select
            label={t('settings.language')}
            value={settings.language}
            onChange={handleLanguageChange}
            options={[
              { value: 'en', label: t('settings.languageEn') },
              { value: 'ar', label: t('settings.languageAr') },
            ]}
          />
        </div>
      </Card>

      {/* DAY + WEEK */}
      <Card className="settings-section">
        <h2 className="settings-section-title">{t('settings.dayAndWeek')}</h2>
        <div className="settings-grid">
          <div>
            <NumberInput
              label={t('settings.dayStartHour')}
              min={0}
              max={23}
              step={1}
              value={dayStartHourInput}
              onChange={handleDayStartHourInputChange}
            />
            <div className="settings-field-hint">{t('settings.dayStartHourHint')}</div>
          </div>
          <Select
            label={t('settings.weekStartsOn')}
            value={String(settings.weekStartsOn)}
            onChange={handleWeekStartsOnChange}
            options={[
              { value: '1', label: t('settings.weekStartsOnMon') },
              { value: '0', label: t('settings.weekStartsOnSun') },
              { value: '6', label: t('settings.weekStartsOnSat') },
            ]}
          />
        </div>
      </Card>

      {/* GOALS */}
      <Card className="settings-section">
        <h2 className="settings-section-title">{t('settings.goals')}</h2>
        <div className="settings-grid">
          <div>
            <div className="select-label">{t('settings.dailyGoal')}</div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <NumberInput
                label={t('settings.dailyGoalHours')}
                min={0}
                max={24}
                value={goalHoursInput}
                onChange={handleGoalHoursChange}
              />
              <NumberInput
                label={t('settings.dailyGoalMinutes')}
                min={0}
                max={59}
                value={goalMinsInput}
                onChange={handleGoalMinsChange}
              />
            </div>
          </div>
          <NumberInput
            label={t('settings.streakMinFocus')}
            min={1}
            value={streakMinInput}
            onChange={handleStreakMinChange}
          />
        </div>
      </Card>

      {/* POMODORO */}
      <Card className="settings-section">
        <h2 className="settings-section-title">{t('settings.pomodoro')}</h2>
        <div className="settings-grid">
          <NumberInput
            label={t('settings.workDuration')}
            min={1}
            value={workMinsInput}
            onChange={handleWorkMinsChange}
          />
          <NumberInput
            label={t('settings.shortBreakDuration')}
            min={1}
            value={shortBreakMinsInput}
            onChange={handleShortBreakMinsChange}
          />
          <NumberInput
            label={t('settings.longBreakDuration')}
            min={1}
            value={longBreakMinsInput}
            onChange={handleLongBreakMinsChange}
          />
          <NumberInput
            label={t('settings.cyclesBeforeLongBreak')}
            min={1}
            step={1}
            value={cyclesInput}
            onChange={handleCyclesChange}
          />
        </div>
        <div className="settings-grid" style={{ marginBlockStart: 'var(--space-2)' }}>
          <Toggle
            label={t('settings.autoStartBreaks')}
            checked={settings.pomodoro.autoStartBreaks}
            onChange={(checked) => updateSettings({ pomodoro: { ...settings.pomodoro, autoStartBreaks: checked } })}
          />
          <Toggle
            label={t('settings.autoStartWork')}
            checked={settings.pomodoro.autoStartWork}
            onChange={(checked) => updateSettings({ pomodoro: { ...settings.pomodoro, autoStartWork: checked } })}
          />
        </div>
      </Card>

      {/* ALERTS */}
      <Card className="settings-section">
        <h2 className="settings-section-title">{t('settings.alerts')}</h2>
        <div className="settings-grid">
          <Toggle
            label={t('settings.soundEnabled')}
            checked={settings.sound.enabled}
            onChange={(checked) => updateSettings({ sound: { ...settings.sound, enabled: checked } })}
          />
          <NumberInput
            label={t('settings.volume')}
            min={0}
            max={1}
            step={0.1}
            value={volumeInput}
            onChange={handleVolumeChange}
          />
        </div>
        <div className="settings-grid" style={{ marginBlockStart: 'var(--space-2)' }}>
          <Toggle
            label={t('settings.notificationsEnabled')}
            checked={settings.notifications.enabled}
            onChange={(checked) => updateSettings({ notifications: { ...settings.notifications, enabled: checked } })}
          />
          <div>
            <div className="select-label">{t('settings.notificationPermission')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBlockStart: 'var(--space-1)' }}>
              <span className="stat-card-value-mono" style={{ fontSize: '14px' }}>
                <Ltr>
                  {permissionState === 'granted'
                    ? t('settings.permissionGranted')
                    : permissionState === 'denied'
                    ? t('settings.permissionDenied')
                    : permissionState === 'default'
                    ? t('settings.permissionDefault')
                    : t('settings.permissionBlocked')}
                </Ltr>
              </span>
              {permissionState === 'default' && (
                <Button variant="secondary" onClick={handleRequestNotificationPermission}>
                  {t('settings.requestPermission')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* DATA */}
      <Card className="settings-section">
        <h2 className="settings-section-title">{t('settings.data')}</h2>
        <div className="settings-data-actions">
          <div>
            <Button variant="secondary" onClick={handleExport}>
              {t('settings.export')}
            </Button>
            <div className="settings-field-hint">{t('settings.exportDesc')}</div>
          </div>
          <div>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              {t('settings.import')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="settings-file-input"
              onChange={handleFileSelect}
            />
            <div className="settings-field-hint">{t('settings.importDesc')}</div>
          </div>
          <div>
            <Button variant="danger" onClick={() => setShowResetModal(true)}>
              {t('settings.reset')}
            </Button>
            <div className="settings-field-hint">{t('settings.resetDesc')}</div>
          </div>
        </div>
      </Card>

      {/* DayStartHour Warn Modal */}
      <Modal
        isOpen={pendingDayStartHour !== null}
        onClose={cancelDayStartHourChange}
        title={t('settings.dayStartHour')}
      >
        <p style={{ marginBlockEnd: 'var(--space-4)', color: 'var(--text-muted)' }}>
          {t('settings.dayStartHourWarn')}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={cancelDayStartHourChange}>
            {t('action.cancel')}
          </Button>
          <Button variant="primary" onClick={confirmDayStartHourChange}>
            {t('action.confirm')}
          </Button>
        </div>
      </Modal>

      {/* Import Preview Modal */}
      <Modal
        isOpen={importPreview !== null}
        onClose={cancelImport}
        title={t('settings.importPreviewTitle')}
      >
        {importPreview && (
          <div>
            {importPreview.recovered || !importPreview.valid ? (
              <p style={{ marginBlockEnd: 'var(--space-4)', color: 'var(--alarm)' }}>
                {t('settings.importPreviewRecovered', {
                  tasks: importPreview.taskCount,
                  sessions: importPreview.sessionCount,
                })}
              </p>
            ) : (
              <p style={{ marginBlockEnd: 'var(--space-4)', color: 'var(--text-muted)' }}>
                {t('settings.importPreviewDetails', {
                  tasks: importPreview.taskCount,
                  sessions: importPreview.sessionCount,
                })}
              </p>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={cancelImport}>
                {t('action.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={confirmImport}
                disabled={!importPreview.valid || importPreview.recovered}
              >
                {t('action.confirm')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reset Confirm Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title={t('settings.resetConfirmTitle')}
      >
        <p style={{ marginBlockEnd: 'var(--space-4)', color: 'var(--text-muted)' }}>
          {t('settings.resetConfirmText')}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setShowResetModal(false)}>
            {t('action.cancel')}
          </Button>
          <Button variant="danger" onClick={confirmReset}>
            {t('action.confirm')}
          </Button>
        </div>
      </Modal>

      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}

export default SettingsPage;
