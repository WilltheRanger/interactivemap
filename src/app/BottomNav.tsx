import { NavLink } from 'react-router-dom';
import { ClipboardList, MapPin, Search } from 'lucide-react';
import { LockerIcon } from '../components/icons/LockerIcon';
import './BottomNav.css';

const ITEMS = [
  { to: '/map', label: 'Map', icon: <MapPin size={22} aria-hidden="true" /> },
  { to: '/find', label: 'Find', icon: <Search size={22} aria-hidden="true" /> },
  { to: '/lockers', label: 'Lockers', icon: <LockerIcon size={22} /> },
  { to: '/log', label: 'Log', icon: <ClipboardList size={22} aria-hidden="true" /> },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} className="bottom-nav__item">
          <span className="bottom-nav__icon">{item.icon}</span>
          <span className="bottom-nav__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
