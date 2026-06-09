import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { ClipboardList, MapPin, Search } from 'lucide-react';
import { LockerIcon } from '../components/icons/LockerIcon';
import { duration, ease, spring } from '../lib/motion';
import './BottomNav.css';

const ITEMS = [
  { to: '/map', label: 'Map', icon: <MapPin size={22} aria-hidden="true" /> },
  { to: '/find', label: 'Find', icon: <Search size={22} aria-hidden="true" /> },
  { to: '/lockers', label: 'Lockers', icon: <LockerIcon size={22} /> },
  { to: '/log', label: 'Log', icon: <ClipboardList size={22} aria-hidden="true" /> },
];

export function BottomNav() {
  return (
    <motion.nav
      className="bottom-nav"
      aria-label="Primary"
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: duration.slow, ease: ease.out, delay: 0.1 }}
    >
      {ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} className="bottom-nav__item">
          {({ isActive }) => (
            <>
              {isActive ? (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="bottom-nav__indicator"
                  transition={spring.snappy}
                />
              ) : null}
              <motion.span
                className="bottom-nav__icon"
                animate={{ scale: isActive ? 1.08 : 1 }}
                transition={spring.pop}
              >
                {item.icon}
              </motion.span>
              <span className="bottom-nav__label">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </motion.nav>
  );
}
