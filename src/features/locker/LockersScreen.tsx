import { lazy, Suspense, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, MapPin, Pencil, Search } from 'lucide-react';
import { Button, Card, Skeleton } from '../../components';
import {
  useLockerBlock,
  useLockerSections,
  useLockersBySection,
  usePanorama,
} from '../../data/hooks';
import { numberInBlock, type LockerSection } from '../../lib/refData';
import { useMyLocker } from '../../data/usePersonal';
import { setMyLocker } from '../../lib/personalStore';
import type { MyLocker } from '../../types/personal';
import './LockersScreen.css';

// The 360° viewer (Pannellum + the large panorama image) is code-split: it only downloads when a
// student actually opens their locker.
const PanoramaViewer = lazy(() => import('./PanoramaViewer'));

/** Display name for a block: its label ("Block 1"), falling back to its range. */
function blockLabel(s: LockerSection): string {
  return s.label ?? `Lockers ${s.number_start}–${s.number_end}`;
}

/**
 * Locker finder (Phase 08 + block model): the school's locker numbers repeat across blocks, so a
 * student picks their BLOCK ("Block 1"…) and types a number → the block is resolved BY ID (never by
 * range) and the number is validated against that block's range → the block highlighted on the map +
 * a 360° panorama with a pin on the locker. The saved {block_id, number} persists on-device only
 * (personalStore.my_locker — never server-side, per CLAUDE.md).
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

/** Block + number entry. Validates the number against the chosen block's range before saving. */
function LockerEntry({
  current,
  onSubmit,
  onCancel,
}: {
  current: MyLocker | null;
  onSubmit: (loc: MyLocker) => void;
  onCancel?: () => void;
}) {
  const blocks = useLockerSections();
  const list = blocks.data ?? [];
  const [blockId, setBlockId] = useState(current?.block_id ?? '');
  const [value, setValue] = useState(current != null ? String(current.number) : '');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const block = list.find((b) => b.id === blockId);
    if (!block) {
      setError('Choose your locker block.');
      return;
    }
    const n = Number(value);
    if (!value.trim() || !Number.isInteger(n) || n <= 0) {
      setError('Enter your locker number.');
      return;
    }
    if (!numberInBlock(block, n)) {
      setError(`${blockLabel(block)} holds lockers ${block.number_start}–${block.number_end}.`);
      return;
    }
    setError(null);
    onSubmit({ block_id: block.id, number: n });
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
              {blockLabel(b)}
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
          placeholder="e.g. 42"
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

/** Resolves the saved block by id and renders loading / not-found / found states. */
function LockerResult({ myLocker, onChange }: { myLocker: MyLocker; onChange: () => void }) {
  const block = useLockerBlock(myLocker.block_id);
  const navigate = useNavigate();
  const [viewing, setViewing] = useState(false);

  if (block.isPending) {
    return <Skeleton width="100%" height={150} radius="var(--radius-lg)" />;
  }

  if (block.isError) {
    return (
      <Card>
        <p className="locker-result__title">Couldn’t load locker data</p>
        <p className="locker-result__sub">Check your connection and try again.</p>
        <div className="locker-result__actions">
          <Button variant="primary" onClick={() => void block.refetch()}>
            Try again
          </Button>
          <Button variant="secondary" onClick={onChange}>
            Change locker
          </Button>
        </div>
      </Card>
    );
  }

  const found = block.data;
  if (!found) {
    return (
      <Card>
        <p className="locker-result__title">Locker block not found</p>
        <p className="locker-result__sub">
          The block this locker was saved in is no longer available. Pick your block again.
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
            <p className="locker-result__title">{found.label ?? 'Your locker bank'}</p>
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
            {found.building_id && (
              <Button
                variant="secondary"
                icon={<MapPin size={16} />}
                onClick={() =>
                  navigate(`/map?room=${encodeURIComponent(found.building_id as string)}`)
                }
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
        <Suspense fallback={<PanoLoading label={found.label} />}>
          <LockerPanorama
            panoramaId={found.panorama_id}
            sectionId={found.id}
            lockerNumber={myLocker.number}
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
