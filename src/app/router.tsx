import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { pageVariants } from '../lib/motion';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { ScreenCrashCard } from './ErrorFallbacks';
import { MapScreen } from '../features/map/MapScreen';
import { FindScreen } from '../features/find/FindScreen';
import { LockersScreen } from '../features/locker/LockersScreen';
import { LogScreen } from '../features/log/LogScreen';
import { SetClassesScreen } from '../features/schedule/SetClassesScreen';
import { AccountScreen } from '../features/account/AccountScreen';

/**
 * Seam for the Phase 09 auth guard — currently a pass-through; Phase 09 replaces the body with the
 * `@stu.wvusd.org` Google sign-in gate.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

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
            <Route path="/find" element={<FindScreen />} />
            <Route path="/lockers" element={<LockersScreen />} />
            <Route path="/log" element={<LogScreen />} />
            <Route path="/set-classes" element={<SetClassesScreen />} />
            <Route path="/account" element={<AccountScreen />} />
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
