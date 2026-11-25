export type TripStatus = 'upcoming' | 'ongoing' | 'completed' | 'archived';

export type ActivityCategory =
  | 'Flight'
  | 'Hotel'
  | 'Restaurant'
  | 'Sightseeing'
  | 'Shopping'
  | 'Transportation'
  | 'Other';

export type BookingCategory =
  | 'Flights'
  | 'Hotels'
  | 'Transportation'
  | 'Restaurants'
  | 'Activities'
  | 'Other';

export type BookingStatus = 'Confirmed' | 'Pending' | 'Cancelled';

export type PackingCategory =
  | 'Clothing'
  | 'Electronics'
  | 'Toiletries'
  | 'Documents'
  | 'Accessories'
  | 'Medicines'
  | 'Travel Essentials'
  | 'Custom Items';

export type ExpenseCategory =
  | 'Flights'
  | 'Accommodation'
  | 'Food'
  | 'Transportation'
  | 'Activities'
  | 'Shopping'
  | 'Miscellaneous';

export type DocumentFolder =
  | 'Passport'
  | 'Visa'
  | 'Flight Tickets'
  | 'Hotel Confirmations'
  | 'Travel Insurance'
  | 'Other Documents';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD';

export type DateFormatOption = 'MMM d, yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd';

export interface Trip {
  id: string;
  name: string;
  destination: string;
  country: string;
  departureDate: string; // YYYY-MM-DD
  returnDate: string; // YYYY-MM-DD
  adults: number;
  children: number;
  travelerNames: string[];
  budget: number;
  currency: CurrencyCode;
  travelStyle: string;
  accommodationPreference: string;
  description: string;
  coverImage: string;
  status: TripStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryActivity {
  id: string;
  tripId: string;
  dayIndex: number; // 0-based relative to departureDate
  time: string; // HH:MM
  title: string;
  location: string;
  description: string;
  notes: string;
  category: ActivityCategory;
  imageUrl?: string;
  order: number;
}

export interface Booking {
  id: string;
  tripId: string;
  category: BookingCategory;
  title: string;
  reference: string;
  provider: string;
  dateTime: string; // ISO or YYYY-MM-DDTHH:MM
  price: number;
  status: BookingStatus;
  confirmationDetails: string;
  attachmentName?: string;
  attachmentDataUrl?: string;
}

export interface PackingItem {
  id: string;
  tripId: string;
  name: string;
  category: PackingCategory;
  packed: boolean;
  quantity: number;
}

export interface PackingTemplate {
  id: string;
  name: string;
  description: string;
  items: Array<{
    name: string;
    category: PackingCategory;
    quantity: number;
  }>;
}

export interface Expense {
  id: string;
  tripId: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  isEstimated?: boolean;
}

export interface TravelDocument {
  id: string;
  tripId: string;
  folder: DocumentFolder;
  name: string;
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
}

export interface TravelNote {
  id: string;
  tripId: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLogEntry {
  id: string;
  tripId: string;
  type: 'booking' | 'itinerary' | 'packing' | 'expense' | 'trip' | 'note' | 'document';
  message: string;
  timestamp: string;
}

export interface UserPreferences {
  userName: string;
  userEmail: string;
  currency: CurrencyCode;
  dateFormat: DateFormatOption;
  language: string;
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
  departureReminders: boolean;
  budgetAlerts: boolean;
  activeTripId: string;
}

export interface TripDraft {
  name: string;
  destination: string;
  country: string;
  departureDate: string;
  returnDate: string;
  adults: number;
  children: number;
  travelerNamesText: string;
  budget: number;
  currency: CurrencyCode;
  travelStyle: string;
  accommodationPreference: string;
  description: string;
  coverImage: string;
}
