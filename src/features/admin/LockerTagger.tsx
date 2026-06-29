import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components';
import { useLockersBySection, usePanorama, useSignedPanoramaUrl } from '../../data/hooks';
import type { Locker, LockerSection } from '../../lib/refData';
import { getSupabase } from '../../lib/supabase';
import { ConfirmDeleteButton } from './shared';
import PanoramaViewer, { type PanoPin } from '../locker/PanoramaViewer';
import '../locker/LockersScreen.css'; // the .pano* / .pano-pin shell styles the viewer needs

const round = (n: number) => Math.round(n * 10) / 10;

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
  // Quick-tag mode: each photo tap drops a pin at the next number in order and saves it — no typing,
  // no Save click. The fast way to tag a whole bank (the numbers run in sequence).
  const [quick, setQuick] = useState(false);
  const [nextNum, setNextNum] = useState(section.number_start);
  const [lastQuick, setLastQuick] = useState<number | null>(null);

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

  // Existing tagged lockers as pins (tap a marker to edit it), plus the just-clicked point so you can
  // see what you're saving. The locker being edited shows only as the live "pending" pin (not twice).
  const pins = useMemo<PanoPin[]>(() => {
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
  }, [lockers.data, captured, editingNum, startEdit]);

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

  // A tap on the photo. Quick mode: drop+save the next pin and advance. Manual: just capture the spot.
  const handlePick = (pos: { yaw: number; pitch: number }) => {
    if (!quick) {
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
    setQuick(true);
  };

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
        {quick ? (
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
              <Button variant="secondary" onClick={() => setQuick(false)}>
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
            <Button variant="secondary" onClick={startQuick}>
              ⚡ Quick tag — tap lockers in order
            </Button>
          </>
        )}
        <Button
          variant="secondary"
          onClick={() => setDefaultView.mutate()}
          disabled={setDefaultView.isPending}
        >
          {setDefaultView.isPending ? 'Saving…' : 'Set current view as default'}
        </Button>

        {(error || savePin.isError || setDefaultView.isError) && (
          <p className="admin-status admin-status--error" role="alert">
            {error ??
              (savePin.error instanceof Error
                ? savePin.error.message
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
