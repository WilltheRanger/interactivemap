/** Shared building blocks for the /admin sections: states, delete confirm, field wrapper. */
import { useState, type ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Skeleton } from '../../components';

/** Loading / error / content wrapper — every admin section's three states in one place. */
export function SectionStates({
  isPending,
  isError,
  onRetry,
  children,
}: {
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (isPending) {
    return (
      <div className="admin-list" aria-busy="true" role="status" aria-label="Loading">
        <Skeleton height={56} radius="var(--radius-md)" />
        <Skeleton height={56} radius="var(--radius-md)" />
        <Skeleton height={56} radius="var(--radius-md)" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="ann-panel ann-panel--error" role="alert">
        <p className="ann-panel__title">Couldn&rsquo;t load this section</p>
        <p>Check your connection and try again.</p>
        <Button variant="primary" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}

/** Two-tap destructive button: Delete → Confirm? (same pattern as announcements). */
export function ConfirmDeleteButton({
  label,
  pending,
  onConfirm,
}: {
  label: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Button
      variant="danger"
      icon={<Trash2 size={16} />}
      disabled={pending}
      onClick={() => (confirming ? onConfirm() : setConfirming(true))}
      onBlur={() => setConfirming(false)}
      aria-label={confirming ? `Confirm deleting ${label}` : `Delete ${label}`}
    >
      {pending ? 'Deleting…' : confirming ? 'Confirm?' : 'Delete'}
    </Button>
  );
}

/** Labelled form field with optional inline error. */
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="admin-field">
      <span className="admin-field__label">{label}</span>
      {children}
      {error && (
        <span className="admin-field__error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

/** Mutation error/success line under a form. */
export function MutationStatus({ error, saved }: { error: unknown; saved: boolean }) {
  if (error) {
    return (
      <p className="admin-status admin-status--error" role="alert">
        Couldn&rsquo;t save: {error instanceof Error ? error.message : 'unknown error'}
      </p>
    );
  }
  if (saved) {
    return (
      <p className="admin-status" role="status">
        Saved ✓
      </p>
    );
  }
  return null;
}
