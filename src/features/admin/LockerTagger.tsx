import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components';
import { useLockersBySection, usePanorama, useSignedPanoramaUrl } from '../../data/hooks';
import type { Locker, LockerSection } from '../../lib/refData';
import { getSupabase } from '../../lib/supabase';
import { interpolateGrid, type GridCorner, type GridOrder } from '../../lib/lockerGrid';
import { ConfirmDeleteButton } from './shared';
import PanoramaViewer, { type PanoPin } from '../locker/PanoramaViewer';
import '../locker/LockersScreen.css'; // the .pano* / .pano-pin shell styles the viewer needs

const round = (n: number) => Math.round(n * 10) / 10;
const CORNER_LABELS = ['TL', 'TR', 'BR', 'BL'];
const NUDGE_STEP = 0.5; // degrees per tap when sliding the whole grid

/**
 * Admin "tag in 360°" tool for one locker section. Opens the section's panorama; a tap on the photo
 * captures the {yaw, pitch} under the cursor, which you save against a locker number (→ the `lockers`
 * row the student viewer reads). Existing pins show as markers; "Set as default view" stores the
 * current view as the panorama's opening angle. Lazy-loaded from LockersAdmin so Pannellum stays out
 * of the main bundle.
 */
export default function LockerTagger({
  section,
  onClose,
}: {
  section: LockerSection;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const panorama = usePanorama(section.panorama_id);
  const lockers = useLockersBySection(section.id);
  // Private-bucket panoramas need a short-lived signed URL; legacy URLs pass through unchanged.
  const signedUrl = useSignedPanoramaUrl(panorama.data);
  const viewerRef = useRef<PannellumViewer | null>(null);

  const [captured, setCaptured] = useState<{ yaw: number; pitch: number } | null>(null);
  const [number, setNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Tagging mode. 'manual' = one at a time; 'quick' = tap in order, auto-advance; 'grid' = tap the 4
  // corners and interpolate the whole bank.
  const [mode, setMode] = useState<'manual' | 'quick' | 'grid'>('manual');
  // Quick-tag: each tap drops a pin at the next number and advances.
  const [nextNum, setNextNum] = useState(section.number_start);
  const [lastQuick, setLastQuick] = useState<number | null>(null);
  // Grid: the 4 tapped corners (TL, TR, BR, BL) + the bank's dimensions / numbering.
  const [gCorners, setGCorners] = useState<GridCorner[]>([]);
  const [gRows, setGRows] = useState('');
  const [gCols, setGCols] = useState('');
  const [gStart, setGStart] = useState(String(section.number_start));
  const [gOrder, setGOrder] = useState<GridOrder>('col');
  // Whole-grid fine adjust (degrees), applied on top of the interpolated pins.
  const [gNudge, setGNudge] = useState({ yaw: 0, pitch: 0 });

  // Load an existing pin back into the form so it can be moved/retagged (Save upserts the same row).
  // Stable so the pins memo can wire it as each marker's click handler without re-adding hot spots.
  const startEdit = useCallback((l: Locker) => {
    setNumber(String(l.number));
    setCaptured(
      l.hotspot_yaw != null && l.hotspot_pitch != null
        ? { yaw: l.hotspot_yaw, pitch: l.hotspot_pitch }
        : null,
    );
    setError(null);
  }, []);

  // The number in the form. When it matches an existing pin, Save updates that pin in place.
  const editingNum = number.trim() && Number.isInteger(Number(number)) ? Number(number) : null;
  const isUpdate = (lockers.data ?? []).some((l) => l.number === editingNum);

  // The lowest number in this section's range that doesn't have a pin yet — where quick-tag resumes.
  const taggedNumbers = useMemo(
    () => new Set((lockers.data ?? []).map((l) => l.number)),
    [lockers.data],
  );
  const firstUntagged = () => {
    for (let n = section.number_start; n <= section.number_end; n += 1) {
      if (!taggedNumbers.has(n)) return n;
    }
    return section.number_end + 1;
  };

  // Live grid preview: once 4 corners are tapped and rows/cols are valid, interpolate every pin.
  const gridPins = useMemo(() => {
    const r = Number(gRows);
    const c = Number(gCols);
    const s = Number(gStart);
    if (gCorners.length !== 4) return null;
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 2 || c < 2) return null;
    if (!Number.isInteger(s)) return null;
    const base = interpolateGrid(
      gCorners as [GridCorner, GridCorner, GridCorner, GridCorner],
      r,
      c,
      s,
      gOrder,
    );
    if (gNudge.yaw === 0 && gNudge.pitch === 0) return base;
    return base.map((p) => ({
      number: p.number,
      yaw: round(p.yaw + gNudge.yaw),
      pitch: round(p.pitch + gNudge.pitch),
    }));
  }, [gCorners, gRows, gCols, gStart, gOrder, gNudge]);

  // Markers on the photo. Grid mode shows the tapped corners + the interpolated preview; otherwise the
  // existing tagged lockers (tap a marker to edit) plus the just-clicked "pending" point.
  const pins = useMemo<PanoPin[]>(() => {
    if (mode === 'grid') {
      const preview: PanoPin[] = (gridPins ?? []).map((p) => ({
        id: `gp-${p.number}`,
        yaw: p.yaw,
        pitch: p.pitch,
        label: `#${p.number}`,
      }));
      const corners: PanoPin[] = gCorners.map((c, i) => ({
        id: `corner-${i}`,
        yaw: c.yaw,
        pitch: c.pitch,
        label: CORNER_LABELS[i],
      }));
      return [...preview, ...corners];
    }
    const existing: PanoPin[] = (lockers.data ?? [])
      .filter((l) => l.hotspot_yaw != null && l.hotspot_pitch != null && l.number !== editingNum)
      .map((l) => ({
        id: `locker-${l.number}`,
        yaw: l.hotspot_yaw as number,
        pitch: l.hotspot_pitch as number,
        label: `#${l.number}`,
        onSelect: () => startEdit(l),
      }));
    if (captured) {
      existing.push({
        id: 'pending',
        yaw: captured.yaw,
        pitch: captured.pitch,
        label: editingNum ? `#${editingNum}` : 'New pin',
      });
    }
    return existing;
  }, [mode, gridPins, gCorners, lockers.data, captured, editingNum, startEdit]);

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['lockers', section.id] });

  const savePin = useMutation({
    mutationFn: async (pin: { number: number; yaw: number; pitch: number }) => {
      const { error: err } = await getSupabase()
        .from('lockers')
        .upsert({
          id: `${section.id}-${pin.number}`,
          section_id: section.id,
          number: pin.number,
          hotspot_yaw: round(pin.yaw),
          hotspot_pitch: round(pin.pitch),
        });
      if (err) throw err;
    },
    onSuccess: invalidate,
  });

  const removePin = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await getSupabase().from('lockers').delete().eq('id', id);
      if (err) throw err;
    },
    onSuccess: invalidate,
  });

  const setDefaultView = useMutation({
    mutationFn: async () => {
      const viewer = viewerRef.current;
      const id = section.panorama_id;
      if (!viewer || !id) throw new Error('No panorama to set.');
      const { error: err } = await getSupabase()
        .from('panoramas')
        .update({ initial_yaw: round(viewer.getYaw()), initial_pitch: round(viewer.getPitch()) })
        .eq('id', id);
      if (err) throw err;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['panorama', section.panorama_id] });
      void queryClient.invalidateQueries({ queryKey: ['panoramas'] });
    },
  });

  const applyGrid = useMutation({
    mutationFn: async (pins: { number: number; yaw: number; pitch: number }[]) => {
      const rows = pins.map((p) => ({
        id: `${section.id}-${p.number}`,
        section_id: section.id,
        number: p.number,
        hotspot_yaw: round(p.yaw),
        hotspot_pitch: round(p.pitch),
      }));
      const { error: err } = await getSupabase().from('lockers').upsert(rows);
      if (err) throw err;
    },
    onSuccess: () => {
      invalidate();
      setGCorners([]);
      setGNudge({ yaw: 0, pitch: 0 });
      setMode('manual');
    },
  });

  const save = () => {
    const n = Number(number);
    if (!number.trim() || !Number.isInteger(n)) return setError('Enter a locker number.');
    if (n < section.number_start || n > section.number_end)
      return setError(`Must be in ${section.number_start}–${section.number_end}.`);
    if (!captured) return setError('Tap the locker in the photo first.');
    setError(null);
    savePin.mutate(
      { number: n, yaw: captured.yaw, pitch: captured.pitch },
      {
        onSuccess: () => {
          setNumber('');
          setCaptured(null);
        },
      },
    );
  };

  const clearForm = () => {
    setNumber('');
    setCaptured(null);
    setError(null);
  };

  // A tap on the photo, per mode: grid collects up to 4 corners; quick drops+saves the next pin and
  // advances; manual just captures the spot for the form.
  const handlePick = (pos: { yaw: number; pitch: number }) => {
    if (mode === 'grid') {
      setGCorners((cs) => (cs.length >= 4 ? cs : [...cs, pos]));
      return;
    }
    if (mode !== 'quick') {
      setCaptured(pos);
      return;
    }
    if (nextNum < section.number_start || nextNum > section.number_end) {
      setError(`All lockers ${section.number_start}–${section.number_end} are tagged.`);
      return;
    }
    const n = nextNum;
    setError(null);
    setLastQuick(n);
    setNextNum(n + 1);
    savePin.mutate({ number: n, yaw: pos.yaw, pitch: pos.pitch });
  };

  const startQuick = () => {
    setNextNum(firstUntagged());
    setLastQuick(null);
    setCaptured(null);
    setNumber('');
    setError(null);
    setMode('quick');
  };

  const startGrid = () => {
    setGCorners([]);
    setGNudge({ yaw: 0, pitch: 0 });
    setGStart(String(firstUntagged()));
    setCaptured(null);
    setNumber('');
    setError(null);
    setMode('grid');
  };

  const nudgeGrid = (dYaw: number, dPitch: number) =>
    setGNudge((n) => ({ yaw: round(n.yaw + dYaw), pitch: round(n.pitch + dPitch) }));

  // Undo the pin the last quick tap placed (a mistap) and step the counter back to it.
  const undoLastQuick = () => {
    if (lastQuick == null) return;
    removePin.mutate(`${section.id}-${lastQuick}`);
    setNextNum(lastQuick);
    setLastQuick(null);
  };

  const title = `Tag · ${section.label ?? section.id}`;

  // Loading / missing panorama: a minimal full-screen shell (no Pannellum) with a close button.
  const pano = panorama.data;
  const imageUrl = signedUrl.data;
  if (panorama.isPending || !pano || signedUrl.isPending || !imageUrl) {
    const message =
      panorama.isPending || (pano && signedUrl.isPending)
        ? 'Loading the panorama…'
        : !pano
          ? 'This section has no panorama image yet — add its URL first.'
          : 'Couldn’t load the panorama photo.';
    return (
      <div className="pano" role="dialog" aria-modal="true" aria-label={title}>
        <div className="pano__bar">
          <p className="pano__title">{title}</p>
          <button type="button" className="pano__close" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="pano__stage">
          <div className="pano__overlay" role="status">
            <p className="pano__msg">{message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PanoramaViewer
        imageUrl={imageUrl}
        label={title}
        lockerNumber={0}
        initialYaw={pano.initial_yaw}
        initialPitch={pano.initial_pitch}
        hfov={pano.hfov}
        pins={pins}
        onPick={handlePick}
        onReady={(v) => (viewerRef.current = v)}
        onClose={onClose}
      />

      <div className="locker-tagger" role="group" aria-label="Locker pin tagger">
        {mode === 'grid' ? (
          <>
            <p className="locker-tagger__coords">
              Grid fill — set the bank size, then tap the <strong>4 corner lockers</strong> (any
              order). Rows = how many lockers tall the bank is.
            </p>
            <div className="locker-tagger__gridform">
              <label className="locker-tagger__gfield">
                <span>Rows</span>
                <input
                  className="admin-input"
                  type="number"
                  inputMode="numeric"
                  value={gRows}
                  onChange={(e) => setGRows(e.target.value)}
                />
              </label>
              <label className="locker-tagger__gfield">
                <span>Columns</span>
                <input
                  className="admin-input"
                  type="number"
                  inputMode="numeric"
                  value={gCols}
                  onChange={(e) => setGCols(e.target.value)}
                />
              </label>
              <label className="locker-tagger__gfield">
                <span>Start #</span>
                <input
                  className="admin-input"
                  type="number"
                  inputMode="numeric"
                  value={gStart}
                  onChange={(e) => setGStart(e.target.value)}
                />
              </label>
              <label className="locker-tagger__gfield">
                <span>Numbering</span>
                <select
                  className="admin-input"
                  value={gOrder}
                  onChange={(e) => setGOrder(e.target.value as GridOrder)}
                >
                  <option value="col">Down columns</option>
                  <option value="row">Across rows</option>
                </select>
              </label>
            </div>
            <div className="locker-tagger__quickrow">
              <span className="locker-tagger__next">
                Corners: <strong>{gCorners.length}/4</strong>
              </span>
              <Button
                variant="secondary"
                onClick={() => {
                  setGCorners([]);
                  setGNudge({ yaw: 0, pitch: 0 });
                }}
                disabled={gCorners.length === 0}
              >
                Reset corners
              </Button>
              <Button
                variant="primary"
                onClick={() => gridPins && applyGrid.mutate(gridPins)}
                disabled={!gridPins || applyGrid.isPending}
              >
                {applyGrid.isPending
                  ? 'Placing…'
                  : gridPins
                    ? `Place ${gridPins.length} pins`
                    : 'Place pins'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setGCorners([]);
                  setMode('manual');
                }}
              >
                Manual
              </Button>
            </div>
            {gCorners.length === 4 && !gridPins && (
              <p className="locker-tagger__coords">Enter rows &amp; columns (each ≥ 2) to preview.</p>
            )}
            {gridPins && (
              <div className="locker-tagger__nudge" role="group" aria-label="Nudge the whole grid">
                <span className="locker-tagger__nudge-label">
                  Nudge
                  {gNudge.yaw !== 0 || gNudge.pitch !== 0
                    ? ` · yaw ${round(gNudge.yaw)} · pitch ${round(gNudge.pitch)}`
                    : ''}
                </span>
                <Button variant="secondary" aria-label="Move left" onClick={() => nudgeGrid(-NUDGE_STEP, 0)}>
                  ←
                </Button>
                <Button variant="secondary" aria-label="Move up" onClick={() => nudgeGrid(0, NUDGE_STEP)}>
                  ↑
                </Button>
                <Button variant="secondary" aria-label="Move down" onClick={() => nudgeGrid(0, -NUDGE_STEP)}>
                  ↓
                </Button>
                <Button variant="secondary" aria-label="Move right" onClick={() => nudgeGrid(NUDGE_STEP, 0)}>
                  →
                </Button>
                {(gNudge.yaw !== 0 || gNudge.pitch !== 0) && (
                  <Button variant="secondary" onClick={() => setGNudge({ yaw: 0, pitch: 0 })}>
                    Reset
                  </Button>
                )}
              </div>
            )}
          </>
        ) : mode === 'quick' ? (
          <>
            <p className="locker-tagger__coords">
              Quick tag — tap each locker <strong>in order</strong>; it saves and advances on its own.
            </p>
            <div className="locker-tagger__quickrow">
              <span className="locker-tagger__next">
                {nextNum > section.number_end ? (
                  'All tagged ✓'
                ) : (
                  <>
                    Next: <strong>#{nextNum}</strong>
                  </>
                )}
              </span>
              <label className="locker-tagger__startat">
                <span>Start at</span>
                <input
                  className="admin-input"
                  type="number"
                  inputMode="numeric"
                  aria-label="Next locker number"
                  value={nextNum}
                  onChange={(e) => setNextNum(Number(e.target.value))}
                />
              </label>
              <Button variant="secondary" onClick={undoLastQuick} disabled={lastQuick == null}>
                Undo last
              </Button>
              <Button variant="secondary" onClick={() => setMode('manual')}>
                Manual
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="locker-tagger__coords">
              {captured
                ? `${isUpdate ? `Editing #${editingNum}` : 'Captured'} · yaw ${round(captured.yaw)} · pitch ${round(captured.pitch)}`
                : isUpdate
                  ? `Editing #${editingNum} — tap the photo to move its pin.`
                  : 'Tap a locker in the photo to capture its position.'}
            </p>
            <div className="locker-tagger__form">
              <input
                className="admin-input"
                type="number"
                inputMode="numeric"
                placeholder={`Locker # (${section.number_start}–${section.number_end})`}
                aria-label="Locker number"
                value={number}
                onChange={(e) => {
                  setNumber(e.target.value);
                  setError(null);
                }}
              />
              <Button variant="primary" onClick={save} disabled={savePin.isPending || !captured}>
                {savePin.isPending ? 'Saving…' : isUpdate ? 'Update pin' : 'Save pin'}
              </Button>
              {(number.trim() || captured) && (
                <Button variant="secondary" onClick={clearForm} disabled={savePin.isPending}>
                  Clear
                </Button>
              )}
            </div>
            <div className="locker-tagger__modebtns">
              <Button variant="secondary" onClick={startQuick}>
                ⚡ Quick tag — tap in order
              </Button>
              <Button variant="secondary" onClick={startGrid}>
                ▦ Grid fill — tap 4 corners
              </Button>
            </div>
          </>
        )}
        <Button
          variant="secondary"
          onClick={() => setDefaultView.mutate()}
          disabled={setDefaultView.isPending}
        >
          {setDefaultView.isPending ? 'Saving…' : 'Set current view as default'}
        </Button>

        {(error || savePin.isError || setDefaultView.isError || applyGrid.isError) && (
          <p className="admin-status admin-status--error" role="alert">
            {error ??
              (savePin.error instanceof Error
                ? savePin.error.message
                : applyGrid.error instanceof Error
                  ? applyGrid.error.message
                  : setDefaultView.error instanceof Error
                    ? setDefaultView.error.message
                    : 'Something went wrong.')}
          </p>
        )}

        {(lockers.data ?? []).length > 0 && (
          <ul className="locker-tagger__list">
            {(lockers.data ?? []).map((l) => (
              <li key={l.id} className="locker-tagger__row">
                <span>
                  #{l.number} · yaw {l.hotspot_yaw ?? '—'} · pitch {l.hotspot_pitch ?? '—'}
                </span>
                <span className="locker-tagger__rowactions">
                  <Button variant="secondary" onClick={() => startEdit(l)}>
                    Edit
                  </Button>
                  <ConfirmDeleteButton
                    label={`pin ${l.number}`}
                    pending={removePin.isPending && removePin.variables === l.id}
                    onConfirm={() => removePin.mutate(l.id)}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
