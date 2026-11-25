import React, { useRef, useState } from 'react';
import {
  Download,
  Moon,
  RotateCcw,
  Save,
  Smartphone,
  Sun,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useTravel } from '../context/TravelContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';
import type { CurrencyCode, DateFormatOption } from '../types/travel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PWAInstallModal } from '../components/ui/PWAInstallModal';

const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];
const DATE_FORMATS: DateFormatOption[] = ['MMM d, yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd'];
const LANGUAGES = ['English (US)', 'English (UK)', 'Japanese', 'Spanish', 'French'];

export const SettingsPage: React.FC = () => {
  const {
    preferences,
    updatePreferences,
    exportWorkspaceJSON,
    importWorkspaceJSON,
    resetAllData,
    showToast,
  } = useTravel();

  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [userName, setUserName] = useState(preferences.userName);
  const [userEmail, setUserEmail] = useState(preferences.userEmail);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      showToast('Name cannot be empty.', 'error');
      return;
    }
    updatePreferences({
      userName: userName.trim(),
      userEmail: userEmail.trim(),
    });
    showToast('Profile settings saved');
  };

  const handleExport = () => {
    const json = exportWorkspaceJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travel-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported Travel Planner backup');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (typeof reader.result === 'string') {
          await importWorkspaceJSON(reader.result);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to import JSON backup', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleInstallAction = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'accepted') {
        showToast('Travel Planner installed');
      }
    } else {
      setInstallModalOpen(true);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Profile Information */}
      <section className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
        <h2 className="text-base font-bold text-[#172B42] dark:text-white">Profile Information</h2>
        <p className="mt-0.5 text-xs text-[#718096] dark:text-slate-400">
          Personalize your local traveler profile shown in the dashboard and exports.
        </p>

        <form onSubmit={handleSaveProfile} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="set-name" className="block text-xs font-semibold mb-1">
              Full Name
            </label>
            <input
              id="set-name"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-[#F5F8FC] dark:bg-slate-800 px-3.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="set-email" className="block text-xs font-semibold mb-1">
              Email Address
            </label>
            <input
              id="set-email"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-[#F5F8FC] dark:bg-slate-800 px-3.5 text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-4 text-sm font-semibold text-white"
            >
              <Save className="h-4 w-4" />
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </section>

      {/* Personal Preferences & Theme */}
      <section className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-[#172B42] dark:text-white">Personal Preferences</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="set-currency" className="block text-xs font-semibold mb-1">
              Default Currency
            </label>
            <select
              id="set-currency"
              value={preferences.currency}
              onChange={(e) => {
                updatePreferences({ currency: e.target.value as CurrencyCode });
                showToast(`Default currency set to ${e.target.value}`, 'info');
              }}
              className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-[#F5F8FC] dark:bg-slate-800 px-3 text-sm"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="set-datefmt" className="block text-xs font-semibold mb-1">
              Date Format
            </label>
            <select
              id="set-datefmt"
              value={preferences.dateFormat}
              onChange={(e) => {
                updatePreferences({ dateFormat: e.target.value as DateFormatOption });
                showToast('Date format updated', 'info');
              }}
              className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-[#F5F8FC] dark:bg-slate-800 px-3 text-sm"
            >
              {DATE_FORMATS.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="set-lang" className="block text-xs font-semibold mb-1">
              Language
            </label>
            <select
              id="set-lang"
              value={preferences.language}
              onChange={(e) => {
                updatePreferences({ language: e.target.value });
                showToast('Language preference saved', 'info');
              }}
              className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-[#F5F8FC] dark:bg-slate-800 px-3 text-sm"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-[#E5ECF3] dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold">Appearance Theme</p>
            <p className="text-xs text-[#718096] dark:text-slate-400">
              Switch between crisp daylight Light mode and Dark mode.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-[#E5ECF3] dark:border-slate-700 p-1 bg-[#F5F8FC] dark:bg-slate-800">
            <button
              type="button"
              onClick={() => updatePreferences({ theme: 'light' })}
              className={`min-h-[36px] inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                preferences.theme === 'light'
                  ? 'bg-white text-[#172B42] shadow-xs'
                  : 'text-[#718096]'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              Light
            </button>
            <button
              type="button"
              onClick={() => updatePreferences({ theme: 'dark' })}
              className={`min-h-[36px] inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                preferences.theme === 'dark'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-[#718096]'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              Dark
            </button>
          </div>
        </div>
      </section>

      {/* Notification Preferences */}
      <section className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-3">
        <h2 className="text-base font-bold text-[#172B42] dark:text-white">Notification Preferences</h2>

        <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
          <div>
            <span className="block text-sm font-medium">In-App Workspace Notifications</span>
            <span className="block text-xs text-[#718096] dark:text-slate-400">
              Show notification center reminders for upcoming departures
            </span>
          </div>
          <input
            type="checkbox"
            checked={preferences.notificationsEnabled}
            onChange={(e) => updatePreferences({ notificationsEnabled: e.target.checked })}
            className="h-4 w-4 rounded text-[#1687D9]"
          />
        </label>

        <label className="flex items-center justify-between gap-4 py-2 border-t border-[#E5ECF3] dark:border-slate-800 cursor-pointer">
          <div>
            <span className="block text-sm font-medium">Departure Countdown Alerts</span>
            <span className="block text-xs text-[#718096] dark:text-slate-400">
              Highlight pending bookings within 30 days of departure
            </span>
          </div>
          <input
            type="checkbox"
            checked={preferences.departureReminders}
            onChange={(e) => updatePreferences({ departureReminders: e.target.checked })}
            className="h-4 w-4 rounded text-[#1687D9]"
          />
        </label>

        <label className="flex items-center justify-between gap-4 py-2 border-t border-[#E5ECF3] dark:border-slate-800 cursor-pointer">
          <div>
            <span className="block text-sm font-medium">Budget Threshold Warnings</span>
            <span className="block text-xs text-[#718096] dark:text-slate-400">
              Highlight categories approaching 100% of allocated trip budget
            </span>
          </div>
          <input
            type="checkbox"
            checked={preferences.budgetAlerts}
            onChange={(e) => updatePreferences({ budgetAlerts: e.target.checked })}
            className="h-4 w-4 rounded text-[#1687D9]"
          />
        </label>
      </section>

      {/* Install Application & Offline Status */}
      <section className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#172B42] dark:text-white">
              Install Progressive Web App
            </h2>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#718096] dark:text-slate-300">
              {isOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-[#20B486]" />
                  Online
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-[#F5A623]" />
                  Offline
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-[#718096] dark:text-slate-400">
            Install Travel Planner to your home screen or desktop dock to view trips, itineraries, packing lists, and notes offline.
          </p>
        </div>

        <button
          type="button"
          onClick={handleInstallAction}
          disabled={isInstalled}
          className="min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#1687D9] hover:bg-[#1273BA] disabled:opacity-60 px-4 py-2 text-sm font-semibold text-white whitespace-nowrap shrink-0"
        >
          <Smartphone className="h-4 w-4" />
          <span>{isInstalled ? 'App Installed' : 'Install Application'}</span>
        </button>
      </section>

      {/* Data Management */}
      <section className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#172B42] dark:text-white">Data Management</h2>
          <p className="mt-0.5 text-xs text-[#718096] dark:text-slate-400">
            Export or import your complete local IndexedDB workspace as JSON, or reset to the default sample trips.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-[#F5F8FC] dark:bg-slate-800 px-4 text-sm font-semibold text-[#172B42] dark:text-slate-100 hover:border-[#1687D9]/50"
          >
            <Download className="h-4 w-4 text-[#1687D9]" />
            <span>Export Data (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-[#F5F8FC] dark:bg-slate-800 px-4 text-sm font-semibold text-[#172B42] dark:text-slate-100 hover:border-[#1687D9]/50"
          >
            <Upload className="h-4 w-4 text-[#20B486]" />
            <span>Import Data</span>
          </button>

          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset Application Data</span>
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={resetAllData}
        title="Reset Application Data?"
        message="This will erase all custom trips, bookings, documents, notes, and expenses stored locally in IndexedDB and restore the sample demonstration trips."
        confirmLabel="Reset Data"
        destructive
      />

      <PWAInstallModal
        open={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        isIOS={isIOS}
        onTriggerNativeInstall={async () => {
          await install();
        }}
      />
    </div>
  );
};
