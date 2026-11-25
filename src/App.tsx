import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TravelProvider } from './context/TravelContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { TripsPage } from './pages/TripsPage';
import { ItineraryPage } from './pages/ItineraryPage';
import { BookingsPage } from './pages/BookingsPage';
import { PackingPage } from './pages/PackingPage';
import { BudgetPage } from './pages/BudgetPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { NotesPage } from './pages/NotesPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <TravelProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/itinerary" element={<ItineraryPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/packing" element={<PackingPage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </TravelProvider>
  );
}
