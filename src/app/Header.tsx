import { Link } from 'react-router-dom';
import { LayoutGrid, User } from 'lucide-react';
import { LinkButton } from '../components/LinkButton';
import './Header.css';

export function Header() {
  return (
    <header className="app-header">
      <Link to="/map" className="app-header__brand">
        <img src="/db-logo.svg" alt="" className="app-header__logo" width={44} height={44} />
        <span className="app-header__titles">
          <span className="app-header__name">Diamond Bar</span>
          <span className="app-header__sub">High School</span>
        </span>
      </Link>
      <div className="app-header__actions">
        <LinkButton
          to="/set-classes"
          tracked
          aria-label="Set classes"
          icon={<LayoutGrid size={18} />}
        >
          <span className="app-header__action-label">Set Classes</span>
        </LinkButton>
        <LinkButton to="/account" tracked aria-label="Account" icon={<User size={18} />}>
          <span className="app-header__action-label">Account</span>
        </LinkButton>
      </div>
    </header>
  );
}
