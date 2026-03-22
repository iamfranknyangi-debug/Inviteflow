// ============================================================
//  App.jsx — Main Router
// ============================================================
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/auth.store';

// Pages
import LoginPage        from './pages/LoginPage';
import DashboardPage    from './pages/DashboardPage';
import EventsPage       from './pages/EventsPage';
import EventDetailPage  from './pages/EventDetailPage';
import GuestsPage       from './pages/GuestsPage';
import CardDesignerPage from './pages/CardDesignerPage';
import QRCodesPage      from './pages/QRCodesPage';
import SendPage         from './pages/SendPage';
import RSVPTrackPage    from './pages/RSVPTrackPage';
import ReportsPage      from './pages/ReportsPage';
import VerifyPage       from './pages/VerifyPage';   // public QR scan result
import RSVPPublicPage   from './pages/RSVPPublicPage'; // public RSVP form
import Layout           from './components/Layout';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

function PrivateRoute({ children }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { isAuthenticated, refreshUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) refreshUser();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background:'#1e2230', color:'#e8eaf0', border:'1px solid #2a2e3d' },
          success: { iconTheme: { primary:'#3fcb8a', secondary:'#0a0c10' } },
          error:   { iconTheme: { primary:'#ff5f72', secondary:'#0a0c10' } },
        }}
      />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login"          element={<LoginPage />} />
          <Route path="/verify/:token"  element={<VerifyPage />} />
          <Route path="/rsvp/:token"    element={<RSVPPublicPage />} />

          {/* Protected admin routes */}
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index               element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"    element={<DashboardPage />} />
            <Route path="events"       element={<EventsPage />} />
            <Route path="events/:id"   element={<EventDetailPage />} />
            <Route path="guests"       element={<GuestsPage />} />
            <Route path="cards"        element={<CardDesignerPage />} />
            <Route path="qr"           element={<QRCodesPage />} />
            <Route path="send"         element={<SendPage />} />
            <Route path="rsvp"         element={<RSVPTrackPage />} />
            <Route path="reports"      element={<ReportsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
