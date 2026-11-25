import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  Calendar,
  Copy,
  Edit3,
  Eye,
  MapPin,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from 'lucide-react';
import { useTravel } from '../context/TravelContext';
import {
  computeBudgetSummary,
  filterTripsByStatus,
  formatCurrency,
  formatDisplayDate,
  getTripDurationDays,
} from '../utils/travelMath';
import type { Trip, TripStatus } from '../types/travel';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { TripWizardModal } from '../components/trips/TripWizardModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

type TripFilter = 'all' | TripStatus;

const STATUS_TABS: Array<{ id: TripFilter; label: string }> = [
  { id: 'all', label: 'All Trips' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'completed', label: 'Completed' },
  { id: 'archived', label: 'Archived' },
];

const STATUS_LABEL_COLORS: Record<TripStatus, string> = {
  upcoming: 'text-[#1687D9] dark:text-sky-400',
  ongoing: 'text-[#20B486] dark:text-emerald-400',
  completed: 'text-[#718096] dark:text-slate-400',
  archived: 'text-[#F5A623] dark:text-amber-400',
};

export const TripsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    trips,
    expenses,
    preferences,
    globalSearch,
    setActiveTripId,
    saveTrip,
    duplicateTrip,
    deleteTrip,
    showToast,
  } = useTravel();

  const [statusFilter, setStatusFilter] = useState<TripFilter>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);

  const filteredTrips = useMemo(
    () => filterTripsByStatus(trips, statusFilter, globalSearch),
    [trips, statusFilter, globalSearch]
  );

  const handleViewTrip = (trip: Trip) => {
    setActiveTripId(trip.id);
    navigate('/itinerary');
  };

  const handleToggleArchive = async (trip: Trip) => {
    const nextStatus: TripStatus = trip.status === 'archived' ? 'upcoming' : 'archived';
    await saveTrip({ ...trip, status: nextStatus, updatedAt: new Date().toISOString() });
    showToast(nextStatus === 'archived' ? `Archived "${trip.name}"` : `Restored "${trip.name}"`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Page Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-slate-900 border border-[#E5ECF3] dark:border-slate-800 overflow-x-auto"
          role="tablist"
          aria-label="Filter trips by status"
        >
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(tab.id)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#1687D9] text-white'
                    : 'text-[#718096] hover:text-[#172B42] dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingTrip(null);
            setWizardOpen(true);
          }}
          className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-4 py-2 text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Trip</span>
        </button>
      </div>

      {/* Trip Cards Grid */}
      {filteredTrips.length === 0 ? (
        <div className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
          <p className="text-base font-semibold text-[#172B42] dark:text-white">
            No trips match this filter
          </p>
          <p className="mt-1 text-sm text-[#718096] dark:text-slate-400">
            Create a new trip or switch filters to see your planned adventures.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingTrip(null);
              setWizardOpen(true);
            }}
            className="mt-4 min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#1687D9] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Create New Trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTrips.map((trip) => {
            const tripExp = expenses.filter((e) => e.tripId === trip.id);
            const budget = computeBudgetSummary(trip.budget, tripExp);
            const duration = getTripDurationDays(trip.departureDate, trip.returnDate);
            const travelers = trip.adults + trip.children;

            return (
              <article
                key={trip.id}
                className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col hover:border-[#1687D9]/40 transition-colors"
              >
                <div className="relative aspect-[16/9] bg-[#F5F8FC] dark:bg-slate-800 overflow-hidden">
                  <ImageWithFallback
                    src={trip.coverImage}
                    alt={trip.name}
                    fallbackTitle={trip.destination}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                    <span className={STATUS_LABEL_COLORS[trip.status]}>
                      {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                    </span>
                    <span className="text-[#718096] dark:text-slate-400 tabular-nums">
                      {duration} days
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-lg font-bold text-[#172B42] dark:text-white leading-snug">
                    {trip.name}
                  </h3>

                  <div className="mt-2 space-y-1.5 text-xs text-[#718096] dark:text-slate-400">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#1687D9] shrink-0" />
                      <span className="truncate">
                        {trip.destination}, {trip.country}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5 tabular-nums">
                      <Calendar className="h-3.5 w-3.5 text-[#1687D9] shrink-0" />
                      <span>
                        {formatDisplayDate(trip.departureDate, preferences.dateFormat)} –{' '}
                        {formatDisplayDate(trip.returnDate, preferences.dateFormat)}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5 tabular-nums">
                      <Users className="h-3.5 w-3.5 text-[#1687D9] shrink-0" />
                      <span>{travelers} travelers</span>
                    </p>
                  </div>

                  {/* Budget Summary */}
                  <div className="mt-4 pt-3 border-t border-[#E5ECF3] dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#718096] dark:text-slate-400">Budget Spent</span>
                      <span className="font-semibold tabular-nums text-[#172B42] dark:text-slate-100">
                        {formatCurrency(budget.totalSpent, trip.currency)} /{' '}
                        {formatCurrency(budget.totalBudget, trip.currency)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#F5F8FC] dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1687D9]"
                        style={{ width: `${Math.min(100, budget.percentUsed)}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-[#E5ECF3] dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewTrip(trip)}
                      className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-[#EBF5FF] hover:bg-[#DCEEFF] dark:bg-sky-950/60 dark:hover:bg-sky-900/60 px-3 py-1.5 text-xs font-semibold text-[#1687D9] dark:text-sky-300 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Trip</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTrip(trip);
                          setWizardOpen(true);
                        }}
                        aria-label={`Edit ${trip.name}`}
                        title="Edit Trip"
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#718096] hover:bg-[#F5F8FC] hover:text-[#172B42] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => duplicateTrip(trip)}
                        aria-label={`Duplicate ${trip.name}`}
                        title="Duplicate Trip"
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#718096] hover:bg-[#F5F8FC] hover:text-[#172B42] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleArchive(trip)}
                        aria-label={
                          trip.status === 'archived' ? `Restore ${trip.name}` : `Archive ${trip.name}`
                        }
                        title={trip.status === 'archived' ? 'Restore Trip' : 'Archive Trip'}
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#718096] hover:bg-[#F5F8FC] hover:text-[#172B42] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        {trip.status === 'archived' ? (
                          <RotateCcw className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingTrip(trip)}
                        aria-label={`Delete ${trip.name}`}
                        title="Delete Trip"
                        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#718096] hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <TripWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        editingTrip={editingTrip}
      />

      <ConfirmDialog
        open={!!deletingTrip}
        onClose={() => setDeletingTrip(null)}
        onConfirm={() => {
          if (deletingTrip) deleteTrip(deletingTrip.id);
        }}
        title="Delete Trip?"
        message={`Are you sure you want to permanently delete "${deletingTrip?.name}" and its itinerary, bookings, packing list, expenses, and notes?`}
        confirmLabel="Delete Trip"
        destructive
      />
    </div>
  );
};
