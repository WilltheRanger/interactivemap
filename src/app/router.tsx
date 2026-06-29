import { useRef, type ReactNode, type RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { pageVariants } from '../lib/motion';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { InstallPrompt } from './InstallPrompt';
import { InstallModal } from './InstallModal';
import { RequireAuth } from './RequireAuth';
import { ScreenCrashCard } from './ErrorFallbacks';
import { MapScreen } from '../features/map/MapScreen';
import { GeoCalibrate } from '../features/map/GeoCalibrate';
import { AnnouncementsScreen } from '../features/announcements/AnnouncementsScreen';
import { LockersScreen } from '../features/locker/LockersScreen';
import { LinksScreen } from '../features/links/LinksScreen';
import { ScheduleScreen } from '../features/schedule/ScheduleScreen';
import { BellNotifier } from '../features/schedule/BellNotifier';
import { AccountScreen } from '../features/account/AccountScreen';
import { AdminScreen } from '../features/admin/AdminScreen';
import { TosScreen } from '../features/legal/TosScreen';
import { TosBanner } from '../features/legal/TosBanner';

/** Routed content with a fade + slight-rise transition between screens. */
function AnimatedRoutes({ scrollRef }: { scrollRef: RefObject<HTMLElement | null> }) {
  const location = useLocation();
  return (
    // The shell's <main> is the scroll container (not the window), so the router never resets it —
    // leaving a long page (e.g. /tos) scrolled meant the next screen opened mid-page. Reset once the
    // old page finishes its exit, right before the new one enters.
    <AnimatePresence mode="wait" onExitComplete={() => scrollRef.current?.scrollTo(0, 0)}>
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
            <Route path="/links" element={<LinksScreen />} />
            {/* Old hall-pass Log path → the directory that replaced it. */}
            <Route path="/log" element={<Navigate to="/links" replace />} />
            <Route path="/set-classes" element={<ScheduleScreen />} />
            {/* Plan now lives inside Schedule's "4-Year Plan" tab; keep the old path as a deep link. */}
            <Route path="/plan" element={<Navigate to="/set-classes?view=plan" replace />} />
            <Route path="/account" element={<AccountScreen />} />
            <Route path="/tos" element={<TosScreen />} />
            {/* Staff-only; not linked from the student nav (see AdminScreen). */}
            <Route path="/admin" element={<AdminScreen />} />
            {/* Dev-only GPS calibration helper (not linked); used to refit the Upper georeference. */}
            <Route path="/geocal" element={<GeoCalibrate />} />
            <Route path="*" element={<Navigate to="/map" replace />} />
          </Routes>
        </ErrorBoundary>
      </motion.div>
    </AnimatePresence>
  );
}

function AppShell({
  mainRef,
  children,
}: {
  mainRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main" ref={mainRef}>
        {children}
      </main>
      <BellNotifier />
      <TosBanner />
      <InstallPrompt />
      <InstallModal />
      <BottomNav />
    </div>
  );
}

export function AppRoutes() {
  // Shared so route transitions can reset the shell's scroll container (see AnimatedRoutes).
  const mainRef = useRef<HTMLElement | null>(null);
  return (
    <RequireAuth>
      <AppShell mainRef={mainRef}>
        <AnimatedRoutes scrollRef={mainRef} />
      </AppShell>
    </RequireAuth>
  );
}
