import React, { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { COVER_IMAGES } from '../../data/seedData';
import { useTravel } from '../../context/TravelContext';
import type { CurrencyCode, Trip, TripDraft } from '../../types/travel';
import { deriveTripStatus, validateTripStep } from '../../utils/travelMath';

interface TripWizardModalProps {
  open: boolean;
  onClose: () => void;
  editingTrip?: Trip | null;
}

const COVER_CHOICES = [
  { label: 'Japan & Pagoda', url: COVER_IMAGES.japan },
  { label: 'Bali Coast', url: COVER_IMAGES.bali },
  { label: 'Seoul Skyline', url: COVER_IMAGES.seoul },
  { label: 'Shibuya City', url: COVER_IMAGES.shibuya },
  { label: 'Kyoto Shrine', url: COVER_IMAGES.fushimi },
];

const TRAVEL_STYLES = [
  'Cultural & Culinary',
  'Coastal Relaxation',
  'Urban & Design',
  'Adventure & Nature',
  'Family & Leisure',
  'Business & Bleisure',
];

const ACCOMMODATIONS = [
  'Boutique Hotel',
  'Resort & Spa',
  'Private Villa',
  'City Apartment',
  'Modern Hotel',
  'Ryokan / Heritage Stay',
];

const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Travelers' },
  { id: 3, label: 'Budget' },
  { id: 4, label: 'Preferences' },
];

export const TripWizardModal: React.FC<TripWizardModalProps> = ({
  open,
  onClose,
  editingTrip = null,
}) => {
  const { preferences, saveTrip, showToast } = useTravel();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [draft, setDraft] = useState<TripDraft>({
    name: '',
    destination: '',
    country: '',
    departureDate: '2026-12-01',
    returnDate: '2026-12-08',
    adults: 2,
    children: 0,
    travelerNamesText: preferences.userName,
    budget: 3000,
    currency: preferences.currency,
    travelStyle: 'Cultural & Culinary',
    accommodationPreference: 'Boutique Hotel',
    description: '',
    coverImage: COVER_IMAGES.japan,
  });

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setErrors({});
    if (editingTrip) {
      setDraft({
        name: editingTrip.name,
        destination: editingTrip.destination,
        country: editingTrip.country,
        departureDate: editingTrip.departureDate,
        returnDate: editingTrip.returnDate,
        adults: editingTrip.adults,
        children: editingTrip.children,
        travelerNamesText: editingTrip.travelerNames.join(', '),
        budget: editingTrip.budget,
        currency: editingTrip.currency,
        travelStyle: editingTrip.travelStyle,
        accommodationPreference: editingTrip.accommodationPreference,
        description: editingTrip.description,
        coverImage: editingTrip.coverImage || COVER_IMAGES.japan,
      });
    } else {
      setDraft({
        name: '',
        destination: '',
        country: '',
        departureDate: '2026-12-01',
        returnDate: '2026-12-08',
        adults: 2,
        children: 0,
        travelerNamesText: preferences.userName,
        budget: 3000,
        currency: preferences.currency,
        travelStyle: 'Cultural & Culinary',
        accommodationPreference: 'Boutique Hotel',
        description: '',
        coverImage: COVER_IMAGES.japan,
      });
    }
  }, [open, editingTrip, preferences.currency, preferences.userName]);

  const handleNext = () => {
    const stepErrors = validateTripStep(step, draft);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(4, s + 1));
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep < step) {
      setErrors({});
      setStep(targetStep);
      return;
    }
    for (let s = step; s < targetStep; s++) {
      const errs = validateTripStep(s, draft);
      if (Object.keys(errs).length > 0) {
        setStep(s);
        setErrors(errs);
        return;
      }
    }
    setErrors({});
    setStep(targetStep);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      handleNext();
      return;
    }
    for (let s = 1; s <= 4; s++) {
      const stepErrors = validateTripStep(s, draft);
      if (Object.keys(stepErrors).length > 0) {
        setStep(s);
        setErrors(stepErrors);
        return;
      }
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const travelerNames = draft.travelerNamesText
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);

      const trip: Trip = {
        id: editingTrip?.id ?? `trip-${Date.now().toString(36)}`,
        name: draft.name.trim(),
        destination: draft.destination.trim(),
        country: draft.country.trim(),
        departureDate: draft.departureDate,
        returnDate: draft.returnDate,
        adults: draft.adults,
        children: draft.children,
        travelerNames: travelerNames.length > 0 ? travelerNames : [preferences.userName],
        budget: Number(draft.budget),
        currency: draft.currency,
        travelStyle: draft.travelStyle,
        accommodationPreference: draft.accommodationPreference,
        description: draft.description.trim(),
        coverImage: draft.coverImage,
        status:
          editingTrip?.status === 'archived'
            ? 'archived'
            : deriveTripStatus(draft.departureDate, draft.returnDate),
        createdAt: editingTrip?.createdAt ?? now,
        updatedAt: now,
      };

      await saveTrip(trip, !editingTrip);
      showToast(editingTrip ? `Updated "${trip.name}"` : `Created "${trip.name}"`);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingTrip ? 'Edit Trip' : 'Create New Trip'}
      subtitle={`Step ${step} of 4 · ${STEPS[step - 1].label}`}
      maxWidth="max-w-2xl"
    >
      {/* Stepper */}
      <nav aria-label="Trip creation steps" className="mb-6">
        <ol className="grid grid-cols-4 gap-2">
          {STEPS.map((item) => {
            const isCompleted = item.id < step;
            const isActive = item.id === step;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleStepClick(item.id)}
                  className={`w-full flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                    isActive
                      ? 'border-[#1687D9] bg-[#EBF5FF] text-[#1687D9] dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-700'
                      : isCompleted
                        ? 'border-[#20B486]/40 bg-emerald-50/60 text-[#20B486] dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                        : 'border-[#E5ECF3] bg-[#F5F8FC] text-[#718096] dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400'
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                      isActive
                        ? 'bg-[#1687D9] text-white'
                        : isCompleted
                          ? 'bg-[#20B486] text-white'
                          : 'bg-white text-[#718096] dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {isCompleted ? <Check className="h-3 w-3" /> : item.id}
                  </span>
                  <span className="text-xs font-semibold truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="trip-name" className="block text-sm font-medium text-[#172B42] dark:text-slate-200 mb-1.5">
                Trip Name
              </label>
              <input
                id="trip-name"
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Northern Italy Autumn Tour"
                className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-[#172B42] dark:text-slate-100 focus:border-[#1687D9] focus:outline-none"
              />
              {errors.name ? <p className="mt-1 text-xs text-rose-600">{errors.name}</p> : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="trip-destination" className="block text-sm font-medium text-[#172B42] dark:text-slate-200 mb-1.5">
                  Destination Cities / Region
                </label>
                <input
                  id="trip-destination"
                  type="text"
                  value={draft.destination}
                  onChange={(e) => setDraft({ ...draft, destination: e.target.value })}
                  placeholder="e.g. Milan, Florence & Rome"
                  className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-[#172B42] dark:text-slate-100 focus:border-[#1687D9] focus:outline-none"
                />
                {errors.destination ? <p className="mt-1 text-xs text-rose-600">{errors.destination}</p> : null}
              </div>

              <div>
                <label htmlFor="trip-country" className="block text-sm font-medium text-[#172B42] dark:text-slate-200 mb-1.5">
                  Country
                </label>
                <input
                  id="trip-country"
                  type="text"
                  value={draft.country}
                  onChange={(e) => setDraft({ ...draft, country: e.target.value })}
                  placeholder="e.g. Italy"
                  className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-[#172B42] dark:text-slate-100 focus:border-[#1687D9] focus:outline-none"
                />
                {errors.country ? <p className="mt-1 text-xs text-rose-600">{errors.country}</p> : null}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="trip-departure" className="block text-sm font-medium text-[#172B42] dark:text-slate-200 mb-1.5">
                  Departure Date
                </label>
                <input
                  id="trip-departure"
                  type="date"
                  value={draft.departureDate}
                  onChange={(e) => setDraft({ ...draft, departureDate: e.target.value })}
                  className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-[#172B42] dark:text-slate-100 focus:border-[#1687D9] focus:outline-none"
                />
                {errors.departureDate ? <p className="mt-1 text-xs text-rose-600">{errors.departureDate}</p> : null}
              </div>

              <div>
                <label htmlFor="trip-return" className="block text-sm font-medium text-[#172B42] dark:text-slate-200 mb-1.5">
                  Return Date
                </label>
                <input
                  id="trip-return"
                  type="date"
                  value={draft.returnDate}
                  onChange={(e) => setDraft({ ...draft, returnDate: e.target.value })}
                  className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-[#172B42] dark:text-slate-100 focus:border-[#1687D9] focus:outline-none"
                />
                {errors.returnDate ? <p className="mt-1 text-xs text-rose-600">{errors.returnDate}</p> : null}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="trip-adults" className="block text-sm font-medium text-[#172B42] dark:text-slate-200 mb-1.5">
                  Number of Adults
                </label>
                <input
                  id="trip-adults"
                  type="number"
                  min={1}
                  max={20}
                  value={draft.adults}
                  onChange={(e) => setDraft({ ...draft, adults: Number(e.target.value) })}
                  className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm tabular-nums text-[#172B42] dark:text-slate-100 focus:border-[#1687D9] focus:outline-none"
                />
                {errors.adults ? <p className="mt-1 text-xs text-rose-600">{errors.adults}</p> : null}
              </div>

              <div>
                <label htmlFor="trip-children" className="block text-sm font-medium text-[#172B42] dark:text-slate-200 mb-1.5">
                  Number of Children
                </label>
                <input
                  id="trip-children"
                  type="number"
                  min={0}
                  max={20}
                  value={draft.children}
                  onChange={(e) => setDraft({ ...draft, children: Number(e.target.value) })}
                  className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm tabular-nums text-[#172B42] dark:text-slate-100 focus:border-[#1687D9] focus:outline-none"
                />
                {errors.children ? <p className="mt-1 text-xs text-rose-600">{errors.children}</p> : null}
              </div>
            </div>

            <div>
              <label htmlFor="trip-traveler-names" className="block text-sm font-medium text-[#172B42] dark:text-slate-200 mb-1.5">
                Traveler Names (comma-separated)
              </label>
              <input
                id="trip-traveler-names"
                type="text"
                value={draft.travelerNamesText}
                onChange={(e) => setDraft({ ...draft, travelerNamesText: e.target.value })}
                placeholder="e.g. Alex Rivera, Maya Chen"
                className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-[#172B42] dark:text-slate-100 focus:border-[#1687D9] focus:outline-none"
              />
              <p className="mt-1.5 text-xs text-[#718096] dark:text-slate-400">
                Total party size: {Math.max(0, draft.adults) + Math.max(0, draft.children)} travelers
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="trip-budget" className="block text-sm font-medium text-[#172B42] dark:text-slate-200 mb-1.5">
                  Total Estimated Budget
                </label>
                <input
                  id="trip-budget"
                  type="number"
                  min={1}
                  step={50}
                  value={draft.budget}
                  onChange={(e) => setDraft({ ...draft, budget: Number(e.target.value) })}
                  className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm tabular-nums text-[#172B42] dark:text-slate-100 focus:border-[#1687D9] focus:outline-none"
                />
                {errors.budget ? <p className="mt-1 text-xs text-rose-600">{errors.budget}</p> : null}
              </div>

              <div>
                <label htmlFor="trip-currency" className="block text-sm font-medium text-[#172B42] dark:text-slate-200 mb-1.5">
                  Trip Currency
                </label>
                <select
                  id="trip-currency"
                  value={draft.currency}
                  onChange={(e) => setDraft({ ...draft, currency: e.target.value as CurrencyCode })}
                  className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-[#172B42] dark:text-slate-100 focus:border-[#1687D9] focus:outline-none"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.currency ? <p className="mt-1 text-xs text-rose-600">{errors.currency}</p> : null}
              </div>
            </div>
            <div className="rounded-xl bg-[#F5F8FC] dark:bg-slate-800/70 border border-[#E5ECF3] dark:border-slate-700 p-3.5 text-xs text-[#718096] dark:text-slate-300">
              You can log individual actual and estimated expenses across Flights, Accommodation, Food, Transportation, Activities, and Shopping at any time on the Budget page.
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="trip-style" className="block text-sm font-medium text-[#172B42] dark:text-slate-200 mb-1.5">
                  Travel Style
                </label>
                <select
                  id="trip-style"
                  value={draft.travelStyle}
                  onChange={(e) => setDraft({ ...draft, travelStyle: e.target.value })}
                  className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-[#172B42] dark:text-slate-100 focus:border-[#1687D9] focus:outline-none"
                >
                  {TRAVEL_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
                {errors.travelStyle ? <p className="mt-1 text-xs text-rose-600">{errors.travelStyle}</p> : null}
              </div>

              <div>
                <label htmlFor="trip-accommodation" className="block text-sm font-medium text-[#172B42] dark:text-slate-200 mb-1.5">
                  Accommodation Preference
                </label>
                <select
                  id="trip-accommodation"
                  value={draft.accommodationPreference}
                  onChange={(e) => setDraft({ ...draft, accommodationPreference: e.target.value })}
                  className="w-full min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-[#172B42] dark:text-slate-100 focus:border-[#1687D9] focus:outline-none"
                >
                  {ACCOMMODATIONS.map((acc) => (
                    <option key={acc} value={acc}>
                      {acc}
                    </option>
                  ))}
                </select>
                {errors.accommodationPreference ? (
                  <p className="mt-1 text-xs text-rose-600">{errors.accommodationPreference}</p>
                ) : null}
              </div>
            </div>

            <div>
              <label htmlFor="trip-description" className="block text-sm font-medium text-[#172B42] dark:text-slate-200 mb-1.5">
                Trip Description & Highlights
              </label>
              <textarea
                id="trip-description"
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Outline key neighborhoods, bucket-list experiences, or travel goals..."
                className="w-full rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-[#172B42] dark:text-slate-100 focus:border-[#1687D9] focus:outline-none"
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-[#172B42] dark:text-slate-200 mb-2">
                Cover Photography
              </span>
              <div className="grid grid-cols-5 gap-2">
                {COVER_CHOICES.map((choice) => {
                  const selected = draft.coverImage === choice.url;
                  return (
                    <button
                      key={choice.label}
                      type="button"
                      onClick={() => setDraft({ ...draft, coverImage: choice.url })}
                      aria-label={`Select ${choice.label} cover`}
                      className={`group relative overflow-hidden rounded-xl border-2 transition-all ${
                        selected
                          ? 'border-[#1687D9] ring-2 ring-[#1687D9]/25'
                          : 'border-transparent hover:border-[#E5ECF3]'
                      }`}
                    >
                      <img
                        src={choice.url}
                        alt={choice.label}
                        referrerPolicy="no-referrer"
                        className="h-14 w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-[#E5ECF3] dark:border-slate-800 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl border border-[#E5ECF3] dark:border-slate-700 px-4 py-2 text-sm font-medium text-[#172B42] dark:text-slate-200 hover:bg-[#F5F8FC] dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 px-4 py-2 text-sm font-medium text-[#718096] dark:text-slate-300 hover:bg-[#F5F8FC] dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              key="wizard-continue-btn"
              type="button"
              onClick={handleNext}
              className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-5 py-2 text-sm font-semibold text-white transition-colors"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              key="wizard-submit-btn"
              type="submit"
              disabled={submitting}
              className="min-h-[42px] inline-flex items-center gap-2 rounded-xl bg-[#1687D9] hover:bg-[#1273BA] disabled:opacity-60 px-5 py-2 text-sm font-semibold text-white transition-colors"
            >
              {submitting ? 'Saving...' : editingTrip ? 'Save Changes' : 'Create Trip'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};
