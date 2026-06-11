import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { pageVariants } from '../lib/motion';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { InstallPrompt } from './InstallPrompt';
import { RequireAuth } from './RequireAuth';
import { ScreenCrashCard } from './ErrorFallbacks';
import { MapScreen } from '../features/map/MapScreen';
import { AnnouncementsScreen } from '../features/announcements/AnnouncementsScreen';
import { LockersScreen } from '../features/locker/LockersScreen';
import { LogScreen } from '../features/log/LogScreen';
import { ScheduleScreen } from '../features/schedule/ScheduleScreen';
import { AccountScreen } from '../features/account/AccountScreen';
import { AdminScreen } from '../features/admin/AdminScreen';

/** Routed content with a fade + slight-rise transition between screens. */
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className="page"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Keyed by path: a crash in one screen shows the card but the shell stays usable, and
            navigating to another tab automatically retries with a fresh boundary. */}
        <ErrorBoundary
          key={location.pathname}
          fallback={(reset) => <ScreenCrashCard reset={reset} />}
        >
          <Routes location={location}>
            <Route path="/" element={<Navigate to="/map" replace />} />
            <Route path="/map" element={<MapScreen />} />
            <Route path="/announcements" element={<AnnouncementsScreen />} />
            <Route path="/lockers" element={<LockersScreen />} />
            <Route path="/log" element={<LogScreen />} />
            <Route path="/set-classes" element={<ScheduleScreen />} />
            {/* Plan now lives inside Schedule's "4-Year Plan" tab; keep the old path as a deep link. */}
            <Route path="/plan" element={<Navigate to="/set-classes?view=plan" replace />} />
            <Route path="/account" element={<AccountScreen />} />
            {/* Staff-only; not linked from the student nav (see AdminScreen). */}
            <Route path="/admin" element={<AdminScreen />} />
            <Route path="*" element={<Navigate to="/map" replace />} />
          </Routes>
        </ErrorBoundary>
      </motion.div>
    </AnimatePresence>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">{children}</main>
      <InstallPrompt />
      <BottomNav />
    </div>
  );
}

export function AppRoutes() {
  return (
    <RequireAuth>
      <AppShell>
        <AnimatedRoutes />
      </AppShell>
    </RequireAuth>
  );
}
