import type {
  CurrencyCode,
  DateFormatOption,
  Expense,
  ExpenseCategory,
  ItineraryActivity,
  PackingItem,
  Trip,
  TripDraft,
  TripStatus,
} from '../types/travel';

const CURRENCY_LOCALES: Record<CurrencyCode, { locale: string; symbol: string; decimals: number }> = {
  USD: { locale: 'en-US', symbol: '$', decimals: 0 },
  EUR: { locale: 'de-DE', symbol: '€', decimals: 0 },
  GBP: { locale: 'en-GB', symbol: '£', decimals: 0 },
  JPY: { locale: 'ja-JP', symbol: '¥', decimals: 0 },
  AUD: { locale: 'en-AU', symbol: 'A$', decimals: 0 },
  CAD: { locale: 'en-CA', symbol: 'C$', decimals: 0 },
};

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Flights',
  'Accommodation',
  'Food',
  'Transportation',
  'Activities',
  'Shopping',
  'Miscellaneous',
];

function parseDateUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(Date.UTC(y, m - 1, d));
}

export function getTripDurationDays(departureDate: string, returnDate: string): number {
  const start = parseDateUTC(departureDate);
  const end = parseDateUTC(returnDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1;
  }
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

export function getDaysUntilDeparture(departureDate: string, referenceDateISO?: string): number {
  const target = parseDateUTC(departureDate);
  if (Number.isNaN(target.getTime())) return 0;

  let refDate: Date;
  if (referenceDateISO) {
    refDate = parseDateUTC(referenceDateISO);
  } else {
    const now = new Date();
    refDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  return Math.round((target.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
}

export interface TripDayItem {
  dayIndex: number;
  dayNumber: number;
  dateISO: string;
  shortDate: string;
  longDate: string;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function computeTripDayList(departureDate: string, returnDate: string): TripDayItem[] {
  const duration = getTripDurationDays(departureDate, returnDate);
  const start = parseDateUTC(departureDate);
  if (Number.isNaN(start.getTime())) return [];

  const days: TripDayItem[] = [];
  for (let i = 0; i < duration; i++) {
    const dt = new Date(start.getTime() + i * 86400000);
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth();
    const d = dt.getUTCDate();
    const dateISO = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      dayIndex: i,
      dayNumber: i + 1,
      dateISO,
      shortDate: `${SHORT_MONTHS[m]} ${d}`,
      longDate: `${LONG_MONTHS[m]} ${d}, ${y}`,
    });
  }
  return days;
}

export function formatDisplayDate(isoDate: string, format: DateFormatOption = 'MMM d, yyyy'): string {
  if (!isoDate) return '';
  const datePart = isoDate.split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  if (format === 'yyyy-MM-dd') {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  if (format === 'dd/MM/yyyy') {
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }
  return `${SHORT_MONTHS[m - 1]} ${d}, ${y}`;
}

export function formatCurrency(amount: number, currency: CurrencyCode = 'USD'): string {
  const meta = CURRENCY_LOCALES[currency] ?? CURRENCY_LOCALES.USD;
  const rounded = Math.round(amount);
  const absFormatted = Math.abs(rounded).toLocaleString('en-US', {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });
  return rounded < 0 ? `-${meta.symbol}${absFormatted}` : `${meta.symbol}${absFormatted}`;
}

export interface CategorySpend {
  category: ExpenseCategory;
  spent: number;
  estimated: number;
  percentageOfBudget: number;
  percentageOfSpent: number;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  estimatedTotal: number;
  remainingBalance: number;
  percentUsed: number;
  isOverBudget: boolean;
  categoryBreakdown: CategorySpend[];
}

export function computeBudgetSummary(totalBudget: number, expenses: Expense[]): BudgetSummary {
  const spentByCategory = new Map<ExpenseCategory, number>();
  const estimatedByCategory = new Map<ExpenseCategory, number>();

  for (const cat of EXPENSE_CATEGORIES) {
    spentByCategory.set(cat, 0);
    estimatedByCategory.set(cat, 0);
  }

  let totalSpent = 0;
  let estimatedTotal = 0;

  for (const exp of expenses) {
    if (exp.isEstimated) {
      estimatedTotal += exp.amount;
      estimatedByCategory.set(exp.category, (estimatedByCategory.get(exp.category) ?? 0) + exp.amount);
    } else {
      totalSpent += exp.amount;
      spentByCategory.set(exp.category, (spentByCategory.get(exp.category) ?? 0) + exp.amount);
    }
  }

  const remainingBalance = totalBudget - totalSpent;
  const percentUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const categoryBreakdown: CategorySpend[] = EXPENSE_CATEGORIES.map((category) => {
    const spent = spentByCategory.get(category) ?? 0;
    const estimated = estimatedByCategory.get(category) ?? 0;
    return {
      category,
      spent,
      estimated,
      percentageOfBudget: totalBudget > 0 ? Math.min(100, Math.round((spent / totalBudget) * 100)) : 0,
      percentageOfSpent: totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0,
    };
  });

  return {
    totalBudget,
    totalSpent,
    estimatedTotal,
    remainingBalance,
    percentUsed,
    isOverBudget: remainingBalance < 0,
    categoryBreakdown,
  };
}

export interface PackingProgress {
  total: number;
  packed: number;
  remaining: number;
  percentage: number;
}

export function computePackingProgress(items: PackingItem[]): PackingProgress {
  const total = items.length;
  const packed = items.filter((item) => item.packed).length;
  const remaining = total - packed;
  const percentage = total > 0 ? Math.round((packed / total) * 100) : 0;
  return { total, packed, remaining, percentage };
}

export function sortActivitiesByOrderAndTime(activities: ItineraryActivity[]): ItineraryActivity[] {
  return [...activities].sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    if (a.order !== b.order) return a.order - b.order;
    return a.time.localeCompare(b.time);
  });
}

export function filterTripsByStatus(
  trips: Trip[],
  statusFilter: 'all' | TripStatus,
  searchQuery: string
): Trip[] {
  const q = searchQuery.trim().toLowerCase();
  return trips.filter((trip) => {
    const matchesStatus = statusFilter === 'all' ? trip.status !== 'archived' : trip.status === statusFilter;
    if (!matchesStatus) return false;
    if (!q) return true;
    return (
      trip.name.toLowerCase().includes(q) ||
      trip.destination.toLowerCase().includes(q) ||
      trip.country.toLowerCase().includes(q)
    );
  });
}

export function validateTripStep(step: number, draft: TripDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 1) {
    if (!draft.name.trim()) errors.name = 'Trip name is required.';
    if (!draft.destination.trim()) errors.destination = 'Destination is required.';
    if (!draft.country.trim()) errors.country = 'Country is required.';
    if (!draft.departureDate) errors.departureDate = 'Departure date is required.';
    if (!draft.returnDate) errors.returnDate = 'Return date is required.';
    if (draft.departureDate && draft.returnDate && draft.returnDate < draft.departureDate) {
      errors.returnDate = 'Return date must be on or after departure date.';
    }
  } else if (step === 2) {
    if (!Number.isFinite(draft.adults) || draft.adults < 1) {
      errors.adults = 'At least 1 adult traveler is required.';
    }
    if (!Number.isFinite(draft.children) || draft.children < 0) {
      errors.children = 'Children count cannot be negative.';
    }
  } else if (step === 3) {
    if (!Number.isFinite(draft.budget) || draft.budget <= 0) {
      errors.budget = 'Please enter a budget greater than 0.';
    }
    if (!draft.currency) {
      errors.currency = 'Select a currency.';
    }
  } else if (step === 4) {
    if (!draft.travelStyle.trim()) {
      errors.travelStyle = 'Select a travel style.';
    }
    if (!draft.accommodationPreference.trim()) {
      errors.accommodationPreference = 'Select an accommodation preference.';
    }
  }
  return errors;
}

export function deriveTripStatus(departureDate: string, returnDate: string, todayISO?: string): TripStatus {
  const now = todayISO
    ? parseDateUTC(todayISO)
    : (() => {
        const d = new Date();
        return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      })();
  const dep = parseDateUTC(departureDate);
  const ret = parseDateUTC(returnDate);
  if (Number.isNaN(dep.getTime()) || Number.isNaN(ret.getTime())) return 'upcoming';
  if (now.getTime() < dep.getTime()) return 'upcoming';
  if (now.getTime() > ret.getTime()) return 'completed';
  return 'ongoing';
}
