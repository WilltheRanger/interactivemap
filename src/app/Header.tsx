import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Megaphone, User } from 'lucide-react';
import { LinkButton } from '../components/LinkButton';
import { fadeUpItem, staggerContainer } from '../lib/motion';
import './Header.css';

const MotionLink = motion.create(Link);

export function Header() {
  return (
    <motion.header
      className="app-header"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      <MotionLink to="/map" className="app-header__brand" variants={fadeUpItem}>
        <img
          src={`${import.meta.env.BASE_URL}brahmas-logo.webp`}
          alt=""
          className="app-header__logo"
          width={66}
          height={44}
        />
        <span className="app-header__titles">
          <span className="app-header__name">Diamond Bar</span>
          <span className="app-header__sub">High School</span>
        </span>
      </MotionLink>
      <motion.div className="app-header__actions" variants={fadeUpItem}>
        <LinkButton
          to="/announcements"
          tracked
          aria-label="Announcements"
          icon={<Megaphone size={18} />}
        >
          <span className="app-header__action-label">News</span>
        </LinkButton>
        <LinkButton to="/account" tracked aria-label="Account" icon={<User size={18} />}>
          <span className="app-header__action-label">Account</span>
        </LinkButton>
      </motion.div>
    </motion.header>
  );
}
