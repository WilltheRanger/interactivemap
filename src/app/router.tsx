import type { ReactNode } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { ScheduleScreen } from '../features/schedule/ScheduleScreen';
import { MapScreen } from '../features/map/MapScreen';
import { LockerScreen } from '../features/locker/LockerScreen';

/**
 * Seam for the Phase 09 auth guard. Today it is a pass-through; Phase 09 replaces the body with the
 * `@stu.wvusd.org` Google sign-in gate. Routes are wrapped here so there is a single place to add it.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

const NAV = [
  { to: '/schedule', label: 'Schedule' },
  { to: '/map', label: 'Map' },
  { to: '/locker', label: 'Locker' },
];

function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="app-main">{children}</main>
      <nav className="app-nav" aria-label="Primary">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export function AppRoutes() {
  return (
    <RequireAuth>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/schedule" replace />} />
          <Route path="/schedule" element={<ScheduleScreen />} />
          <Route path="/map" element={<MapScreen />} />
          <Route path="/locker" element={<LockerScreen />} />
          <Route path="*" element={<Navigate to="/schedule" replace />} />
        </Routes>
      </AppShell>
    </RequireAuth>
  );
}
