import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, X } from 'lucide-react';
import { Button } from '../../components';
import { Segmented, type SegmentedOption } from '../account/Segmented';
import { useLockerBlocks, useLockerSections } from '../../data/hooks';
import type { LockerSection } from '../../lib/refData';
import { getSupabase } from '../../lib/supabase';
import { CAMPUS_LEVELS, LEVEL_ORDER, isInLockerGroup, type CampusLevel } from '../map/campusGeo';

const LEVEL_OPTIONS: SegmentedOption<CampusLevel>[] = LEVEL_ORDER.map((l) => ({
  value: l,
  label: CAMPUS_LEVELS[l].label,
}));

/** Display name for a section (range): its label, falling back to its number range. */
function sectionRangeLabel(s: LockerSection): string {
  return s.label?.trim() || `${s.number_start}–${s.number_end}`;
}

/**
 * Tag lockers on map: pick a campus level (Upper / Lower), pick a section (range), then click the
 * locker shapes on that level's map that belong to it. Each shape belongs to one section; clicking a
 * shape owned by another section reassigns it. Saved to locker_sections.map_shape_ids — what the map
 * uses to resolve a tapped shape → its range + block + 360°. No SVG-file editing. Assignments persist
 * across a level switch, so one save covers both floors.
 */
export default function LockerMapTagger({ onClose }: { onClose: () => void }) {
  const sections = useLockerSections();
  const blocks = useLockerBlocks();
  const queryClient = useQueryClient();
  const [level, setLevel] = useState<CampusLevel>('upper');

  const svgHostRef = useRef<HTMLDivElement>(null);
  const shapesRef = useRef<SVGGraphicsElement[]>([]);
  // shapeId → sectionId. The single source of truth while tagging (a shape has one owner).
  const assignmentsRef = useRef<Map<string, string>>(new Map());
  const selectedRef = useRef<string>(''); // mirrors selectedSectionId for the click-handler closure
  const initedRef = useRef(false);

  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [svgReady, setSvgReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [dirty, setDirty] = useState(false);

  const config = CAMPUS_LEVELS[level];

  // Repaint every shape from the current assignments + selected section.
  const repaint = () => {
    const sel = selectedRef.current;
    for (const el of shapesRef.current) {
      const owner = assignmentsRef.current.get(el.id);
      el.classList.toggle('tagger-locker--mine', !!owner && owner === sel);
      el.classList.toggle('tagger-locker--other', !!owner && owner !== sel);
      el.classList.toggle('tagger-locker--free', !owner);
    }
  };

  // Load the selected level's campus SVG; wire each locker shape as a click target. Re-runs on a
  // level switch (assignments persist in the ref, so a switch just repaints the new floor's shapes).
  useEffect(() => {
    let cancelled = false;
    shapesRef.current = [];
    const { w: W, h: H } = config.imageSize;
    const { ax, sx, ay, sy } = config.svgToImage;
    const groupId = config.lockerGroupId;
    fetch(config.svgUrl)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('missing'))))
      .then((text) => {
        if (cancelled || !svgHostRef.current) return;
        const svg = new DOMParser().parseFromString(text, 'image/svg+xml')
          .documentElement as unknown as SVGSVGElement;
        if (svg.nodeName !== 'svg') {
          setLoadError(true);
          return;
        }
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        // Map the traced SVG onto the illustration's pixel frame so the clickable shapes land on the
        // drawn banks: identity for Upper (same frame), a fitted offset+scale for Lower.
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        svg.setAttribute('preserveAspectRatio', 'none');
        const wrap = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g');
        wrap.setAttribute('transform', `translate(${ax}, ${ay}) scale(${sx}, ${sy})`);
        while (svg.firstChild) wrap.appendChild(svg.firstChild);
        svg.appendChild(wrap);

        const shapes: SVGGraphicsElement[] = [];
        svg.querySelectorAll<SVGGraphicsElement>('rect[id], path[id]').forEach((shape) => {
          if (!isInLockerGroup(shape, groupId) || !shape.id) return;
          shape.classList.add('tagger-locker');
          shape.addEventListener('click', (event) => {
            event.stopPropagation();
            const sel = selectedRef.current;
            if (!sel) return; // pick a section first
            const current = assignmentsRef.current.get(shape.id);
            if (current === sel) assignmentsRef.current.delete(shape.id);
            else assignmentsRef.current.set(shape.id, sel);
            setDirty(true);
            repaint();
          });
          shapes.push(shape);
        });
        shapesRef.current = shapes;
        svgHostRef.current.replaceChildren(svg);
        setLoadError(false);
        setSvgReady(true);
        repaint(); // paint this floor's shapes from the persisted assignments + selected section
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
    // Re-run when the level changes (config is derived from it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // Seed assignments from the saved map_shape_ids the first time the sections load.
  useEffect(() => {
    if (initedRef.current || !sections.data) return;
    const map = new Map<string, string>();
    for (const s of sections.data) {
      for (const shapeId of s.map_shape_ids ?? []) map.set(shapeId, s.id);
    }
    assignmentsRef.current = map;
    initedRef.current = true;
    if (svgReady) repaint();
    // Default the picker to the first section so a click does something immediately.
    if (!selectedRef.current && sections.data.length) {
      selectedRef.current = sections.data[0].id;
      setSelectedSectionId(sections.data[0].id);
    }
  }, [sections.data, svgReady]);

  // Repaint when the picked section changes (selected vs other colouring) or the SVG becomes ready.
  useEffect(() => {
    selectedRef.current = selectedSectionId;
    if (svgReady) repaint();
  }, [selectedSectionId, svgReady]);

  const save = useMutation({
    mutationFn: async () => {
      const supabase = getSupabase();
      const bySection = new Map<string, string[]>();
      for (const [shapeId, secId] of assignmentsRef.current) {
        const list = bySection.get(secId) ?? [];
        list.push(shapeId);
        bySection.set(secId, list);
      }
      // Update only the sections whose shape set actually changed.
      for (const s of sections.data ?? []) {
        const next = (bySection.get(s.id) ?? []).slice().sort();
        const prev = (s.map_shape_ids ?? []).slice().sort();
        if (JSON.stringify(next) === JSON.stringify(prev)) continue;
        const { error } = await supabase
          .from('locker_sections')
          .update({ map_shape_ids: next })
          .eq('id', s.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setDirty(false);
      void queryClient.invalidateQueries({ queryKey: ['lockerSections'] });
    },
  });

  const blockLabel = (id: string | null) =>
    (id && (blocks.data ?? []).find((b) => b.id === id)?.label) || 'No block';

  // Section options grouped by block, for the picker.
  const grouped = new Map<string, LockerSection[]>();
  for (const s of sections.data ?? []) {
    const key = blockLabel(s.block_id);
    (grouped.get(key) ?? grouped.set(key, []).get(key)!).push(s);
  }

  return (
    <div className="map-tagger" role="dialog" aria-label="Tag lockers on map">
      <div className="map-tagger__bar">
        <p className="map-tagger__title">Tag lockers on map · {config.label}</p>
        <button type="button" className="pano__close" aria-label="Close" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="map-tagger__controls">
        <label className="map-tagger__pick">
          <span className="admin-field__label">Floor</span>
          <Segmented
            ariaLabel="Campus level"
            layoutId="tagger-level-seg"
            value={level}
            options={LEVEL_OPTIONS}
            onChange={setLevel}
          />
        </label>

        <label className="map-tagger__pick">
          <span className="admin-field__label">Section</span>
          <select
            className="admin-input"
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
          >
            {(sections.data ?? []).length === 0 && <option value="">No sections yet</option>}
            {[...grouped.entries()].map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map((s) => (
                  <option key={s.id} value={s.id}>
                    {sectionRangeLabel(s)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <div className="map-tagger__zoom" role="group" aria-label="Zoom">
          <Button
            variant="secondary"
            icon={<Minus size={16} />}
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(1, Math.round((z - 0.5) * 10) / 10))}
          />
          <Button
            variant="secondary"
            icon={<Plus size={16} />}
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(5, Math.round((z + 0.5) * 10) / 10))}
          />
        </div>

        <Button
          variant="primary"
          onClick={() => save.mutate()}
          disabled={!dirty || save.isPending}
        >
          {save.isPending ? 'Saving…' : dirty ? 'Save' : 'Saved'}
        </Button>
      </div>

      <p className="map-tagger__hint">
        Pick a section, then tap each locker shape that belongs to it.{' '}
        <span className="map-tagger__swatch map-tagger__swatch--mine" /> this section{' '}
        <span className="map-tagger__swatch map-tagger__swatch--other" /> another section{' '}
        <span className="map-tagger__swatch map-tagger__swatch--free" /> unassigned. Tap a shape again
        to clear it.
      </p>

      <div className="map-tagger__stage">
        {loadError ? (
          <p className="map-tagger__msg" role="alert">
            Couldn’t load the campus map.
          </p>
        ) : (
          <div className="map-tagger__canvas" style={{ width: `${zoom * 100}%` }}>
            <img className="map-tagger__img" src={config.imageUrl} alt="" />
            <div className="map-tagger__svg-host" ref={svgHostRef} aria-hidden={!svgReady} />
          </div>
        )}
      </div>

      {save.isError && (
        <p className="admin-status admin-status--error" role="alert">
          Couldn’t save: {save.error instanceof Error ? save.error.message : 'unknown error'}
        </p>
      )}
    </div>
  );
}
