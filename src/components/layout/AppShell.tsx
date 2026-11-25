import React, { useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  CalendarDays,
  CheckSquare,
  Download,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Moon,
  NotebookPen,
  Plane,
  Plus,
  Search,
  Settings,
  Sun,
  User,
  Wallet,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useTravel } from '../../context/TravelContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { PWAInstallModal } from '../ui/PWAInstallModal';
import { ToastContainer } from '../ui/ToastContainer';
import { TripWizardModal } from '../trips/TripWizardModal';
import { getDaysUntilDeparture } from '../../utils/travelMath';

interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/trips', label: 'My Trips', icon: Map },
  { to: '/itinerary', label: 'Itinerary', icon: CalendarDays },
  { to: '/bookings', label: 'Bookings', icon: Briefcase },
  { to: '/packing', label: 'Packing List', icon: CheckSquare },
  { to: '/budget', label: 'Budget', icon: Wallet },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/notes', label: 'Travel Notes', icon: NotebookPen },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/trips': 'My Trips',
  '/itinerary': 'Itinerary',
  '/bookings': 'Bookings',
  '/packing': 'Packing List',
  '/budget': 'Budget',
  '/documents': 'Documents',
  '/notes': 'Travel Notes',
  '/settings': 'Settings',
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const {
    trips,
    bookings,
    activeTrip,
    preferences,
    updatePreferences,
    setActiveTripId,
    globalSearch,
    setGlobalSearch,
    toasts,
    dismissToast,
    showToast,
    resetAllData,
  } = useTravel();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newTripOpen, setNewTripOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [installBannerDismissed, setInstallBannerDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('tp_install_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const pageTitle = ROUTE_TITLES[location.pathname] ?? 'Dashboard';

  const initials = useMemo(() => {
    const parts = preferences.userName.trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : preferences.userName.slice(0, 2).toUpperCase() || 'TP';
  }, [preferences.userName]);

  const notifications = useMemo(() => {
    const items: Array<{ id: string; title: string; detail: string; actionPath: string }> = [];
    if (activeTrip) {
      const days = getDaysUntilDeparture(activeTrip.departureDate);
      if (days >= 0) {
        items.push({
          id: 'notif-dep',
          title: `${activeTrip.name} departs in ${days} ${days === 1 ? 'day' : 'days'}`,
          detail: `${activeTrip.destination}, ${activeTrip.country}`,
          actionPath: '/itinerary',
        });
      }
    }
    const pendingCount = bookings.filter((b) => b.status === 'Pending').length;
    if (pendingCount > 0) {
      items.push({
        id: 'notif-bkg',
        title: `${pendingCount} pending booking${pendingCount > 1 ? 's' : ''} to verify`,
        detail: 'Review reservation codes and confirmation status',
        actionPath: '/bookings',
      });
    }
    if (!isOnline) {
      items.push({
        id: 'notif-offline',
        title: 'Offline workspace active',
        detail: 'All trips, checklists, and notes remain editable locally.',
        actionPath: '/settings',
      });
    }
    return items;
  }, [activeTrip, bookings, isOnline]);

  const toggleTheme = () => {
    const nextTheme = preferences.theme === 'dark' ? 'light' : 'dark';
    updatePreferences({ theme: nextTheme });
    showToast(`Switched to ${nextTheme} mode`, 'info');
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'accepted') {
        showToast('Travel Planner installed on your device');
      }
    } else {
      setInstallModalOpen(true);
    }
  };

  const dismissInstallBanner = () => {
    setInstallBannerDismissed(true);
    try {
      sessionStorage.setItem('tp_install_banner_dismissed', 'true');
    } catch {
      // Ignore storage failures
    }
  };

  const renderSidebarLinks = (onNavigate?: () => void) => (
    <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3 py-2 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#EBF5FF] text-[#1687D9] dark:bg-sky-950/60 dark:text-sky-400 font-semibold'
                  : 'text-[#718096] hover:bg-[#F5F8FC] hover:text-[#172B42] dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F5F8FC] dark:bg-slate-950 text-[#172B42] dark:text-slate-100 flex">
      {/* Desktop Fixed Sidebar */}
      <aside className="no-print hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 bg-white dark:bg-slate-900 border-r border-[#E5ECF3] dark:border-slate-800 z-30">
        {/* Brand */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-[#E5ECF3] dark:border-slate-800 shrink-0">
          <NavLink to="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1687D9] text-white shadow-xs">
              <Plane className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-[#172B42] dark:text-white">
              Travel Planner
            </span>
          </NavLink>
        </div>

        {/* Navigation Links */}
        {renderSidebarLinks()}

        {/* Connection status + bottom utility actions */}
        <div className="border-t border-[#E5ECF3] dark:border-slate-800 p-3 space-y-1.5 shrink-0">
          <div
            className="flex items-center justify-between rounded-xl bg-[#F5F8FC] dark:bg-slate-800/70 px-3 py-2 text-xs"
            role="status"
            aria-label={isOnline ? 'Connection status: Online' : 'Connection status: Offline'}
          >
            <span className="flex items-center gap-2 font-medium text-[#718096] dark:text-slate-300">
              {isOnline ? (
                <Wifi className="h-3.5 w-3.5 text-[#20B486]" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-[#F5A623]" />
              )}
              {isOnline ? 'Online' : 'Offline Mode'}
            </span>
            <span className="text-[11px] text-[#718096] dark:text-slate-400">Local IndexedDB</span>
          </div>

          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-[#F5F8FC] dark:hover:bg-slate-800 transition-colors"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EBF5FF] text-xs font-bold text-[#1687D9] dark:bg-sky-950 dark:text-sky-300">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[#172B42] dark:text-slate-100">
                {preferences.userName}
              </span>
              <span className="block truncate text-xs text-[#718096] dark:text-slate-400">
                Traveler Profile
              </span>
            </span>
          </button>

          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[#718096] hover:bg-[#F5F8FC] hover:text-[#172B42] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Help</span>
            </button>
            <button
              type="button"
              onClick={() => setLogoutConfirmOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[#718096] hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
        >
          <div
            className="fixed inset-0 bg-[#172B42]/45 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[82vw] bg-white dark:bg-slate-900 h-full flex flex-col border-r border-[#E5ECF3] dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between px-4 h-14 border-b border-[#E5ECF3] dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1687D9] text-white">
                  <Plane className="h-4 w-4" />
                </span>
                <span className="font-display text-base font-bold text-[#172B42] dark:text-white">
                  Travel Planner
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#718096] hover:bg-[#F5F8FC] dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {renderSidebarLinks(() => setMobileMenuOpen(false))}

            <div className="border-t border-[#E5ECF3] dark:border-slate-800 p-3 space-y-2">
              <div className="flex items-center justify-between px-2 py-1 text-xs text-[#718096] dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  {isOnline ? (
                    <Wifi className="h-3.5 w-3.5 text-[#20B486]" />
                  ) : (
                    <WifiOff className="h-3.5 w-3.5 text-[#F5A623]" />
                  )}
                  {isOnline ? 'Online' : 'Offline Mode'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setHelpOpen(true);
                  }}
                  className="font-medium text-[#1687D9]"
                >
                  Help & Support
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 pt-[52px] lg:pt-16 print:pt-0">
        {/* Desktop Fixed Header */}
        <header className="no-print hidden lg:flex fixed top-0 left-64 right-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#E5ECF3] dark:border-slate-800 px-6 items-center justify-between gap-4">
          {/* Left: Page title & Breadcrumb */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-[#718096] dark:text-slate-400">
              <span>Travel Planner</span>
              <span aria-hidden="true">/</span>
              <span className="text-[#172B42] dark:text-slate-200 font-medium truncate">{pageTitle}</span>
            </div>
            <h1 className="text-lg font-bold text-[#172B42] dark:text-white leading-tight truncate">
              {pageTitle}
            </h1>
          </div>

          {/* Right: Search + Active Trip + Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative w-44 xl:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718096]" />
              <input
                type="search"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search trips, items, notes..."
                aria-label="Search workspace"
                className="w-full h-10 rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-[#F5F8FC] dark:bg-slate-800 pl-9 pr-3 text-sm text-[#172B42] dark:text-slate-100 placeholder:text-[#718096] focus:border-[#1687D9] focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors"
              />
            </div>

            {trips.length > 0 && (
              <select
                aria-label="Active trip selector"
                value={activeTrip?.id ?? ''}
                onChange={(e) => setActiveTripId(e.target.value)}
                className="h-10 max-w-[160px] xl:max-w-[190px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-medium text-[#172B42] dark:text-slate-100 focus:border-[#1687D9] focus:outline-none truncate"
              >
                {trips
                  .filter((t) => t.status !== 'archived')
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((v) => !v)}
                aria-label="Open notifications"
                className="relative h-10 w-10 flex items-center justify-center rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#718096] hover:text-[#172B42] dark:text-slate-300 dark:hover:text-white transition-colors"
              >
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#F5A623]" />
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setNotificationsOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute right-0 mt-2 w-80 rounded-2xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-3 z-40"
                    role="region"
                    aria-label="Notifications"
                  >
                    <div className="flex items-center justify-between px-1 pb-2 border-b border-[#E5ECF3] dark:border-slate-800">
                      <span className="text-sm font-bold text-[#172B42] dark:text-white">Notifications</span>
                      <button
                        type="button"
                        onClick={() => setNotificationsOpen(false)}
                        className="text-xs text-[#718096] hover:text-[#172B42] dark:hover:text-white"
                      >
                        Close
                      </button>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {notifications.length === 0 ? (
                        <p className="py-4 text-center text-xs text-[#718096]">You are all caught up.</p>
                      ) : (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              setNotificationsOpen(false);
                              navigate(n.actionPath);
                            }}
                            className="w-full text-left rounded-xl p-2.5 hover:bg-[#F5F8FC] dark:hover:bg-slate-800 transition-colors"
                          >
                            <p className="text-xs font-semibold text-[#172B42] dark:text-slate-100">{n.title}</p>
                            <p className="mt-0.5 text-xs text-[#718096] dark:text-slate-400">{n.detail}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={preferences.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="h-10 w-10 flex items-center justify-center rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#718096] hover:text-[#172B42] dark:text-slate-300 dark:hover:text-white transition-colors"
            >
              {preferences.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label="Open traveler profile"
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#EBF5FF] dark:bg-sky-950 text-xs font-bold text-[#1687D9] dark:text-sky-300 border border-[#D4E9FB] dark:border-sky-800"
            >
              {initials}
            </button>

            <button
              type="button"
              onClick={() => setNewTripOpen(true)}
              className="h-10 inline-flex items-center gap-1.5 rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-4 text-sm font-semibold text-white shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Trip</span>
            </button>
          </div>
        </header>

        {/* Mobile Fixed Compact Top Header (52px height) */}
        <header className="no-print lg:hidden fixed top-0 left-0 right-0 z-30 h-[52px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[#E5ECF3] dark:border-slate-800 px-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#172B42] dark:text-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-display text-base font-bold text-[#172B42] dark:text-white truncate">
              {pageTitle}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isOnline && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F5A623] mr-1">
                <WifiOff className="h-3.5 w-3.5" />
                Offline
              </span>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#718096] dark:text-slate-300"
            >
              {preferences.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setNewTripOpen(true)}
              aria-label="Create New Trip"
              className="min-h-[40px] inline-flex items-center gap-1 rounded-xl bg-[#1687D9] px-3 text-xs font-semibold text-white whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Trip</span>
            </button>
          </div>
        </header>

        {/* Main Scrollable Workspace */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-8 max-w-[1440px] w-full mx-auto">
          {!isInstalled && !installBannerDismissed && (
            <div
              role="region"
              aria-label="Install app notification"
              className="no-print lg:hidden mb-4 flex items-center gap-3 rounded-2xl border border-[#CFE4F9] dark:border-sky-800/70 bg-white dark:bg-slate-900 px-3.5 py-2.5 shadow-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EBF5FF] dark:bg-sky-950 text-[#1687D9] dark:text-sky-400">
                <Download className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#172B42] dark:text-white truncate">
                  Install Travel Planner
                </p>
                <p className="text-[11px] text-[#718096] dark:text-slate-400 truncate">
                  Quick launch &amp; offline access
                </p>
              </div>
              <button
                type="button"
                onClick={handleInstallClick}
                aria-label="Install App"
                className="min-h-[36px] shrink-0 rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-3 text-xs font-semibold text-white transition-colors whitespace-nowrap"
              >
                Install
              </button>
              <button
                type="button"
                onClick={dismissInstallBanner}
                aria-label="Dismiss install notification"
                className="min-h-[36px] min-w-[36px] shrink-0 flex items-center justify-center rounded-xl text-[#718096] hover:bg-[#F5F8FC] dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation (64px height) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 pb-safe bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-[#E5ECF3] dark:border-slate-800 grid grid-cols-4"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-h-[44px] px-1 text-[11px] font-medium whitespace-nowrap ${
              isActive ? 'text-[#1687D9] dark:text-sky-400 font-semibold' : 'text-[#718096] dark:text-slate-400'
            }`
          }
        >
          <LayoutDashboard className="h-5 w-5 mb-0.5" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/trips"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-h-[44px] px-1 text-[11px] font-medium whitespace-nowrap ${
              isActive ? 'text-[#1687D9] dark:text-sky-400 font-semibold' : 'text-[#718096] dark:text-slate-400'
            }`
          }
        >
          <Map className="h-5 w-5 mb-0.5" />
          <span>Trips</span>
        </NavLink>
        <NavLink
          to="/itinerary"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-h-[44px] px-1 text-[11px] font-medium whitespace-nowrap ${
              isActive ? 'text-[#1687D9] dark:text-sky-400 font-semibold' : 'text-[#718096] dark:text-slate-400'
            }`
          }
        >
          <CalendarDays className="h-5 w-5 mb-0.5" />
          <span>Itinerary</span>
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-h-[44px] px-1 text-[11px] font-medium whitespace-nowrap ${
              isActive ? 'text-[#1687D9] dark:text-sky-400 font-semibold' : 'text-[#718096] dark:text-slate-400'
            }`
          }
        >
          <User className="h-5 w-5 mb-0.5" />
          <span>Profile</span>
        </NavLink>
      </nav>

      {/* Global Modals */}
      <TripWizardModal open={newTripOpen} onClose={() => setNewTripOpen(false)} />

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

      <Modal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Traveler Profile"
        subtitle="Local offline account details"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EBF5FF] dark:bg-sky-950 text-lg font-bold text-[#1687D9] dark:text-sky-300">
              {initials}
            </div>
            <div>
              <p className="text-base font-bold text-[#172B42] dark:text-white">{preferences.userName}</p>
              <p className="text-sm text-[#718096] dark:text-slate-400">{preferences.userEmail}</p>
            </div>
          </div>
          <div className="rounded-xl bg-[#F5F8FC] dark:bg-slate-800/70 p-3.5 text-xs text-[#718096] dark:text-slate-300 space-y-1">
            <p>Preferred Currency: <strong className="text-[#172B42] dark:text-slate-100">{preferences.currency}</strong></p>
            <p>Date Format: <strong className="text-[#172B42] dark:text-slate-100">{preferences.dateFormat}</strong></p>
            <p>Storage: <strong className="text-[#172B42] dark:text-slate-100">Browser IndexedDB (Offline-first)</strong></p>
          </div>
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                navigate('/settings');
              }}
              className="min-h-[40px] rounded-xl bg-[#1687D9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1273BA]"
            >
              Edit in Settings
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Help & Support"
        subtitle="Tips for using Travel Planner offline and across devices"
        maxWidth="max-w-md"
      >
        <div className="space-y-3 text-sm text-[#475569] dark:text-slate-300">
          <p>
            <strong className="text-[#172B42] dark:text-white">Offline Storage:</strong> All trips, itineraries, bookings, packing lists, budgets, documents, and notes are stored locally on your device using IndexedDB.
          </p>
          <p>
            <strong className="text-[#172B42] dark:text-white">Backup & Transfer:</strong> Export a complete JSON backup anytime from the Settings page and import it on another browser or device.
          </p>
          <p>
            <strong className="text-[#172B42] dark:text-white">External Bookings:</strong> The Bookings section helps you track confirmation numbers and vouchers from airlines, hotels, and tour providers in one place.
          </p>
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="min-h-[40px] rounded-xl bg-[#1687D9] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1273BA]"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={async () => {
          await resetAllData();
          navigate('/');
        }}
        title="Reset Local Session & Demo Data?"
        message="This will clear custom edits and restore the default demonstration workspace on this browser. Export a backup in Settings first if you want to keep your trips."
        confirmLabel="Reset Workspace"
        destructive
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
