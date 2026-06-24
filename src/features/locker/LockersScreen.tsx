import { lazy, Suspense, useState, type FormEvent } from 'react';
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
import { useMyLocker } from '../../data/usePersonal';
import { setMyLocker } from '../../lib/personalStore';
import type { MyLocker } from '../../types/personal';
import './LockersScreen.css';

// The 360° viewer (Pannellum + the large panorama image) is code-split: it only downloads when a
// student actually opens their locker.
const PanoramaViewer = lazy(() => import('./PanoramaViewer'));

/**
 * Locker finder (block model): the school's lockers are grouped into blocks ("Block 1"…), each block
 * holds several non-contiguous ranges (sections), and locker numbers repeat across blocks. So a
 * student picks their BLOCK and types a number → the app finds the section in that block whose range
 * contains the number → that section's 360° panorama with a pin on the locker. The saved
 * {block_id, number} persists on-device only (personalStore.my_locker — never server-side per CLAUDE.md).
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
      <p className="screen__sub">
        Pick your block and enter your locker number to find it and see it in 360°.
      </p>

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

/** Block + number entry. The block is required; the number is checked against the block's ranges on
 *  resolution (the result view), so the form only validates a block is chosen and the number is a
 *  positive integer. */
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
  const [blockId, setBlockId] = useState(current?.block_id ?? '');
  const [value, setValue] = useState(current != null ? String(current.number) : '');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!blockId) {
      setError('Choose your locker block.');
      return;
    }
    const n = Number(value);
    if (!value.trim() || !Number.isInteger(n) || n <= 0) {
      setError('Enter your locker number.');
      return;
    }
    setError(null);
    onSubmit({ block_id: blockId, number: n });
  };

  const noBlocks = !blocks.isPending && !blocks.isError && list.length === 0;

  return (
    <Card>
      <form className="locker-entry" onSubmit={submit} noValidate>
        <label className="locker-entry__label" htmlFor="locker-block">
          Locker block
        </label>
        <select
          id="locker-block"
          className="locker-entry__input"
          value={blockId}
          onChange={(event) => {
            setBlockId(event.target.value);
            setError(null);
          }}
          disabled={blocks.isPending || list.length === 0}
          aria-invalid={!!error && !blockId}
        >
          <option value="">{blocks.isPending ? 'Loading blocks…' : 'Select your block'}</option>
          {list.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>

        <label className="locker-entry__label" htmlFor="locker-number">
          Locker number
        </label>
        <input
          id="locker-number"
          className="locker-entry__input"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="e.g. 260"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          aria-invalid={!!error && !!blockId}
        />

        {blocks.isError && (
          <p className="locker-entry__error" role="alert">
            Couldn’t load locker blocks. Check your connection and try again.
          </p>
        )}
        {noBlocks && (
          <p className="locker-entry__error" role="alert">
            No locker blocks have been set up yet.
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
            disabled={blocks.isPending || list.length === 0}
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
          We couldn’t find locker #{myLocker.number} in {blockLabel}. Double-check your block and
          number.
        </p>
        <div className="locker-result__actions">
          <Button variant="primary" icon={<Pencil size={16} />} onClick={onChange}>
            Change locker
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="locker-result__head">
          <span className="locker-result__badge">#{myLocker.number}</span>
          <div>
            <p className="locker-result__title">{block.data?.label ?? 'Your locker bank'}</p>
            <p className="locker-result__sub">
              Lockers {found.number_start}–{found.number_end}
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
