import React, { useMemo, useState } from 'react';
import { Edit3, NotebookPen, Plus, Search, Trash2 } from 'lucide-react';
import { useTravel } from '../context/TravelContext';
import type { TravelNote } from '../types/travel';
import { formatDisplayDate } from '../utils/travelMath';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { COVER_IMAGES } from '../data/seedData';

const NOTE_IMAGE_PRESETS = [
  { label: 'No cover image', url: '' },
  { label: 'Shibuya Evening', url: COVER_IMAGES.shibuya },
  { label: 'Fushimi Inari Shrine', url: COVER_IMAGES.fushimi },
  { label: 'Japan Pagoda', url: COVER_IMAGES.japan },
  { label: 'Bali Coast', url: COVER_IMAGES.bali },
  { label: 'Seoul Skyline', url: COVER_IMAGES.seoul },
];

export const NotesPage: React.FC = () => {
  const {
    trips,
    activeTrip,
    notes,
    preferences,
    globalSearch,
    saveNote,
    deleteNote,
    showToast,
  } = useTravel();

  const [tripFilter, setTripFilter] = useState<string>('active');
  const [localSearch, setLocalSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<TravelNote | null>(null);
  const [deletingNote, setDeletingNote] = useState<TravelNote | null>(null);

  const [formTripId, setFormTripId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formError, setFormError] = useState('');

  const filteredNotes = useMemo(() => {
    const q = (localSearch || globalSearch).trim().toLowerCase();
    return notes
      .filter((note) => {
        if (tripFilter === 'active' && activeTrip && note.tripId !== activeTrip.id) return false;
        if (tripFilter !== 'all' && tripFilter !== 'active' && note.tripId !== tripFilter) {
          return false;
        }
        if (!q) return true;
        return (
          note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [activeTrip, globalSearch, localSearch, notes, tripFilter]);

  const openAddModal = () => {
    setEditingNote(null);
    setFormTripId(activeTrip?.id ?? trips[0]?.id ?? '');
    setFormTitle('');
    setFormContent('');
    setFormImageUrl('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (note: TravelNote) => {
    setEditingNote(note);
    setFormTripId(note.tripId);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormImageUrl(note.imageUrl ?? '');
    setFormError('');
    setModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      setFormError('Title and journal content are required.');
      return;
    }
    const now = new Date().toISOString();
    const record: TravelNote = {
      id: editingNote?.id ?? `note-${Date.now().toString(36)}`,
      tripId: formTripId || activeTrip?.id || '',
      title: formTitle.trim(),
      content: formContent.trim(),
      imageUrl: formImageUrl || undefined,
      createdAt: editingNote?.createdAt ?? now,
      updatedAt: now,
    };
    await saveNote(record, !editingNote);
    showToast(editingNote ? 'Travel note updated' : 'Travel note created');
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#172B42] dark:text-white">Travel Journal &amp; Notes</h2>
          <p className="mt-0.5 text-sm text-[#718096] dark:text-slate-400">
            Capture local dining spots, route reminders, and trip reflections offline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-52">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#718096]" />
            <input
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search notes..."
              aria-label="Search travel notes"
              className="w-full h-10 rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 text-sm focus:border-[#1687D9] focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter notes by trip"
            value={tripFilter}
            onChange={(e) => setTripFilter(e.target.value)}
            className="h-10 rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-medium"
          >
            <option value="active">Current Trip ({activeTrip?.name ?? 'All'})</option>
            <option value="all">All Trips</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={openAddModal}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#1687D9] hover:bg-[#1273BA] px-4 py-2 text-sm font-semibold text-white whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Editorial Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
          <NotebookPen className="mx-auto h-10 w-10 text-[#1687D9]" />
          <p className="mt-3 text-base font-semibold">No travel notes yet</p>
          <p className="mt-1 text-sm text-[#718096] dark:text-slate-400">
            Write down restaurant recommendations, phrasebook reminders, or daily highlights.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-4 min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#1687D9] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Write First Note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredNotes.map((note) => {
            const trip = trips.find((t) => t.id === note.tripId);
            return (
              <article
                key={note.id}
                className="rounded-2xl border border-[#E5ECF3] dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col"
              >
                {note.imageUrl ? (
                  <div className="aspect-[16/8] bg-[#F5F8FC] dark:bg-slate-800 overflow-hidden">
                    <ImageWithFallback
                      src={note.imageUrl}
                      alt={note.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-[#718096] dark:text-slate-400">
                      <span className="font-semibold text-[#1687D9] dark:text-sky-400">
                        {trip?.name ?? 'General Note'}
                      </span>
                      <span className="tabular-nums">
                        {formatDisplayDate(note.updatedAt, preferences.dateFormat)}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-lg font-bold text-[#172B42] dark:text-white leading-snug">
                      {note.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#475569] dark:text-slate-300 whitespace-pre-line">
                      {note.content}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E5ECF3] dark:border-slate-800 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(note)}
                      aria-label={`Edit ${note.title}`}
                      className="min-h-[36px] inline-flex items-center gap-1 rounded-lg px-3 text-xs font-medium text-[#718096] hover:bg-[#F5F8FC] hover:text-[#1687D9] dark:hover:bg-slate-800"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingNote(note)}
                      aria-label={`Delete ${note.title}`}
                      className="min-h-[36px] inline-flex items-center gap-1 rounded-lg px-3 text-xs font-medium text-[#718096] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Create / Edit Note Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingNote ? 'Edit Travel Note' : 'New Travel Note'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {formError}
            </p>
          ) : null}

          <div>
            <label htmlFor="note-trip" className="block text-xs font-semibold mb-1">
              Trip
            </label>
            <select
              id="note-trip"
              value={formTripId}
              onChange={(e) => setFormTripId(e.target.value)}
              className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="note-title" className="block text-xs font-semibold mb-1">
              Title
            </label>
            <input
              id="note-title"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Kyoto Morning Bakery & Coffee Route"
              className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="note-content" className="block text-xs font-semibold mb-1">
              Journal Entry
            </label>
            <textarea
              id="note-content"
              rows={5}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Write your notes, directions, or memories..."
              className="w-full rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="note-preset" className="block text-xs font-semibold mb-1">
                Cover Image Preset
              </label>
              <select
                id="note-preset"
                value={formImageUrl.startsWith('data:') ? '' : formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-[#E5ECF3] dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              >
                {NOTE_IMAGE_PRESETS.map((p) => (
                  <option key={p.label} value={p.url}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="note-upload" className="block text-xs font-semibold mb-1">
                Or Upload Photo
              </label>
              <input
                id="note-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-xs text-[#718096] file:mr-3 file:rounded-lg file:border-0 file:bg-[#EBF5FF] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#1687D9]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5ECF3] dark:border-slate-800 flex justify-end gap-2">
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
              {editingNote ? 'Save Note' : 'Create Note'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deletingNote}
        onClose={() => setDeletingNote(null)}
        onConfirm={async () => {
          if (deletingNote) {
            await deleteNote(deletingNote.id);
            showToast('Travel note deleted', 'info');
          }
        }}
        title="Delete Travel Note?"
        message={`Delete "${deletingNote?.title}" permanently?`}
        confirmLabel="Delete"
      />
    </div>
  );
};
