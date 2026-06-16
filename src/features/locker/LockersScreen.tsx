import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Compass, MapPin, Pencil, Search } from 'lucide-react';
import { Button, Card, LinkButton, Skeleton } from '../../components';
import { useLockerSection, useLockersBySection, usePanorama } from '../../data/hooks';
import { useMyLocker } from '../../data/usePersonal';
import { setMyLocker } from '../../lib/personalStore';
import './LockersScreen.css';

// The 360° viewer (Pannellum + the large panorama image) is code-split: it only downloads when a
// student actually opens their locker.
const PanoramaViewer = lazy(() => import('./PanoramaViewer'));

/**
 * Locker finder (Phase 08): a number → its section (resolved BY RANGE, never one row per locker) →
 * the section highlighted on the map + a 360° panorama with a pin on the locker. The student's locker
 * number persists on-device only (personalStore.my_locker — never server-side, per CLAUDE.md).
 */
export function LockersScreen() {
  const myLocker = useMyLocker();
  const [editing, setEditing] = useState(false);
  const showForm = myLocker === null || editing;

  return (
    <section className="screen" aria-labelledby="lockers-title">
      <h1 id="lockers-title" className="screen__title">
        Lockers
      </h1>
      <p className="screen__sub">Enter your locker number to find it and see it in 360°.</p>

      <div className="screen__body">
        {showForm ? (
          <LockerEntry
            current={myLocker}
            onCancel={myLocker !== null ? () => setEditing(false) : undefined}
            onSubmit={(n) => {
              setMyLocker(n);
              setEditing(false);
            }}
          />
        ) : (
          <LockerResult lockerNumber={myLocker} onChange={() => setEditing(true)} />
        )}
      </div>
    </section>
  );
}

/** Number-entry form. Saves to the on-device store on submit (the parent persists it). */
function LockerEntry({
  current,
  onSubmit,
  onCancel,
}: {
  current: number | null;
  onSubmit: (lockerNumber: number) => void;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(current != null ? String(current) : '');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const n = Number(value);
    if (!value.trim() || !Number.isInteger(n) || n <= 0) {
      setError('Enter your locker number.');
      return;
    }
    setError(null);
    onSubmit(n);
  };

  return (
    <Card>
      <form className="locker-entry" onSubmit={submit} noValidate>
        <label className="locker-entry__label" htmlFor="locker-number">
          Locker number
        </label>
        <input
          id="locker-number"
          className="locker-entry__input"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="e.g. 1042"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={!!error}
        />
        {error && (
          <p className="locker-entry__error" role="alert">
            {error}
          </p>
        )}
        <div className="locker-entry__actions">
          <Button type="submit" variant="primary" icon={<Search size={16} />}>
            Find my locker
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

/** Resolves the saved number to a section and renders loading / not-found / found states. */
function LockerResult({
  lockerNumber,
  onChange,
}: {
  lockerNumber: number;
  onChange: () => void;
}) {
  const section = useLockerSection(lockerNumber);
  const [viewing, setViewing] = useState(false);

  if (section.isPending) {
    return <Skeleton width="100%" height={150} radius="var(--radius-lg)" />;
  }

  if (section.isError) {
    return (
      <Card>
        <p className="locker-result__title">Couldn’t load locker data</p>
        <p className="locker-result__sub">Check your connection and try again.</p>
        <div className="locker-result__actions">
          <Button variant="primary" onClick={() => void section.refetch()}>
            Try again
          </Button>
          <Button variant="secondary" onClick={onChange}>
            Change number
          </Button>
        </div>
      </Card>
    );
  }

  const found = section.data;
  if (!found) {
    return (
      <Card>
        <p className="locker-result__title">No locker bank found</p>
        <p className="locker-result__sub">
          We couldn’t find a section that includes locker #{lockerNumber}. Double-check the number.
        </p>
        <div className="locker-result__actions">
          <Button variant="primary" icon={<Pencil size={16} />} onClick={onChange}>
            Try another number
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="locker-result__head">
          <span className="locker-result__badge">#{lockerNumber}</span>
          <div>
            <p className="locker-result__title">{found.label ?? 'Your locker bank'}</p>
            <p className="locker-result__sub">
              Lockers {found.number_start}–{found.number_end}
            </p>
          </div>
        </div>

        <div className="locker-result__actions">
          {found.panorama_id ? (
            <Button variant="primary" icon={<Compass size={16} />} onClick={() => setViewing(true)}>
              View 360°
            </Button>
          ) : (
            <p className="locker-result__note">No 360° photo for this bank yet.</p>
          )}
          {found.building_id && (
            <LinkButton
              variant="secondary"
              icon={<MapPin size={16} />}
              to={`/map?room=${encodeURIComponent(found.building_id)}`}
            >
              Show on map
            </LinkButton>
          )}
          <Button variant="secondary" icon={<Pencil size={16} />} onClick={onChange}>
            Change number
          </Button>
        </div>
      </Card>

      {viewing && found.panorama_id && (
        <Suspense fallback={<PanoLoading label={found.label} />}>
          <LockerPanorama
            panoramaId={found.panorama_id}
            sectionId={found.id}
            lockerNumber={lockerNumber}
            label={found.label ?? `Lockers ${found.number_start}–${found.number_end}`}
            onClose={() => setViewing(false)}
          />
        </Suspense>
      )}
    </>
  );
}

/** Loads the panorama row + the per-locker pin, then hands plain props to the lazy viewer. */
function LockerPanorama({
  panoramaId,
  sectionId,
  lockerNumber,
  label,
  onClose,
}: {
  panoramaId: string;
  sectionId: string;
  lockerNumber: number;
  label: string;
  onClose: () => void;
}) {
  const panorama = usePanorama(panoramaId);
  const lockers = useLockersBySection(sectionId);

  if (panorama.isPending || lockers.isPending) {
    return <PanoLoading label={label} />;
  }

  if (panorama.isError || !panorama.data) {
    return (
      <div className="pano" role="alert" aria-label={`${label} — 360° view`}>
        <div className="pano__bar">
          <p className="pano__title">{label}</p>
          <button type="button" className="pano__close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="pano__stage">
          <div className="pano__overlay pano__overlay--error">
            <p className="pano__msg">Couldn’t load the 360° photo for this bank.</p>
          </div>
        </div>
      </div>
    );
  }

  const pano = panorama.data;
  const locker = (lockers.data ?? []).find((l) => l.number === lockerNumber) ?? null;

  return (
    <PanoramaViewer
      imageUrl={pano.image_url}
      label={label}
      lockerNumber={lockerNumber}
      initialYaw={pano.initial_yaw}
      initialPitch={pano.initial_pitch}
      hfov={pano.hfov}
      hotspotYaw={locker?.hotspot_yaw ?? null}
      hotspotPitch={locker?.hotspot_pitch ?? null}
      onClose={onClose}
    />
  );
}

/** Full-screen loading shell, used for both the Suspense fallback and the panorama-data fetch. */
function PanoLoading({ label }: { label?: string | null }) {
  return (
    <div className="pano" role="status" aria-label="Loading 360° view">
      <div className="pano__bar">
        <p className="pano__title">{label ?? 'Locker'}</p>
      </div>
      <div className="pano__stage">
        <div className="pano__overlay">
          <span className="pano__spinner" aria-hidden="true" />
          <p className="pano__msg">Loading the 360° view…</p>
        </div>
      </div>
    </div>
  );
}
