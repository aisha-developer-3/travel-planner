import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckSquare,
  Compass,
  Edit3,
  MapPin,
  Plus,
  Printer,
  Users,
  Wallet,
} from 'lucide-react';
import { useTravel } from '../context/TravelContext';
import {
  computeBudgetSummary,
  computePackingProgress,
  computeTripDayList,
  formatCurrency,
  formatDisplayDate,
  getDaysUntilDeparture,
  getTripDurationDays,
  sortActivitiesByOrderAndTime,
} from '../utils/travelMath';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { ActivityCategoryIcon } from '../components/ui/CategoryIcon';
import { TripWizardModal } from '../components/trips/TripWizardModal';
import type { ExpenseCategory } from '../types/travel';

const DASHBOARD_CATEGORIES: ExpenseCategory[] = [
  'Flights',
  'Accommodation',
  'Food',
  'Transportation',
  'Activities',
  'Shopping',
];

const BAR_COLORS: Record<ExpenseCategory, string> = {
  Flights: 'bg-[#1687D9]',
  Accommodation: 'bg-[#56B8E9]',
  Food: 'bg-[#20B486]',
  Transportation: 'bg-[#6366F1]',
  Activities: 'bg-[#F5A623]',
  Shopping: 'bg-[#EC4899]',
  Miscellaneous: 'bg-slate-400',
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    loading,
    trips,
    activeTrip,
    activities,
    bookings,
    packingItems,
    expenses,
    activityLogs,
    preferences,
    globalSearch,
  } = useTravel();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState(false);

  const todayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());
  }, []);

  const tripActivities = useMemo(() => {
    if (!activeTrip) return [];
    const q = globalSearch.trim().toLowerCase();
    return sortActivitiesByOrderAndTime(
      activities.filter((a) => {
        if (a.tripId !== activeTrip.id) return false;
        if (!q) return true;
        return a.title.toLowerCase().includes(q) || a.location.toLowerCase().includes(q);
      })
    );
  }, [activeTrip, activities, globalSearch]);

  const tripDays = useMemo(() => {
    if (!activeTrip) return [];
    return computeTripDayList(activeTrip.departureDate, activeTrip.returnDate);
  }, [activeTrip]);

  const tripExpenses = useMemo(
    () => (activeTrip ? expenses.filter((e) => e.tripId === activeTrip.id) : []),
    [activeTrip, expenses]
  );

  const tripPacking = useMemo(
    () => (activeTrip ? packingItems.filter((p) => p.tripId === activeTrip.id) : []),
    [activeTrip, packingItems]
  );

  const tripBookings = useMemo(
    () => (activeTrip ? bookings.filter((b) => b.tripId === activeTrip.id) : []),
    [activeTrip, bookings]
  );

  const budgetSummary = useMemo(
    () => computeBudgetSummary(activeTrip?.budget ?? 0, tripExpenses),
    [activeTrip, tripExpenses]
  );

  const packingProgress = useMemo(() => computePackingProgress(tripPacking), [tripPacking]);

  const confirmedBookingsCount = useMemo(
    () => tripBookings.filter((b) => b.status === 'Confirmed').length,
    [tripBookings]
  );

  const nonArchivedTrips = useMemo(
    () => trips.filter((t) => t.status !== 'archived'),
    [trips]
  );

  const recentLogs = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return activityLogs
      .filter((log) => !q || log.message.toLowerCase().includes(q))
      .slice(0, 5);
  }, [activityLogs, globalSearch]);

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
        <div className="h-44 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5ECF3] dark:border-slate-800 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5ECF3] dark:border-slate-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const daysUntil = activeTrip ? getDaysUntilDeparture(activeTrip.departureDate) : 0;
  const durationDays = activeTrip
    ? getTripDurationDays(activeTrip.departureDate, activeTrip.returnDate)
    : 0;
  const travelerTotal = activeTrip ? activeTrip.adults + activeTrip.children : 0;
  const currency = activeTrip?.currency ?? preferences.currency;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#172B42] dark:text-white">
            Welcome back, Traveler!
          </h2>
          <p className="mt-1 text-sm text-[#718096] dark:text-slate-400">
            Your next adventure starts here.
            <span className="mx-2" aria-hidden="true">·</span>
            <span>{todayFormatted}</span>
            {activeTrip ? (
              <>
                <span className="mx-2" aria-hidden="true">·</span>
                <span className="font-medium text-[#1687D9] dark:text-sky-400">
                  {activeTrip.destination}, {activeTrip.country}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div className="no-print flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm font-medium text-[#172B42] dark:text-slate-200 hover:bg-[#F5F8FC] dark:hover:bg-slate-800 transition-colors"
          >
            <Printer className="h-4 w-4 text-[#718096]" />
            <span>Print Overview</span>
          </button>
        </div>
      </section>

      {/* Featured Upcoming Trip Card */}
      {activeTrip ? (
        <section
          aria-label="Featured Upcoming Trip"
          className="rounded-2xl border border-[#D4E7FA] dark:border-sky-900/60 bg-gradient-to-br from-[#EDF6FF] via-[#F7FBFF] to-white dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/30 p-5 sm:p-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#1687D9] dark:text-sky-400">
                <span>Featured Trip</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {daysUntil > 0
                    ? `${daysUntil} days until departure`
                    : daysUntil === 0
                      ? 'Departs today'
                      : `${durationDays}-day scheduled itinerary`}
                </span>
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#172B42] dark:text-white">
                  {activeTrip.name}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[#475569] dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#1687D9]" />
                    {activeTrip.destination}, {activeTrip.country}
                  </span>
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Calendar className="h-4 w-4 text-[#1687D9]" />
                    {formatDisplayDate(activeTrip.departureDate, preferences.dateFormat)} –{' '}
                    {formatDisplayDate(activeTrip.returnDate, preferences.dateFormat)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Users className="h-4 w-4 text-[#1687D9]" />
                    {travelerTotal} travelers · {durationDays} days
                  </span>
                </div>
              </div>

              <div className="no-print flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/itinerary')}
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-4 py-2 text-sm font-semibold text-white transition-colors"
                >
                  <span>View Trip</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTrip(true);
                    setWizardOpen(true);
                  }}
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#D4E7FA] dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-[#172B42] dark:text-slate-100 hover:bg-[#F5F8FC] dark:hover:bg-slate-700 transition-colors"
                >
                  <Edit3 className="h-4 w-4 text-[#1687D9]" />
                  <span>Edit Trip</span>
                </button>
                <Link
                  to="/bookings"
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#D4E7FA] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm font-medium text-[#172B42] dark:text-slate-100 hover:bg-[#F5F8FC] dark:hover:bg-slate-700 transition-colors"
                >
                  <Briefcase className="h-4 w-4 text-[#F5A623]" />
                  <span>Bookings</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-4">
              <div className="relative overflow-hidden rounded-2xl border border-[#E5ECF3] dark:border-slate-700 aspect-[16/10] bg-white dark:bg-slate-800 shadow-xs">
                <ImageWithFallback
                  src={activeTrip.coverImage}
                  alt={activeTrip.name}
                  fallbackTitle={activeTrip.destination}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
          <Compass className="mx-auto h-10 w-10 text-[#1687D9]" />
          <h3 className="mt-3 text-lg font-bold text-[#172B42] dark:text-white">No active trips yet</h3>
          <p className="mt-1 text-sm text-[#718096] dark:text-slate-400">
            Create your first trip to organize itineraries, bookings, packing checklists, and budgets.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingTrip(false);
              setWizardOpen(true);
            }}
            className="mt-4 min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-[#1687D9] px-5 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Create Your First Trip
          </button>
        </section>
      )}

      {/* Four Dashboard Statistics Cards */}
      <section aria-label="Trip statistics" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/trips"
          className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 hover:border-[#1687D9]/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#718096] dark:text-slate-400">Total Trips</span>
            <Compass className="h-4 w-4 text-[#1687D9]" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-[#172B42] dark:text-white">
            {nonArchivedTrips.length}
          </p>
          <p className="mt-1 text-xs text-[#718096] dark:text-slate-400">
            {nonArchivedTrips.filter((t) => t.status === 'upcoming').length} upcoming planned
          </p>
          <div className="mt-3 h-1.5 w-full rounded-full bg-[#F5F8FC] dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#1687D9]"
              style={{ width: `${Math.min(100, nonArchivedTrips.length * 25)}%` }}
            />
          </div>
        </Link>

        <Link
          to="/budget"
          className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 hover:border-[#1687D9]/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#718096] dark:text-slate-400">Budget Used</span>
            <Wallet className="h-4 w-4 text-[#1687D9]" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-[#172B42] dark:text-white">
            {budgetSummary.percentUsed}%
          </p>
          <p className="mt-1 text-xs text-[#718096] dark:text-slate-400 tabular-nums">
            {formatCurrency(budgetSummary.totalSpent, currency)} of{' '}
            {formatCurrency(budgetSummary.totalBudget, currency)}
          </p>
          <div className="mt-3 h-1.5 w-full rounded-full bg-[#F5F8FC] dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                budgetSummary.isOverBudget ? 'bg-rose-500' : 'bg-[#1687D9]'
              }`}
              style={{ width: `${Math.min(100, budgetSummary.percentUsed)}%` }}
            />
          </div>
        </Link>

        <Link
          to="/packing"
          className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 hover:border-[#1687D9]/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#718096] dark:text-slate-400">Packing Done</span>
            <CheckSquare className="h-4 w-4 text-[#20B486]" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-[#172B42] dark:text-white">
            {packingProgress.percentage}%
          </p>
          <p className="mt-1 text-xs text-[#718096] dark:text-slate-400 tabular-nums">
            {packingProgress.packed} of {packingProgress.total} items packed
          </p>
          <div className="mt-3 h-1.5 w-full rounded-full bg-[#F5F8FC] dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#20B486]"
              style={{ width: `${packingProgress.percentage}%` }}
            />
          </div>
        </Link>

        <Link
          to="/bookings"
          className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 hover:border-[#1687D9]/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#718096] dark:text-slate-400">Confirmed Bookings</span>
            <Briefcase className="h-4 w-4 text-[#F5A623]" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-[#172B42] dark:text-white">
            {confirmedBookingsCount}
          </p>
          <p className="mt-1 text-xs text-[#718096] dark:text-slate-400">
            Flights, stays &amp; activities
          </p>
          <div className="mt-3 h-1.5 w-full rounded-full bg-[#F5F8FC] dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#56B8E9]"
              style={{
                width: `${
                  tripBookings.length > 0
                    ? Math.round((confirmedBookingsCount / tripBookings.length) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </Link>
      </section>

      {/* Main 3-Column Breakdown: Upcoming Itinerary + Trip Snapshot + Budget by Category */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Upcoming Itinerary */}
        <div className="lg:col-span-5 rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#172B42] dark:text-white">Upcoming Itinerary</h3>
            <Link
              to="/itinerary"
              className="text-xs font-semibold text-[#1687D9] hover:underline"
            >
              View all
            </Link>
          </div>

          {tripActivities.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#718096] dark:text-slate-400">
              No activities scheduled yet for this trip.
            </div>
          ) : (
            <ul className="space-y-3 flex-1">
              {tripActivities.slice(0, 4).map((act) => {
                const day = tripDays[act.dayIndex];
                return (
                  <li
                    key={act.id}
                    className="flex items-center gap-3 rounded-xl bg-[#F5F8FC] dark:bg-slate-800/60 px-3.5 py-2.5"
                  >
                    <span className="font-mono text-xs font-semibold tabular-nums text-[#172B42] dark:text-slate-200 w-11 shrink-0">
                      {act.time}
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-[#1687D9] border border-[#E5ECF3] dark:border-slate-700">
                      <ActivityCategoryIcon category={act.category} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#172B42] dark:text-slate-100 truncate">
                        {act.title}
                      </p>
                      <p className="text-xs text-[#718096] dark:text-slate-400 truncate">
                        {day ? `${day.shortDate} · ` : ''}
                        {act.location}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Trip Snapshot */}
        <div className="lg:col-span-3 rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#172B42] dark:text-white">Trip Snapshot</h3>
          </div>

          {activeTrip ? (
            <dl className="divide-y divide-[#E5ECF3] dark:divide-slate-800 text-sm flex-1">
              <div className="py-2.5 flex items-center justify-between gap-3">
                <dt className="text-[#718096] dark:text-slate-400">Destination</dt>
                <dd className="font-semibold text-[#172B42] dark:text-slate-100 text-right truncate">
                  {activeTrip.destination}, {activeTrip.country}
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-3">
                <dt className="text-[#718096] dark:text-slate-400">Duration</dt>
                <dd className="font-semibold tabular-nums text-[#172B42] dark:text-slate-100">
                  {durationDays} days
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-3">
                <dt className="text-[#718096] dark:text-slate-400">Travelers</dt>
                <dd className="font-semibold tabular-nums text-[#172B42] dark:text-slate-100">
                  {travelerTotal}
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-3">
                <dt className="text-[#718096] dark:text-slate-400">Total Budget</dt>
                <dd className="font-semibold tabular-nums text-[#172B42] dark:text-slate-100">
                  {formatCurrency(budgetSummary.totalBudget, currency)}
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-3">
                <dt className="text-[#718096] dark:text-slate-400">Remaining</dt>
                <dd
                  className={`font-bold tabular-nums ${
                    budgetSummary.isOverBudget
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-[#20B486]'
                  }`}
                >
                  {formatCurrency(budgetSummary.remainingBalance, currency)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-[#718096]">Select or create a trip to inspect snapshot metrics.</p>
          )}
        </div>

        {/* Budget by Category */}
        <div className="lg:col-span-4 rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-[#172B42] dark:text-white">Budget by Category</h3>
            <Link to="/budget" className="text-xs font-semibold text-[#1687D9] hover:underline">
              Details
            </Link>
          </div>

          <div className="space-y-3 flex-1">
            {DASHBOARD_CATEGORIES.map((category) => {
              const row = budgetSummary.categoryBreakdown.find((b) => b.category === category);
              const spent = row?.spent ?? 0;
              const widthPct =
                budgetSummary.totalBudget > 0
                  ? Math.min(100, Math.round((spent / budgetSummary.totalBudget) * 100))
                  : 0;
              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#475569] dark:text-slate-300">{category}</span>
                    <span className="font-semibold tabular-nums text-[#172B42] dark:text-slate-100">
                      {formatCurrency(spent, currency)}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#F5F8FC] dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${BAR_COLORS[category]}`}
                      style={{ width: `${spent > 0 ? Math.max(4, widthPct) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-[#172B42] dark:text-white">Recent Activity</h3>
          <span className="text-xs text-[#718096] dark:text-slate-400">Latest workspace updates</span>
        </div>

        {recentLogs.length === 0 ? (
          <p className="text-sm text-[#718096] dark:text-slate-400 py-4 text-center">
            No recent activity recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-[#E5ECF3] dark:divide-slate-800">
            {recentLogs.map((log) => (
              <li key={log.id} className="py-2.5 flex items-center justify-between gap-4 text-sm">
                <span className="text-[#172B42] dark:text-slate-200">{log.message}</span>
                <span className="text-xs text-[#718096] dark:text-slate-400 whitespace-nowrap tabular-nums">
                  {formatDisplayDate(log.timestamp, preferences.dateFormat)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TripWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        editingTrip={editingTrip ? activeTrip : null}
      />
    </div>
  );
};
