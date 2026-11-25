import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  deleteRecord,
  getInitialWorkspaceSync,
  loadOrSeedWorkspaceData,
  loadPreferences,
  putManyRecords,
  putRecord,
  resetWorkspaceToDefaults,
  saveFastCache,
  savePreferences,
  STORES,
  writeAllWorkspaceData,
  type TravelWorkspaceData,
} from '../storage/travelDb';
import { DEFAULT_PREFERENCES } from '../data/seedData';
import type {
  ActivityLogEntry,
  Booking,
  Expense,
  ItineraryActivity,
  PackingItem,
  PackingTemplate,
  TravelDocument,
  TravelNote,
  Trip,
  UserPreferences,
} from '../types/travel';
import type { ToastMessage } from '../components/ui/ToastContainer';

interface TravelContextValue extends TravelWorkspaceData {
  loading: boolean;
  error: string | null;
  preferences: UserPreferences;
  activeTrip: Trip | null;
  toasts: ToastMessage[];
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  showToast: (message: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  setActiveTripId: (tripId: string) => void;
  // Trips
  saveTrip: (trip: Trip, isNew?: boolean) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  duplicateTrip: (trip: Trip) => Promise<Trip>;
  // Activities
  saveActivity: (activity: ItineraryActivity, isNew?: boolean) => Promise<void>;
  deleteActivity: (activityId: string) => Promise<void>;
  reorderDayActivities: (tripId: string, dayIndex: number, orderedIds: string[]) => Promise<void>;
  // Bookings
  saveBooking: (booking: Booking, isNew?: boolean) => Promise<void>;
  deleteBooking: (bookingId: string) => Promise<void>;
  // Packing
  savePackingItem: (item: PackingItem, isNew?: boolean) => Promise<void>;
  deletePackingItem: (itemId: string) => Promise<void>;
  applyPackingTemplate: (tripId: string, template: PackingTemplate) => Promise<void>;
  savePackingTemplate: (template: PackingTemplate) => Promise<void>;
  deletePackingTemplate: (templateId: string) => Promise<void>;
  // Expenses
  saveExpense: (expense: Expense, isNew?: boolean) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  // Documents
  saveDocument: (doc: TravelDocument) => Promise<void>;
  renameDocument: (docId: string, name: string) => Promise<void>;
  deleteDocument: (docId: string) => Promise<void>;
  // Notes
  saveNote: (note: TravelNote, isNew?: boolean) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  // Workspace data management
  exportWorkspaceJSON: () => string;
  importWorkspaceJSON: (rawJson: string) => Promise<void>;
  resetAllData: () => Promise<void>;
}

const TravelContext = createContext<TravelContextValue | null>(null);

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const TravelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(() => loadPreferences());
  const [globalSearch, setGlobalSearch] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [data, setData] = useState<TravelWorkspaceData>(() => getInitialWorkspaceSync());

  const commitState = useCallback(
    (updater: (prev: TravelWorkspaceData) => TravelWorkspaceData) => {
      setData((prev) => {
        const next = updater(prev);
        saveFastCache(next);
        return next;
      });
    },
    []
  );

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (preferences.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [preferences.theme]);

  useEffect(() => {
    let active = true;
    loadOrSeedWorkspaceData()
      .then((loaded) => {
        if (!active) return;
        setData(loaded);
        setPreferences((prev) => {
          const validActive = loaded.trips.some((t) => t.id === prev.activeTripId);
          if (validActive || loaded.trips.length === 0) return prev;
          const next = { ...prev, activeTripId: loaded.trips[0].id };
          savePreferences(next);
          return next;
        });
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load offline storage.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastMessage['type'] = 'success') => {
      const id = makeId('toast');
      setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 3200);
    },
    [dismissToast]
  );

  const updatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next);
      return next;
    });
  }, []);

  const setActiveTripId = useCallback(
    (tripId: string) => {
      updatePreferences({ activeTripId: tripId });
    },
    [updatePreferences]
  );

  const appendLog = useCallback(
    (tripId: string, type: ActivityLogEntry['type'], message: string) => {
      const entry: ActivityLogEntry = {
        id: makeId('log'),
        tripId,
        type,
        message,
        timestamp: new Date().toISOString(),
      };
      commitState((prev) => ({
        ...prev,
        activityLogs: [entry, ...prev.activityLogs].slice(0, 40),
      }));
      void putRecord(STORES.activityLogs, entry);
    },
    [commitState]
  );

  const saveTrip = useCallback(
    async (trip: Trip, isNew = false) => {
      commitState((prev) => {
        const exists = prev.trips.some((t) => t.id === trip.id);
        const trips = exists
          ? prev.trips.map((t) => (t.id === trip.id ? trip : t))
          : [trip, ...prev.trips];
        return { ...prev, trips };
      });
      if (isNew) {
        updatePreferences({ activeTripId: trip.id });
      }
      appendLog(trip.id, 'trip', `${isNew ? 'Created' : 'Updated'} trip "${trip.name}"`);
      void putRecord(STORES.trips, trip);
    },
    [appendLog, commitState, updatePreferences]
  );

  const deleteTrip = useCallback(
    async (tripId: string) => {
      const target = data.trips.find((t) => t.id === tripId);
      const relatedActivities = data.activities.filter((a) => a.tripId === tripId);
      const relatedBookings = data.bookings.filter((b) => b.tripId === tripId);
      const relatedPacking = data.packingItems.filter((p) => p.tripId === tripId);
      const relatedExpenses = data.expenses.filter((e) => e.tripId === tripId);
      const relatedDocs = data.documents.filter((d) => d.tripId === tripId);
      const relatedNotes = data.notes.filter((n) => n.tripId === tripId);

      commitState((prev) => {
        const remainingTrips = prev.trips.filter((t) => t.id !== tripId);
        if (preferences.activeTripId === tripId) {
          updatePreferences({ activeTripId: remainingTrips[0]?.id ?? '' });
        }
        return {
          ...prev,
          trips: remainingTrips,
          activities: prev.activities.filter((a) => a.tripId !== tripId),
          bookings: prev.bookings.filter((b) => b.tripId !== tripId),
          packingItems: prev.packingItems.filter((p) => p.tripId !== tripId),
          expenses: prev.expenses.filter((e) => e.tripId !== tripId),
          documents: prev.documents.filter((d) => d.tripId !== tripId),
          notes: prev.notes.filter((n) => n.tripId !== tripId),
        };
      });
      if (target) {
        showToast(`Deleted "${target.name}"`, 'info');
      }

      void Promise.all([
        deleteRecord(STORES.trips, tripId),
        ...relatedActivities.map((a) => deleteRecord(STORES.activities, a.id)),
        ...relatedBookings.map((b) => deleteRecord(STORES.bookings, b.id)),
        ...relatedPacking.map((p) => deleteRecord(STORES.packingItems, p.id)),
        ...relatedExpenses.map((e) => deleteRecord(STORES.expenses, e.id)),
        ...relatedDocs.map((d) => deleteRecord(STORES.documents, d.id)),
        ...relatedNotes.map((n) => deleteRecord(STORES.notes, n.id)),
      ]);
    },
    [commitState, data, preferences.activeTripId, showToast, updatePreferences]
  );

  const duplicateTrip = useCallback(
    async (trip: Trip): Promise<Trip> => {
      const now = new Date().toISOString();
      const newTripId = makeId('trip');
      const clonedTrip: Trip = {
        ...trip,
        id: newTripId,
        name: `${trip.name} (Copy)`,
        status: trip.status === 'archived' ? 'upcoming' : trip.status,
        createdAt: now,
        updatedAt: now,
      };
      const clonedActivities = data.activities
        .filter((a) => a.tripId === trip.id)
        .map((a) => ({ ...a, id: makeId('act'), tripId: newTripId }));
      const clonedPacking = data.packingItems
        .filter((p) => p.tripId === trip.id)
        .map((p) => ({ ...p, id: makeId('pkg'), tripId: newTripId, packed: false }));

      commitState((prev) => ({
        ...prev,
        trips: [clonedTrip, ...prev.trips],
        activities: [...prev.activities, ...clonedActivities],
        packingItems: [...prev.packingItems, ...clonedPacking],
      }));
      appendLog(newTripId, 'trip', `Duplicated trip "${trip.name}"`);
      showToast(`Duplicated "${trip.name}"`);

      void putRecord(STORES.trips, clonedTrip);
      if (clonedActivities.length) void putManyRecords(STORES.activities, clonedActivities);
      if (clonedPacking.length) void putManyRecords(STORES.packingItems, clonedPacking);
      return clonedTrip;
    },
    [appendLog, commitState, data.activities, data.packingItems, showToast]
  );

  const saveActivity = useCallback(
    async (activity: ItineraryActivity, isNew = false) => {
      commitState((prev) => {
        const exists = prev.activities.some((a) => a.id === activity.id);
        const activities = exists
          ? prev.activities.map((a) => (a.id === activity.id ? activity : a))
          : [...prev.activities, activity];
        return { ...prev, activities };
      });
      appendLog(
        activity.tripId,
        'itinerary',
        `${isNew ? 'Added' : 'Updated'} "${activity.title}" on Day ${activity.dayIndex + 1}`
      );
      void putRecord(STORES.activities, activity);
    },
    [appendLog, commitState]
  );

  const deleteActivity = useCallback(
    async (activityId: string) => {
      commitState((prev) => ({
        ...prev,
        activities: prev.activities.filter((a) => a.id !== activityId),
      }));
      void deleteRecord(STORES.activities, activityId);
    },
    [commitState]
  );

  const reorderDayActivities = useCallback(
    async (tripId: string, dayIndex: number, orderedIds: string[]) => {
      const updatedList: ItineraryActivity[] = [];
      commitState((prev) => {
        const activities = prev.activities.map((act) => {
          if (act.tripId === tripId && act.dayIndex === dayIndex) {
            const newOrder = orderedIds.indexOf(act.id);
            if (newOrder !== -1) {
              const updated = { ...act, order: newOrder + 1 };
              updatedList.push(updated);
              return updated;
            }
          }
          return act;
        });
        return { ...prev, activities };
      });
      if (updatedList.length > 0) {
        void putManyRecords(STORES.activities, updatedList);
      }
    },
    [commitState]
  );

  const saveBooking = useCallback(
    async (booking: Booking, isNew = false) => {
      commitState((prev) => {
        const exists = prev.bookings.some((b) => b.id === booking.id);
        const bookings = exists
          ? prev.bookings.map((b) => (b.id === booking.id ? booking : b))
          : [booking, ...prev.bookings];
        return { ...prev, bookings };
      });
      appendLog(
        booking.tripId,
        'booking',
        `${isNew ? 'Added' : 'Updated'} ${booking.status.toLowerCase()} booking "${booking.title}"`
      );
      void putRecord(STORES.bookings, booking);
    },
    [appendLog, commitState]
  );

  const deleteBooking = useCallback(
    async (bookingId: string) => {
      commitState((prev) => ({
        ...prev,
        bookings: prev.bookings.filter((b) => b.id !== bookingId),
      }));
      void deleteRecord(STORES.bookings, bookingId);
    },
    [commitState]
  );

  const savePackingItem = useCallback(
    async (item: PackingItem, isNew = false) => {
      commitState((prev) => {
        const exists = prev.packingItems.some((p) => p.id === item.id);
        const packingItems = exists
          ? prev.packingItems.map((p) => (p.id === item.id ? item : p))
          : [item, ...prev.packingItems];
        return { ...prev, packingItems };
      });
      if (isNew || item.packed) {
        appendLog(
          item.tripId,
          'packing',
          isNew ? `Added "${item.name}" to packing list` : `Packed "${item.name}"`
        );
      }
      void putRecord(STORES.packingItems, item);
    },
    [appendLog, commitState]
  );

  const deletePackingItem = useCallback(
    async (itemId: string) => {
      commitState((prev) => ({
        ...prev,
        packingItems: prev.packingItems.filter((p) => p.id !== itemId),
      }));
      void deleteRecord(STORES.packingItems, itemId);
    },
    [commitState]
  );

  const applyPackingTemplate = useCallback(
    async (tripId: string, template: PackingTemplate) => {
      const existingNames = new Set(
        data.packingItems
          .filter((p) => p.tripId === tripId)
          .map((p) => p.name.toLowerCase())
      );
      const newItems: PackingItem[] = template.items
        .filter((i) => !existingNames.has(i.name.toLowerCase()))
        .map((i) => ({
          id: makeId('pkg'),
          tripId,
          name: i.name,
          category: i.category,
          packed: false,
          quantity: i.quantity,
        }));
      if (newItems.length === 0) {
        showToast('All items from this template are already in your list.', 'info');
        return;
      }
      commitState((prev) => ({
        ...prev,
        packingItems: [...newItems, ...prev.packingItems],
      }));
      appendLog(tripId, 'packing', `Applied packing template "${template.name}" (${newItems.length} items)`);
      showToast(`Added ${newItems.length} items from "${template.name}"`);
      void putManyRecords(STORES.packingItems, newItems);
    },
    [appendLog, commitState, data.packingItems, showToast]
  );

  const savePackingTemplate = useCallback(
    async (template: PackingTemplate) => {
      commitState((prev) => {
        const exists = prev.packingTemplates.some((t) => t.id === template.id);
        const packingTemplates = exists
          ? prev.packingTemplates.map((t) => (t.id === template.id ? template : t))
          : [template, ...prev.packingTemplates];
        return { ...prev, packingTemplates };
      });
      void putRecord(STORES.packingTemplates, template);
    },
    [commitState]
  );

  const deletePackingTemplate = useCallback(
    async (templateId: string) => {
      commitState((prev) => ({
        ...prev,
        packingTemplates: prev.packingTemplates.filter((t) => t.id !== templateId),
      }));
      void deleteRecord(STORES.packingTemplates, templateId);
    },
    [commitState]
  );

  const saveExpense = useCallback(
    async (expense: Expense, isNew = false) => {
      commitState((prev) => {
        const exists = prev.expenses.some((e) => e.id === expense.id);
        const expenses = exists
          ? prev.expenses.map((e) => (e.id === expense.id ? expense : e))
          : [expense, ...prev.expenses];
        return { ...prev, expenses };
      });
      appendLog(
        expense.tripId,
        'expense',
        `${isNew ? 'Logged' : 'Updated'} ${expense.category} expense: ${expense.description}`
      );
      void putRecord(STORES.expenses, expense);
    },
    [appendLog, commitState]
  );

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      commitState((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((e) => e.id !== expenseId),
      }));
      void deleteRecord(STORES.expenses, expenseId);
    },
    [commitState]
  );

  const saveDocument = useCallback(
    async (doc: TravelDocument) => {
      commitState((prev) => ({
        ...prev,
        documents: [doc, ...prev.documents],
      }));
      appendLog(doc.tripId, 'document', `Uploaded document "${doc.name}" to ${doc.folder}`);
      void putRecord(STORES.documents, doc);
    },
    [appendLog, commitState]
  );

  const renameDocument = useCallback(
    async (docId: string, name: string) => {
      let updated: TravelDocument | undefined;
      commitState((prev) => ({
        ...prev,
        documents: prev.documents.map((d) => {
          if (d.id === docId) {
            updated = { ...d, name };
            return updated;
          }
          return d;
        }),
      }));
      if (updated) {
        void putRecord(STORES.documents, updated);
      }
    },
    [commitState]
  );

  const deleteDocument = useCallback(
    async (docId: string) => {
      commitState((prev) => ({
        ...prev,
        documents: prev.documents.filter((d) => d.id !== docId),
      }));
      void deleteRecord(STORES.documents, docId);
    },
    [commitState]
  );

  const saveNote = useCallback(
    async (note: TravelNote, isNew = false) => {
      commitState((prev) => {
        const exists = prev.notes.some((n) => n.id === note.id);
        const notes = exists
          ? prev.notes.map((n) => (n.id === note.id ? note : n))
          : [note, ...prev.notes];
        return { ...prev, notes };
      });
      appendLog(note.tripId, 'note', `${isNew ? 'Created' : 'Updated'} travel note "${note.title}"`);
      void putRecord(STORES.notes, note);
    },
    [appendLog, commitState]
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      commitState((prev) => ({
        ...prev,
        notes: prev.notes.filter((n) => n.id !== noteId),
      }));
      void deleteRecord(STORES.notes, noteId);
    },
    [commitState]
  );

  const exportWorkspaceJSON = useCallback(() => {
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        preferences,
        data,
      },
      null,
      2
    );
  }, [data, preferences]);

  const importWorkspaceJSON = useCallback(
    async (rawJson: string) => {
      const parsed = JSON.parse(rawJson) as {
        preferences?: UserPreferences;
        data?: Partial<TravelWorkspaceData>;
      };
      if (!parsed?.data || !Array.isArray(parsed.data.trips)) {
        throw new Error('Invalid backup file format. Expected Travel Planner export JSON.');
      }
      const normalized: TravelWorkspaceData = {
        trips: parsed.data.trips ?? [],
        activities: parsed.data.activities ?? [],
        bookings: parsed.data.bookings ?? [],
        packingItems: parsed.data.packingItems ?? [],
        packingTemplates: parsed.data.packingTemplates ?? [],
        expenses: parsed.data.expenses ?? [],
        documents: parsed.data.documents ?? [],
        notes: parsed.data.notes ?? [],
        activityLogs: parsed.data.activityLogs ?? [],
      };
      setData(normalized);
      saveFastCache(normalized);
      if (parsed.preferences) {
        const merged = { ...DEFAULT_PREFERENCES, ...parsed.preferences };
        savePreferences(merged);
        setPreferences(merged);
      }
      showToast('Backup imported successfully');
      await writeAllWorkspaceData(normalized);
    },
    [showToast]
  );

  const resetAllData = useCallback(async () => {
    const fresh = await resetWorkspaceToDefaults();
    setData(fresh);
    setPreferences(DEFAULT_PREFERENCES);
    showToast('Application data reset to sample trips', 'info');
  }, [showToast]);

  const activeTrip = useMemo(() => {
    if (data.trips.length === 0) return null;
    return (
      data.trips.find((t) => t.id === preferences.activeTripId) ??
      data.trips.find((t) => t.status === 'upcoming') ??
      data.trips[0]
    );
  }, [data.trips, preferences.activeTripId]);

  const value: TravelContextValue = useMemo(
    () => ({
      ...data,
      loading,
      error,
      preferences,
      activeTrip,
      toasts,
      globalSearch,
      setGlobalSearch,
      showToast,
      dismissToast,
      updatePreferences,
      setActiveTripId,
      saveTrip,
      deleteTrip,
      duplicateTrip,
      saveActivity,
      deleteActivity,
      reorderDayActivities,
      saveBooking,
      deleteBooking,
      savePackingItem,
      deletePackingItem,
      applyPackingTemplate,
      savePackingTemplate,
      deletePackingTemplate,
      saveExpense,
      deleteExpense,
      saveDocument,
      renameDocument,
      deleteDocument,
      saveNote,
      deleteNote,
      exportWorkspaceJSON,
      importWorkspaceJSON,
      resetAllData,
    }),
    [
      data,
      loading,
      error,
      preferences,
      activeTrip,
      toasts,
      globalSearch,
      showToast,
      dismissToast,
      updatePreferences,
      setActiveTripId,
      saveTrip,
      deleteTrip,
      duplicateTrip,
      saveActivity,
      deleteActivity,
      reorderDayActivities,
      saveBooking,
      deleteBooking,
      savePackingItem,
      deletePackingItem,
      applyPackingTemplate,
      savePackingTemplate,
      deletePackingTemplate,
      saveExpense,
      deleteExpense,
      saveDocument,
      renameDocument,
      deleteDocument,
      saveNote,
      deleteNote,
      exportWorkspaceJSON,
      importWorkspaceJSON,
      resetAllData,
    ]
  );

  return <TravelContext.Provider value={value}>{children}</TravelContext.Provider>;
};

export function useTravel(): TravelContextValue {
  const ctx = useContext(TravelContext);
  if (!ctx) throw new Error('useTravel must be used inside TravelProvider');
  return ctx;
}
