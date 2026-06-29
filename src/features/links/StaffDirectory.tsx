import { useMemo, useState } from 'react';
import { AlertTriangle, Mail } from 'lucide-react';
import { Card, SearchInput } from '../../components';
import { gmailComposeUrl } from './links.data';
import { STAFF_DIRECTORY, type StaffMember } from './teacherDirectory';

/** How many rows to render at once — the full directory is long, so an empty search shows a slice. */
const RENDER_CAP = 40;

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

function StaffRow({ person }: { person: StaffMember }) {
  // A colliding generated address is unreliable, so it isn't a clickable mailto — it's flagged for the
  // office to confirm instead (the user's "flag that for admin for now").
  if (person.sharedEmail) {
    return (
      <div className="staff-row staff-row--flagged">
        <span className="staff-row__avatar staff-row__avatar--flag" aria-hidden="true">
          {initials(person.name)}
        </span>
        <span className="staff-row__text">
          <span className="staff-row__name">{person.name}</span>
          {person.role && <span className="staff-row__role">{person.role}</span>}
          <span className="staff-row__flag">
            <AlertTriangle size={13} aria-hidden="true" />
            Shared email — check with the office
          </span>
        </span>
      </div>
    );
  }
  return (
    <a
      className="staff-row"
      href={gmailComposeUrl(person.email)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Email ${person.name} in Gmail (opens in a new tab)`}
    >
      <span className="staff-row__avatar" aria-hidden="true">
        {initials(person.name)}
      </span>
      <span className="staff-row__text">
        <span className="staff-row__name">{person.name}</span>
        {person.role && <span className="staff-row__role">{person.role}</span>}
        <span className="staff-row__email">{person.email}</span>
      </span>
      <Mail className="staff-row__action" size={17} aria-hidden="true" />
    </a>
  );
}

/**
 * Teacher & staff directory: search the full roster (name / subject / email) and open a pre-addressed
 * Gmail compose for anyone with a unique address. Empty search shows the first slice so the section
 * isn't a 150-row wall; typing filters across the whole list.
 */
export function StaffDirectory() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!q) return STAFF_DIRECTORY;
    return STAFF_DIRECTORY.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q),
    );
  }, [q]);

  const shown = matches.slice(0, RENDER_CAP);
  const hidden = matches.length - shown.length;

  return (
    <section className="links-section">
      <h2 className="links-section__title">Teachers &amp; staff</h2>
      <SearchInput
        placeholder="Search staff by name, subject, or email…"
        aria-label="Search staff"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {matches.length === 0 ? (
        <Card className="links-card staff-empty">
          <p>No staff match “{query.trim()}”.</p>
        </Card>
      ) : (
        <>
          <Card className="links-card staff-list">
            {shown.map((person) => (
              <StaffRow key={`${person.email}-${person.name}`} person={person} />
            ))}
          </Card>
          <p className="staff-count">
            {q
              ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'}`
              : hidden > 0
                ? `Showing ${shown.length} of ${matches.length} — search to find anyone`
                : `${matches.length} staff`}
          </p>
        </>
      )}
    </section>
  );
}
