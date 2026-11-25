import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Edit3,
  MapPin,
  Plus,
  Printer,
  Trash2,
} from 'lucide-react';
import { useTravel } from '../context/TravelContext';
import {
  computeTripDayList,
  formatDisplayDate,
  getTripDurationDays,
  sortActivitiesByOrderAndTime,
} from '../utils/travelMath';
import type { ActivityCategory, ItineraryActivity } from '../types/travel';
import { ActivityCategoryIcon } from '../components/ui/CategoryIcon';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { COVER_IMAGES } from '../data/seedData';

const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  'Flight',
  'Hotel',
  'Restaurant',
  'Sightseeing',
  'Shopping',
  'Transportation',
  'Other',
];

const PHOTO_PRESETS = [
  { label: 'None', url: '' },
  { label: 'Japan Pagoda', url: COVER_IMAGES.japan },
  { label: 'Shibuya Street', url: COVER_IMAGES.shibuya },
  { label: 'Fushimi Inari', url: COVER_IMAGES.fushimi },
  { label: 'Bali Coast', url: COVER_IMAGES.bali },
  { label: 'Seoul Skyline', url: COVER_IMAGES.seoul },
];

export const ItineraryPage: React.FC = () => {
  const {
    activeTrip,
    activities,
    preferences,
    globalSearch,
    saveActivity,
    deleteActivity,
    reorderDayActivities,
    showToast,
  } = useTravel();

  const [selectedDay, setSelectedDay] = useState<'all' | number>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ItineraryActivity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<ItineraryActivity | null>(null);

  // Form state
  const [formDay, setFormDay] = useState(0);
  const [formTime, setFormTime] = useState('09:00');
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formCategory, setFormCategory] = useState<ActivityCategory>('Sightseeing');
  const [formDescription, setFormDescription] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formError, setFormError] = useState('');

  const days = useMemo(() => {
    if (!activeTrip) return [];
    return computeTripDayList(activeTrip.departureDate, activeTrip.returnDate);
  }, [activeTrip]);

  const tripActivities = useMemo(() => {
    if (!activeTrip) return [];
    const q = globalSearch.trim().toLowerCase();
    return sortActivitiesByOrderAndTime(
      activities.filter((a) => {
        if (a.tripId !== activeTrip.id) return false;
        if (!q) return true;
        return (
          a.title.toLowerCase().includes(q) ||
          a.location.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
        );
      })
    );
  }, [activeTrip, activities, globalSearch]);

  const openAddModal = (dayIndex = 0) => {
    setEditingActivity(null);
    setFormDay(typeof selectedDay === 'number' ? selectedDay : dayIndex);
    setFormTime('10:00');
    setFormTitle('');
    setFormLocation('');
    setFormCategory('Sightseeing');
    setFormDescription('');
    setFormNotes('');
    setFormImageUrl('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (act: ItineraryActivity) => {
    setEditingActivity(act);
    setFormDay(act.dayIndex);
    setFormTime(act.time);
    setFormTitle(act.title);
    setFormLocation(act.location);
    setFormCategory(act.category);
    setFormDescription(act.description);
    setFormNotes(act.notes);
    setFormImageUrl(act.imageUrl ?? '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;
    if (!formTitle.trim() || !formLocation.trim()) {
      setFormError('Activity title and location are required.');
      return;
    }

    const dayActs = tripActivities.filter((a) => a.dayIndex === formDay);
    const nextOrder = editingActivity
      ? editingActivity.order
      : dayActs.length > 0
        ? Math.max(...dayActs.map((a) => a.order)) + 1
        : 1;

    const record: ItineraryActivity = {
      id: editingActivity?.id ?? `act-${Date.now().toString(36)}`,
      tripId: activeTrip.id,
      dayIndex: formDay,
      time: formTime || '09:00',
      title: formTitle.trim(),
      location: formLocation.trim(),
      category: formCategory,
      description: formDescription.trim(),
      notes: formNotes.trim(),
      imageUrl: formImageUrl || undefined,
      order: nextOrder,
    };

    await saveActivity(record, !editingActivity);
    showToast(editingActivity ? `Updated "${record.title}"` : `Added "${record.title}"`);
    setModalOpen(false);
  };

  const handleMove = async (dayIdx: number, actId: string, direction: -1 | 1) => {
    if (!activeTrip) return;
    const dayActs = tripActivities.filter((a) => a.dayIndex === dayIdx);
    const idx = dayActs.findIndex((a) => a.id === actId);
    const swapIdx = idx + direction;
    if (idx === -1 || swapIdx < 0 || swapIdx >= dayActs.length) return;

    const reordered = [...dayActs];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(swapIdx, 0, moved);
    await reorderDayActivities(
      activeTrip.id,
      dayIdx,
      reordered.map((a) => a.id)
    );
    showToast('Updated activity order', 'info');
  };

  if (!activeTrip) {
    return (
      <div className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
        <p className="text-base font-semibold text-[#172B42] dark:text-white">No trip selected</p>
        <p className="mt-1 text-sm text-[#718096] dark:text-slate-400">
          Create or select a trip to build your day-by-day itinerary.
        </p>
      </div>
    );
  }

  const duration = getTripDurationDays(activeTrip.departureDate, activeTrip.returnDate);
  const visibleDays =
    selectedDay === 'all' ? days : days.filter((d) => d.dayIndex === selectedDay);

  return (
    <div className="space-y-6">
      {/* Trip Header Summary */}
      <section className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#718096] dark:text-slate-400">
            <span className="font-semibold text-[#1687D9] dark:text-sky-400">{activeTrip.name}</span>
            <span aria-hidden="true">·</span>
            <span>
              {activeTrip.destination}, {activeTrip.country}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{duration} days</span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-[#172B42] dark:text-white">
            Day-by-Day Itinerary
          </h2>
          <p className="mt-0.5 text-sm text-[#718096] dark:text-slate-400 tabular-nums">
            {formatDisplayDate(activeTrip.departureDate, preferences.dateFormat)} –{' '}
            {formatDisplayDate(activeTrip.returnDate, preferences.dateFormat)}
          </p>
        </div>

        <div className="no-print flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-[#E5ECF3] dark:border-slate-700 px-3.5 py-2 text-sm font-medium text-[#172B42] dark:text-slate-200 hover:bg-[#F5F8FC] dark:hover:bg-slate-800"
          >
            <Printer className="h-4 w-4 text-[#718096]" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={() => openAddModal(0)}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Activity</span>
          </button>
        </div>
      </section>

      {/* Day Navigation Tabs */}
      <div
        className="no-print flex items-center gap-2 overflow-x-auto lg:overflow-visible lg:flex-wrap pb-1"
        role="tablist"
        aria-label="Itinerary days"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedDay === 'all'}
          onClick={() => setSelectedDay('all')}
          className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
            selectedDay === 'all'
              ? 'bg-[#1687D9] text-white border-[#1687D9]'
              : 'bg-white dark:bg-slate-900 text-[#718096] dark:text-slate-300 border-[#E5ECF3] dark:border-slate-800 hover:text-[#172B42]'
          }`}
        >
          All Days ({tripActivities.length})
        </button>

        {days.map((day) => {
          const count = tripActivities.filter((a) => a.dayIndex === day.dayIndex).length;
          const active = selectedDay === day.dayIndex;
          return (
            <button
              key={day.dayIndex}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedDay(day.dayIndex)}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                active
                  ? 'bg-[#1687D9] text-white border-[#1687D9]'
                  : 'bg-white dark:bg-slate-900 text-[#718096] dark:text-slate-300 border-[#E5ECF3] dark:border-slate-800 hover:text-[#172B42]'
              }`}
            >
              Day {day.dayNumber} · {day.shortDate} ({count})
            </button>
          );
        })}
      </div>

      {/* Vertical Timeline */}
      <div className="space-y-6">
        {visibleDays.map((day) => {
          const dayActs = tripActivities.filter((a) => a.dayIndex === day.dayIndex);
          return (
            <section
              key={day.dayIndex}
              className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
            >
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#E5ECF3] dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EBF5FF] dark:bg-sky-950 text-[#1687D9] dark:text-sky-400">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-[#172B42] dark:text-white">
                      Day {day.dayNumber} — {day.longDate}
                    </h3>
                    <p className="text-xs text-[#718096] dark:text-slate-400 tabular-nums">
                      {dayActs.length} {dayActs.length === 1 ? 'activity' : 'activities'} planned
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openAddModal(day.dayIndex)}
                  className="no-print min-h-[36px] inline-flex items-center gap-1 rounded-xl border border-[#E5ECF3] dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-[#1687D9] dark:text-sky-400 hover:bg-[#F5F8FC] dark:hover:bg-slate-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add to Day {day.dayNumber}</span>
                </button>
              </div>

              {dayActs.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-[#718096] dark:text-slate-400">
                    No activities scheduled for Day {day.dayNumber} yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => openAddModal(day.dayIndex)}
                    className="mt-3 min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-[#EBF5FF] dark:bg-sky-950/60 px-3.5 py-1.5 text-xs font-semibold text-[#1687D9] dark:text-sky-300"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Schedule First Activity
                  </button>
                </div>
              ) : (
                <ol className="mt-5 space-y-4">
                  {dayActs.map((act, idx) => (
                    <li key={act.id} className="relative flex gap-3 sm:gap-5">
                      {/* Time Column */}
                      <div className="w-12 sm:w-14 shrink-0 pt-2 text-right font-mono text-xs font-semibold tabular-nums text-[#172B42] dark:text-slate-200">
                        {act.time}
                      </div>

                      {/* Vertical Timeline Rail & Dot */}
                      <div className="relative flex flex-col items-center shrink-0">
                        <span className="mt-2.5 h-3 w-3 rounded-full bg-[#1687D9] ring-4 ring-[#EBF5FF] dark:ring-sky-950 z-10" />
                        {idx < dayActs.length - 1 && (
                          <span className="w-0.5 flex-1 bg-[#D4E7FA] dark:bg-slate-700 mt-1" />
                        )}
                      </div>

                      {/* Activity Card */}
                      <div className="flex-1 min-w-0 rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-[#F5F8FC]/60 dark:bg-slate-800/50 p-4 flex flex-col sm:flex-row gap-4">
                        {act.imageUrl ? (
                          <div className="w-full sm:w-28 h-24 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-[#E5ECF3] dark:border-slate-700">
                            <ImageWithFallback
                              src={act.imageUrl}
                              alt={act.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : null}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-[#1687D9] dark:text-sky-400 font-semibold">
                            <ActivityCategoryIcon category={act.category} className="h-3.5 w-3.5" />
                            <span>{act.category}</span>
                          </div>
                          <h4 className="mt-1 text-base font-bold text-[#172B42] dark:text-white">
                            {act.title}
                          </h4>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-[#718096] dark:text-slate-400">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span>{act.location}</span>
                          </p>
                          {act.description ? (
                            <p className="mt-2 text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
                              {act.description}
                            </p>
                          ) : null}
                          {act.notes ? (
                            <p className="mt-1.5 text-xs text-[#718096] dark:text-slate-400">
                              Note: {act.notes}
                            </p>
                          ) : null}
                        </div>

                        <div className="no-print flex sm:flex-col items-center justify-end sm:justify-start gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMove(day.dayIndex, act.id, -1)}
                            aria-label={`Move ${act.title} up`}
                            className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[#718096] hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === dayActs.length - 1}
                            onClick={() => handleMove(day.dayIndex, act.id, 1)}
                            aria-label={`Move ${act.title} down`}
                            className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[#718096] hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(act)}
                            aria-label={`Edit ${act.title}`}
                            className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[#718096] hover:bg-white hover:text-[#1687D9] dark:hover:bg-slate-700"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingActivity(act)}
                            aria-label={`Delete ${act.title}`}
                            className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[#718096] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>

      {/* Add / Edit Activity Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingActivity ? 'Edit Activity' : 'Add Itinerary Activity'}
        subtitle={activeTrip.name}
      >
        <form onSubmit={handleSaveActivity} className="space-y-4">
          {formError ? (
            <p className="rounded-xl bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400">
              {formError}
            </p>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="act-day" className="block text-xs font-semibold text-[#172B42] dark:text-slate-200 mb-1">
                Travel Day
              </label>
              <select
                id="act-day"
                value={formDay}
                onChange={(e) => setFormDay(Number(e.target.value))}
                className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              >
                {days.map((d) => (
                  <option key={d.dayIndex} value={d.dayIndex}>
                    Day {d.dayNumber} ({d.shortDate})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="act-time" className="block text-xs font-semibold text-[#172B42] dark:text-slate-200 mb-1">
                Time
              </label>
              <input
                id="act-time"
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="act-category" className="block text-xs font-semibold text-[#172B42] dark:text-slate-200 mb-1">
                Category
              </label>
              <select
                id="act-category"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as ActivityCategory)}
                className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              >
                {ACTIVITY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="act-title" className="block text-xs font-semibold text-[#172B42] dark:text-slate-200 mb-1">
              Activity Title
            </label>
            <input
              id="act-title"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Visit Nishiki Market"
              className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="act-location" className="block text-xs font-semibold text-[#172B42] dark:text-slate-200 mb-1">
              Location
            </label>
            <input
              id="act-location"
              type="text"
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
              placeholder="e.g. Nakagyo Ward, Kyoto"
              className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="act-desc" className="block text-xs font-semibold text-[#172B42] dark:text-slate-200 mb-1">
              Description
            </label>
            <textarea
              id="act-desc"
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Key details or plan for this stop..."
              className="w-full rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="act-notes" className="block text-xs font-semibold text-[#172B42] dark:text-slate-200 mb-1">
                Transit / Logistics Notes
              </label>
              <input
                id="act-notes"
                type="text"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Ticket code, entrance gate..."
                className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="act-photo" className="block text-xs font-semibold text-[#172B42] dark:text-slate-200 mb-1">
                Thumbnail Photo
              </label>
              <select
                id="act-photo"
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              >
                {PHOTO_PRESETS.map((p) => (
                  <option key={p.label} value={p.url}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5ECF3] dark:border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 px-4 text-sm font-medium text-[#718096] dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-5 text-sm font-semibold text-white"
            >
              {editingActivity ? 'Save Changes' : 'Add Activity'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deletingActivity}
        onClose={() => setDeletingActivity(null)}
        onConfirm={async () => {
          if (deletingActivity) {
            await deleteActivity(deletingActivity.id);
            showToast(`Removed "${deletingActivity.title}"`, 'info');
          }
        }}
        title="Delete Activity?"
        message={`Remove "${deletingActivity?.title}" from your itinerary?`}
        confirmLabel="Delete"
      />
    </div>
  );
};
