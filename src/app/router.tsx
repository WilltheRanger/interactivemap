import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
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
        <Routes>
          <Route path="/" element={<Navigate to="/map" replace />} />
          <Route path="/map" element={<MapScreen />} />
          <Route path="/find" element={<FindScreen />} />
          <Route path="/lockers" element={<LockersScreen />} />
          <Route path="/log" element={<LogScreen />} />
          <Route path="/set-classes" element={<SetClassesScreen />} />
          <Route path="/account" element={<AccountScreen />} />
          <Route path="*" element={<Navigate to="/map" replace />} />
        </Routes>
      </AppShell>
    </RequireAuth>
  );
}
