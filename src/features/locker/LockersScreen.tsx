import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, MapPin, Pencil, Search } from 'lucide-react';
import { Button, Card, Skeleton } from '../../components';
import {
  useLockerBlock,
  useLockerBlocks,
  useLockersBySection,
  useResolveLocker,
  usePanorama,
} from '../../data/hooks';
import type { LockerBlock } from '../../lib/refData';
import { useMyLocker } from '../../data/usePersonal';
import { setMyLocker } from '../../lib/personalStore';
import type { MyLocker } from '../../types/personal';
import './LockersScreen.css';

// The 360° viewer (Pannellum + the large panorama image) is code-split: it only downloads when a
// student actually opens their locker.
const PanoramaViewer = lazy(() => import('./PanoramaViewer'));

/** The single block digit a student types in their BK pin, parsed from the block label ("BK3" → 3). */
function blockPinDigit(b: LockerBlock): number | null {
  const m = (b.label ?? '').match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

/** Locker number → its 3-digit pin form (301, 69 → "301", "069"). */
function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

/**
 * Locker finder (BK pin). Lockers are issued as a code like "BK3301": a fixed "BK", then the block
 * digit (3), then the 3-digit locker number (301). The student types the 4 digits; the block digit
 * picks the block (numbers repeat across blocks), and the locker number resolves to the section (range)
 * in that block → its 360° panorama with a pin. The saved {block_id, number} is on-device only.
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
      <p className="screen__sub">Enter your locker code to find it and see it in 360°.</p>

      <div className="screen__body">
        {showForm ? (
          <LockerEntry
            current={myLocker}
            onCancel={myLocker !== null ? () => setEditing(false) : undefined}
            onSubmit={(loc) => {
              setMyLocker(loc);
              setEditing(false);
            }}
          />
        ) : (
          <LockerResult myLocker={myLocker} onChange={() => setEditing(true)} />
        )}
      </div>
    </section>
  );
}

/** BK-pin entry: a fixed "BK" prefix + a 4-digit code (block digit + 3-digit locker number). */
function LockerEntry({
  current,
  onSubmit,
  onCancel,
}: {
  current: MyLocker | null;
  onSubmit: (loc: MyLocker) => void;
  onCancel?: () => void;
}) {
  const blocks = useLockerBlocks();
  const list = blocks.data ?? [];
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const prefilled = useRef(false);

  // Prefill the code when editing, once the blocks load (we need the saved block's digit to rebuild it).
  useEffect(() => {
    const data = blocks.data;
    if (prefilled.current || !current || !data?.length) return;
    const block = data.find((b) => b.id === current.block_id);
    const digit = block ? blockPinDigit(block) : null;
    setCode(`${digit ?? ''}${pad3(current.number)}`);
    prefilled.current = true;
  }, [current, blocks.data]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{4}$/.test(code)) {
      setError('Enter the 4 numbers after BK — e.g. 3301.');
      return;
    }
    const digit = parseInt(code[0], 10);
    const lockerNumber = parseInt(code.slice(1), 10);
    const block = list.find((b) => blockPinDigit(b) === digit);
    if (!block) {
      setError(`No block BK${digit} found. Check the first number of your code.`);
      return;
    }
    setError(null);
    onSubmit({ block_id: block.id, number: lockerNumber });
  };

  const blocksError = blocks.isError;

  return (
    <Card>
      <form className="locker-entry" onSubmit={submit} noValidate>
        <label className="locker-entry__label" htmlFor="locker-code">
          Your locker code
        </label>
        <div className="locker-entry__code">
          <span className="locker-entry__prefix" aria-hidden="true">
            BK
          </span>
          <input
            id="locker-code"
            className="locker-entry__input locker-entry__code-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="3301"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, '').slice(0, 4));
              setError(null);
            }}
            aria-invalid={!!error}
          />
        </div>

        {blocksError && (
          <p className="locker-entry__error" role="alert">
            Couldn’t load locker data. Check your connection and try again.
          </p>
        )}
        {error && (
          <p className="locker-entry__error" role="alert">
            {error}
          </p>
        )}

        <div className="locker-entry__actions">
          <Button
            type="submit"
            variant="primary"
            icon={<Search size={16} />}
            disabled={blocks.isPending}
          >
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

/** Resolves the saved {block, number} → the block (for its label) + the matching section (the range
 *  that contains the number), and renders loading / not-found / found states. */
function LockerResult({ myLocker, onChange }: { myLocker: MyLocker; onChange: () => void }) {
  const block = useLockerBlock(myLocker.block_id);
  const section = useResolveLocker(myLocker.block_id, myLocker.number);
  const navigate = useNavigate();
  const [viewing, setViewing] = useState(false);

  if (block.isPending || section.isPending) {
    return <Skeleton width="100%" height={150} radius="var(--radius-lg)" />;
  }

  if (block.isError || section.isError) {
    return (
      <Card>
        <p className="locker-result__title">Couldn’t load locker data</p>
        <p className="locker-result__sub">Check your connection and try again.</p>
        <div className="locker-result__actions">
          <Button
            variant="primary"
            onClick={() => {
              void block.refetch();
              void section.refetch();
            }}
          >
            Try again
          </Button>
          <Button variant="secondary" onClick={onChange}>
            Change locker
          </Button>
        </div>
      </Card>
    );
  }

  const blockLabel = block.data?.label ?? 'your block';
  const found = section.data;

  if (!found) {
    return (
      <Card>
        <p className="locker-result__title">Locker not found</p>
        <p className="locker-result__sub">
          We couldn’t find locker #{myLocker.number} in {blockLabel}. Double-check your code.
        </p>
        <div className="locker-result__actions">
          <Button variant="primary" icon={<Pencil size={16} />} onClick={onChange}>
            Change locker
          </Button>
        </div>
      </Card>
    );
  }

  const pin = block.data ? `${block.data.label}${pad3(myLocker.number)}` : `#${myLocker.number}`;

  return (
    <>
      <Card>
        <div className="locker-result__head">
          <span className="locker-result__badge">{pin}</span>
          <div>
            <p className="locker-result__title">{block.data?.label ?? 'Your locker bank'}</p>
            <p className="locker-result__sub">
              Locker {myLocker.number} · range {found.number_start}–{found.number_end}
            </p>
          </div>
        </div>

        <div className="locker-result__actions">
          {found.panorama_id ? (
            <Button
              className="locker-result__cta"
              variant="primary"
              icon={<Compass size={16} />}
              onClick={() => setViewing(true)}
            >
              View 360°
            </Button>
          ) : (
            <p className="locker-result__note">No 360° photo for this bank yet.</p>
          )}
          <div className="locker-result__secondary">
            {found.map_shape_ids?.length > 0 && (
              <Button
                variant="secondary"
                icon={<MapPin size={16} />}
                onClick={() => navigate(`/map?section=${encodeURIComponent(found.id)}`)}
              >
                Show on map
              </Button>
            )}
            <Button variant="secondary" icon={<Pencil size={16} />} onClick={onChange}>
              Change locker
            </Button>
          </div>
        </div>
      </Card>

      {viewing && found.panorama_id && (
        <Suspense fallback={<PanoLoading label={block.data?.label} />}>
          <LockerPanorama
            panoramaId={found.panorama_id}
            sectionId={found.id}
            lockerNumber={myLocker.number}
            label={block.data?.label ?? `Lockers ${found.number_start}–${found.number_end}`}
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
