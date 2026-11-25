import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  FileCheck,
  Info,
  Plus,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useTravel } from '../context/TravelContext';
import type { Booking, BookingCategory, BookingStatus } from '../types/travel';
import { formatCurrency } from '../utils/travelMath';
import { ActivityCategoryIcon } from '../components/ui/CategoryIcon';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

const BOOKING_CATEGORIES: Array<'All' | BookingCategory> = [
  'All',
  'Flights',
  'Hotels',
  'Transportation',
  'Restaurants',
  'Activities',
  'Other',
];

const STATUS_META: Record<
  BookingStatus,
  { color: string; icon: React.FC<{ className?: string }> }
> = {
  Confirmed: { color: 'text-[#20B486] dark:text-emerald-400', icon: CheckCircle2 },
  Pending: { color: 'text-[#F5A623] dark:text-amber-400', icon: Clock },
  Cancelled: { color: 'text-rose-600 dark:text-rose-400', icon: XCircle },
};

export const BookingsPage: React.FC = () => {
  const {
    activeTrip,
    bookings,
    preferences,
    globalSearch,
    saveBooking,
    deleteBooking,
    showToast,
  } = useTravel();

  const [categoryFilter, setCategoryFilter] = useState<'All' | BookingCategory>('All');
  const [localSearch, setLocalSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [deletingBooking, setDeletingBooking] = useState<Booking | null>(null);

  // Form fields
  const [formCategory, setFormCategory] = useState<BookingCategory>('Flights');
  const [formTitle, setFormTitle] = useState('');
  const [formReference, setFormReference] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formDateTime, setFormDateTime] = useState('2026-10-31T09:00');
  const [formPrice, setFormPrice] = useState('0');
  const [formStatus, setFormStatus] = useState<BookingStatus>('Confirmed');
  const [formDetails, setFormDetails] = useState('');
  const [formAttachmentName, setFormAttachmentName] = useState('');
  const [formAttachmentData, setFormAttachmentData] = useState('');
  const [formError, setFormError] = useState('');

  const filteredBookings = useMemo(() => {
    const q = (localSearch || globalSearch).trim().toLowerCase();
    return bookings.filter((b) => {
      if (activeTrip && b.tripId !== activeTrip.id) return false;
      if (categoryFilter !== 'All' && b.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.provider.toLowerCase().includes(q) ||
        b.reference.toLowerCase().includes(q)
      );
    });
  }, [activeTrip, bookings, categoryFilter, globalSearch, localSearch]);

  const openAddModal = () => {
    setEditingBooking(null);
    setFormCategory('Flights');
    setFormTitle('');
    setFormReference('');
    setFormProvider('');
    setFormDateTime(activeTrip ? `${activeTrip.departureDate}T10:00` : '2026-10-31T10:00');
    setFormPrice('');
    setFormStatus('Confirmed');
    setFormDetails('');
    setFormAttachmentName('');
    setFormAttachmentData('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (booking: Booking) => {
    setEditingBooking(booking);
    setFormCategory(booking.category);
    setFormTitle(booking.title);
    setFormReference(booking.reference);
    setFormProvider(booking.provider);
    setFormDateTime(booking.dateTime);
    setFormPrice(String(booking.price));
    setFormStatus(booking.status);
    setFormDetails(booking.confirmationDetails);
    setFormAttachmentName(booking.attachmentName ?? '');
    setFormAttachmentData(booking.attachmentDataUrl ?? '');
    setFormError('');
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormAttachmentData(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;
    if (!formTitle.trim() || !formProvider.trim() || !formReference.trim()) {
      setFormError('Title, provider name, and booking reference are required.');
      return;
    }

    const record: Booking = {
      id: editingBooking?.id ?? `bkg-${Date.now().toString(36)}`,
      tripId: activeTrip.id,
      category: formCategory,
      title: formTitle.trim(),
      reference: formReference.trim(),
      provider: formProvider.trim(),
      dateTime: formDateTime,
      price: Math.max(0, Number(formPrice) || 0),
      status: formStatus,
      confirmationDetails: formDetails.trim(),
      attachmentName: formAttachmentName || undefined,
      attachmentDataUrl: formAttachmentData || undefined,
    };

    await saveBooking(record, !editingBooking);
    showToast(editingBooking ? `Updated "${record.title}"` : `Added booking "${record.title}"`);
    setModalOpen(false);
  };

  const currency = activeTrip?.currency ?? preferences.currency;

  return (
    <div className="space-y-6">
      {/* External Booking Organizer Notice */}
      <div className="rounded-2xl border border-[#D4E7FA] dark:border-sky-900/60 bg-[#EBF5FF]/70 dark:bg-sky-950/30 px-4 py-3 flex items-start gap-3 text-xs sm:text-sm text-[#172B42] dark:text-slate-200">
        <Info className="h-4 w-4 text-[#1687D9] shrink-0 mt-0.5" />
        <span>
          Bookings are organized locally from reservations you made with external airlines, hotels, and providers.
        </span>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Filter bookings by category"
        >
          {BOOKING_CATEGORIES.map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategoryFilter(cat)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#1687D9] text-white border-[#1687D9]'
                    : 'bg-white dark:bg-slate-900 text-[#718096] dark:text-slate-300 border-[#E5ECF3] dark:border-slate-800 hover:text-[#172B42]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative flex-1 sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718096]" />
            <input
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search reference or provider..."
              aria-label="Search bookings"
              className="w-full h-10 rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 text-sm focus:border-[#1687D9] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-4 py-2 text-sm font-semibold text-white whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Booking</span>
          </button>
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
          <p className="text-base font-semibold text-[#172B42] dark:text-white">No bookings found</p>
          <p className="mt-1 text-sm text-[#718096] dark:text-slate-400">
            Add confirmation numbers and details for your flights, hotels, or tours.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-4 min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#1687D9] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Add First Booking
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((b) => {
            const statusInfo = STATUS_META[b.status];
            const StatusIcon = statusInfo.icon;
            return (
              <article
                key={b.id}
                className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EBF5FF] dark:bg-sky-950 text-[#1687D9] dark:text-sky-400">
                        <ActivityCategoryIcon category={b.category} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-[#718096] dark:text-slate-400">
                          {b.category} · {b.provider}
                        </span>
                        <h3 className="text-base font-bold text-[#172B42] dark:text-white truncate">
                          {b.title}
                        </h3>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${statusInfo.color}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {b.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F5F8FC] dark:bg-slate-800/60 p-3 text-xs">
                    <div>
                      <span className="block text-[#718096] dark:text-slate-400">Reference</span>
                      <span className="font-mono font-semibold text-[#172B42] dark:text-slate-100">
                        {b.reference}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[#718096] dark:text-slate-400">Date &amp; Time</span>
                      <span className="font-semibold tabular-nums text-[#172B42] dark:text-slate-100">
                        {b.dateTime.replace('T', ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[#718096] dark:text-slate-400">Price</span>
                      <span className="font-bold tabular-nums text-[#172B42] dark:text-slate-100">
                        {formatCurrency(b.price, currency)}
                      </span>
                    </div>
                  </div>

                  {b.confirmationDetails ? (
                    <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
                      {b.confirmationDetails}
                    </p>
                  ) : null}

                  {b.attachmentName ? (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-[#1687D9] dark:text-sky-400">
                      <FileCheck className="h-3.5 w-3.5" />
                      <span>Attachment: {b.attachmentName}</span>
                    </p>
                  ) : null}
                </div>

                <div className="pt-3 border-t border-[#E5ECF3] dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingBooking(b)}
                    className="min-h-[36px] inline-flex items-center gap-1.5 rounded-xl bg-[#F5F8FC] dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-[#172B42] dark:text-slate-200 hover:bg-[#EBF5FF] hover:text-[#1687D9]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Details</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(b)}
                      aria-label={`Edit ${b.title}`}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#718096] hover:bg-[#F5F8FC] hover:text-[#1687D9] dark:hover:bg-slate-800"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingBooking(b)}
                      aria-label={`Delete ${b.title}`}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#718096] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBooking ? 'Edit Booking' : 'Add External Booking'}
        subtitle={activeTrip?.name}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError ? (
            <p className="rounded-xl bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400">
              {formError}
            </p>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="bkg-cat" className="block text-xs font-semibold mb-1">
                Category
              </label>
              <select
                id="bkg-cat"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as BookingCategory)}
                className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              >
                {BOOKING_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bkg-status" className="block text-xs font-semibold mb-1">
                Status
              </label>
              <select
                id="bkg-status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as BookingStatus)}
                className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              >
                <option value="Confirmed">Confirmed</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="bkg-title" className="block text-xs font-semibold mb-1">
              Booking Title
            </label>
            <input
              id="bkg-title"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. ANA Flight NH110"
              className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="bkg-provider" className="block text-xs font-semibold mb-1">
                Provider Name
              </label>
              <input
                id="bkg-provider"
                type="text"
                value={formProvider}
                onChange={(e) => setFormProvider(e.target.value)}
                placeholder="e.g. All Nippon Airways"
                className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="bkg-ref" className="block text-xs font-semibold mb-1">
                Booking Reference
              </label>
              <input
                id="bkg-ref"
                type="text"
                value={formReference}
                onChange={(e) => setFormReference(e.target.value)}
                placeholder="e.g. ANA-NH110-782"
                className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="bkg-dt" className="block text-xs font-semibold mb-1">
                Date &amp; Time
              </label>
              <input
                id="bkg-dt"
                type="datetime-local"
                value={formDateTime}
                onChange={(e) => setFormDateTime(e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              />
            </div>

            <div>
              <label htmlFor="bkg-price" className="block text-xs font-semibold mb-1">
                Price ({currency})
              </label>
              <input
                id="bkg-price"
                type="number"
                min={0}
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm tabular-nums"
              />
            </div>
          </div>

          <div>
            <label htmlFor="bkg-details" className="block text-xs font-semibold mb-1">
              Confirmation Details
            </label>
            <textarea
              id="bkg-details"
              rows={2}
              value={formDetails}
              onChange={(e) => setFormDetails(e.target.value)}
              placeholder="Seat numbers, check-in window, cancellation policy..."
              className="w-full rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="bkg-file" className="block text-xs font-semibold mb-1">
              Optional Confirmation Attachment
            </label>
            <input
              id="bkg-file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.svg,.txt"
              onChange={handleFileChange}
              className="w-full text-xs text-[#718096] file:mr-3 file:rounded-lg file:border-0 file:bg-[#EBF5FF] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#1687D9]"
            />
            {formAttachmentName ? (
              <p className="mt-1 text-xs text-[#20B486]">Attached: {formAttachmentName}</p>
            ) : null}
          </div>

          <div className="pt-3 border-t border-[#E5ECF3] dark:border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 px-4 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-5 text-sm font-semibold text-white"
            >
              {editingBooking ? 'Save Changes' : 'Save Booking'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal
        open={!!viewingBooking}
        onClose={() => setViewingBooking(null)}
        title={viewingBooking?.title ?? 'Booking Details'}
        subtitle={viewingBooking ? `${viewingBooking.category} · ${viewingBooking.provider}` : undefined}
      >
        {viewingBooking ? (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-[#F5F8FC] dark:bg-slate-800/70 p-4">
              <div>
                <dt className="text-xs text-[#718096] dark:text-slate-400">Reference Code</dt>
                <dd className="font-mono font-semibold">{viewingBooking.reference}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#718096] dark:text-slate-400">Status</dt>
                <dd className="font-semibold">{viewingBooking.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#718096] dark:text-slate-400">Date &amp; Time</dt>
                <dd className="tabular-nums font-medium">{viewingBooking.dateTime.replace('T', ' ')}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#718096] dark:text-slate-400">Amount</dt>
                <dd className="tabular-nums font-bold">{formatCurrency(viewingBooking.price, currency)}</dd>
              </div>
            </dl>
            <div>
              <h4 className="text-xs font-semibold text-[#718096] dark:text-slate-400 mb-1">
                Confirmation Notes
              </h4>
              <p className="text-[#172B42] dark:text-slate-200 leading-relaxed">
                {viewingBooking.confirmationDetails || 'No extra confirmation notes.'}
              </p>
            </div>
            {viewingBooking.attachmentDataUrl ? (
              <div>
                <h4 className="text-xs font-semibold text-[#718096] dark:text-slate-400 mb-2">
                  Attachment ({viewingBooking.attachmentName})
                </h4>
                {viewingBooking.attachmentDataUrl.startsWith('data:image/') ? (
                  <img
                    src={viewingBooking.attachmentDataUrl}
                    alt={viewingBooking.attachmentName ?? 'Confirmation attachment'}
                    className="max-h-64 rounded-xl border border-[#E5ECF3] dark:border-slate-700"
                  />
                ) : (
                  <a
                    href={viewingBooking.attachmentDataUrl}
                    download={viewingBooking.attachmentName ?? 'confirmation'}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#EBF5FF] px-3 py-2 text-xs font-semibold text-[#1687D9]"
                  >
                    Download {viewingBooking.attachmentName}
                  </a>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!deletingBooking}
        onClose={() => setDeletingBooking(null)}
        onConfirm={async () => {
          if (deletingBooking) {
            await deleteBooking(deletingBooking.id);
            showToast(`Removed booking "${deletingBooking.title}"`, 'info');
          }
        }}
        title="Delete Booking?"
        message={`Remove "${deletingBooking?.title}" (${deletingBooking?.reference}) from your organizer?`}
        confirmLabel="Delete"
      />
    </div>
  );
};
