import { useSyncExternalStore } from 'react';
import { Button, LinkButton } from '../../components';
import { acceptTos, getTosAccepted, subscribeTos } from '../../lib/tos';
import './Tos.css';

/**
 * First-launch Terms notice: a minimal banner above the bottom nav (does not cover the map). "View
 * Terms" opens /tos; "I Understand" records acceptance in localStorage and the banner never returns.
 * No entrance animation by request.
 */
export function TosBanner() {
  const accepted = useSyncExternalStore(subscribeTos, getTosAccepted, getTosAccepted);
  if (accepted) return null;

  return (
    <div className="tos-banner" role="region" aria-label="Terms of Service">
      <p className="tos-banner__text">
        DBHS Wayfinder is a student-built tool — not an official school product. Information may be
        out of date, so always verify with the school.
      </p>
      <div className="tos-banner__actions">
        <LinkButton to="/tos" variant="secondary">
          View Terms
        </LinkButton>
        <Button variant="primary" onClick={acceptTos}>
          I Understand
        </Button>
      </div>
    </div>
  );
}
