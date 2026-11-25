import {
  DEFAULT_PREFERENCES,
  SEED_ACTIVITIES,
  SEED_ACTIVITY_LOGS,
  SEED_BOOKINGS,
  SEED_DOCUMENTS,
  SEED_EXPENSES,
  SEED_NOTES,
  SEED_PACKING_ITEMS,
  SEED_PACKING_TEMPLATES,
  SEED_TRIPS,
} from '../data/seedData';
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

const DB_NAME = 'travel_planner_db';
const DB_VERSION = 1;
const PREFS_KEY = 'travel_planner_preferences_v1';
const SEEDED_KEY = 'travel_planner_seeded_v1';
const FAST_CACHE_KEY = 'travel_planner_fast_cache_v1';

export const STORES = {
  trips: 'trips',
  activities: 'activities',
  bookings: 'bookings',
  packingItems: 'packingItems',
  packingTemplates: 'packingTemplates',
  expenses: 'expenses',
  documents: 'documents',
  notes: 'notes',
  activityLogs: 'activityLogs',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

export interface TravelWorkspaceData {
  trips: Trip[];
  activities: ItineraryActivity[];
  bookings: Booking[];
  packingItems: PackingItem[];
  packingTemplates: PackingTemplate[];
  expenses: Expense[];
  documents: TravelDocument[];
  notes: TravelNote[];
  activityLogs: ActivityLogEntry[];
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      dbPromise = null;
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      (Object.values(STORES) as StoreName[]).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('Failed to open IndexedDB.'));
    };
  });
  return dbPromise;
}

async function getAllFromStore<T>(db: IDBDatabase, storeName: StoreName): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error(`Failed reading store ${storeName}`));
  });
}

async function replaceStoreItems<T extends { id: string }>(
  db: IDBDatabase,
  storeName: StoreName,
  items: T[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`Failed writing store ${storeName}`));
  });
}

export async function putRecord<T extends { id: string }>(storeName: StoreName, record: T): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`Failed saving record in ${storeName}`));
  });
}

export async function deleteRecord(storeName: StoreName, id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`Failed deleting record from ${storeName}`));
  });
}

export async function putManyRecords<T extends { id: string }>(
  storeName: StoreName,
  records: T[]
): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const record of records) {
      store.put(record);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`Failed saving batch in ${storeName}`));
  });
}

export function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function getSeedWorkspaceData(): TravelWorkspaceData {
  return {
    trips: SEED_TRIPS,
    activities: SEED_ACTIVITIES,
    bookings: SEED_BOOKINGS,
    packingItems: SEED_PACKING_ITEMS,
    packingTemplates: SEED_PACKING_TEMPLATES,
    expenses: SEED_EXPENSES,
    documents: SEED_DOCUMENTS,
    notes: SEED_NOTES,
    activityLogs: SEED_ACTIVITY_LOGS,
  };
}

export function saveFastCache(data: TravelWorkspaceData): void {
  try {
    // Exclude large binary document dataUrls from localStorage fast-boot cache
    const slimDocs = data.documents.map((d) => ({ ...d, dataUrl: '' }));
    const slimNotes = data.notes.map((n) => ({
      ...n,
      imageUrl: n.imageUrl && n.imageUrl.length > 4096 ? undefined : n.imageUrl,
    }));
    const slimBookings = data.bookings.map((b) => ({
      ...b,
      attachmentDataUrl: undefined,
    }));
    localStorage.setItem(
      FAST_CACHE_KEY,
      JSON.stringify({
        ...data,
        documents: slimDocs,
        notes: slimNotes,
        bookings: slimBookings,
      })
    );
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function getInitialWorkspaceSync(): TravelWorkspaceData {
  try {
    const isSeeded = localStorage.getItem(SEEDED_KEY) === 'true';
    if (!isSeeded) {
      return getSeedWorkspaceData();
    }
    const raw = localStorage.getItem(FAST_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TravelWorkspaceData>;
      if (Array.isArray(parsed.trips)) {
        return {
          trips: parsed.trips,
          activities: parsed.activities ?? [],
          bookings: parsed.bookings ?? [],
          packingItems: parsed.packingItems ?? [],
          packingTemplates: parsed.packingTemplates ?? [],
          expenses: parsed.expenses ?? [],
          documents: parsed.documents ?? [],
          notes: parsed.notes ?? [],
          activityLogs: parsed.activityLogs ?? [],
        };
      }
    }
  } catch {
    // Fall back to empty until IndexedDB resolves
  }
  return getSeedWorkspaceData();
}

export async function writeAllWorkspaceData(data: TravelWorkspaceData): Promise<void> {
  const db = await openDatabase();
  await Promise.all([
    replaceStoreItems(db, STORES.trips, data.trips),
    replaceStoreItems(db, STORES.activities, data.activities),
    replaceStoreItems(db, STORES.bookings, data.bookings),
    replaceStoreItems(db, STORES.packingItems, data.packingItems),
    replaceStoreItems(db, STORES.packingTemplates, data.packingTemplates),
    replaceStoreItems(db, STORES.expenses, data.expenses),
    replaceStoreItems(db, STORES.documents, data.documents),
    replaceStoreItems(db, STORES.notes, data.notes),
    replaceStoreItems(db, STORES.activityLogs, data.activityLogs),
  ]);
  localStorage.setItem(SEEDED_KEY, 'true');
  saveFastCache(data);
}

export async function loadOrSeedWorkspaceData(): Promise<TravelWorkspaceData> {
  const db = await openDatabase();
  const isSeeded = localStorage.getItem(SEEDED_KEY) === 'true';

  if (!isSeeded) {
    const seed = getSeedWorkspaceData();
    await writeAllWorkspaceData(seed);
    return seed;
  }

  const [
    trips,
    activities,
    bookings,
    packingItems,
    packingTemplates,
    expenses,
    documents,
    notes,
    activityLogs,
  ] = await Promise.all([
    getAllFromStore<Trip>(db, STORES.trips),
    getAllFromStore<ItineraryActivity>(db, STORES.activities),
    getAllFromStore<Booking>(db, STORES.bookings),
    getAllFromStore<PackingItem>(db, STORES.packingItems),
    getAllFromStore<PackingTemplate>(db, STORES.packingTemplates),
    getAllFromStore<Expense>(db, STORES.expenses),
    getAllFromStore<TravelDocument>(db, STORES.documents),
    getAllFromStore<TravelNote>(db, STORES.notes),
    getAllFromStore<ActivityLogEntry>(db, STORES.activityLogs),
  ]);

  const result: TravelWorkspaceData = {
    trips,
    activities,
    bookings,
    packingItems,
    packingTemplates,
    expenses,
    documents,
    notes,
    activityLogs,
  };
  saveFastCache(result);
  return result;
}

export async function resetWorkspaceToDefaults(): Promise<TravelWorkspaceData> {
  const seed = getSeedWorkspaceData();
  await writeAllWorkspaceData(seed);
  savePreferences(DEFAULT_PREFERENCES);
  return seed;
}
