// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduleEntry } from '../../types/personal';

// Mock the reference-data hooks so the editor runs against canned lists (no network / no RLS gate).
// Each returns the { data, isPending, isError } shape the pickers read.
const ok = <T,>(data: T) => ({ data, isPending: false, isError: false });
vi.mock('../../data/hooks', () => ({
  useCourses: () => ok([{ id: 'c1', name: 'Chemistry Pre-AP' }, { id: 'c2', name: 'Algebra I' }]),
  useTeachers: () => ok([
    { id: 'mr-hwang', name: 'Mr. Hwang' },
    { id: 'ms-chan', name: 'Ms. Chan' },
  ]),
  useBuildings: () => ok([{ id: 'bldg-500', label: 'Building 500' }]),
  useRoomsByBuilding: (buildingId: string | null) =>
    ok(buildingId ? [{ id: '509', label: '509', building_id: buildingId, teacher_id: null }] : []),
}));

// Imported after the mock is registered.
const { PeriodEditor } = await import('./PeriodEditor');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PERIOD = { id: '2', label: 'Period 2' };

describe('PeriodEditor — pick class then teacher', () => {
  let container: HTMLDivElement;
  let root: Root;
  let saved: ScheduleEntry | null;

  const render = () =>
    act(async () => {
      root.render(
        <PeriodEditor period={PERIOD} onSave={(e) => (saved = e)} onCancel={() => {}} />,
      );
    });

  // Click the first button whose trimmed text equals `text`.
  const click = (text: string) =>
    act(async () => {
      const btn = [...container.querySelectorAll('button')].find(
        (b) => b.textContent?.trim() === text,
      );
      if (!btn) throw new Error(`no button "${text}" (have: ${[...container.querySelectorAll('button')].map((b) => b.textContent?.trim()).join(' | ')})`);
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    saved = null;
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('starts on the class step listing the course catalog', async () => {
    await render();
    expect(container.textContent).toContain('Pick your class');
    expect(container.textContent).toContain('Chemistry Pre-AP');
    expect(container.textContent).toContain('Algebra I');
  });

  it('class → teacher saves a teacher entry with the class as the label', async () => {
    await render();
    await click('Chemistry Pre-AP');
    // Now on the teacher step, with the class seeded as the (editable) label.
    expect(container.textContent).toContain('Pick your teacher');
    expect(container.querySelector<HTMLInputElement>('input.sched-input')?.value).toBe(
      'Chemistry Pre-AP',
    );
    await click('Mr. Hwang');
    expect(saved).toEqual({ kind: 'teacher', teacher_id: 'mr-hwang', class_label: 'Chemistry Pre-AP' });
  });

  it('teacher is the join key — never course+period (no course/period stored)', async () => {
    await render();
    await click('Algebra I');
    await click('Ms. Chan');
    expect(saved).not.toBeNull();
    expect(Object.keys(saved!)).toEqual(['kind', 'teacher_id', 'class_label']);
    // The picked class is a display label only; the period ('2') never appears in the entry.
    expect(JSON.stringify(saved)).not.toContain('"2"');
  });

  it('"Pick by room instead" falls back through building → room, keeping the class label', async () => {
    await render();
    await click('Chemistry Pre-AP');
    await click('Pick by room instead');
    expect(container.textContent).toContain('Which building?');
    await click('Building 500');
    await click('509');
    expect(saved).toEqual({ kind: 'room', room_id: '509', class_label: 'Chemistry Pre-AP' });
  });

  it('"Pick your teacher anyway" skips the class with a blank label', async () => {
    await render();
    await click('Pick your teacher anyway');
    expect(container.textContent).toContain('Pick your teacher');
    await click('Mr. Hwang');
    expect(saved).toEqual({ kind: 'teacher', teacher_id: 'mr-hwang', class_label: '' });
  });

  it('Back from the teacher step returns to the class list', async () => {
    await render();
    await click('Algebra I');
    expect(container.textContent).toContain('Pick your teacher');
    await click('Back');
    expect(container.textContent).toContain('Pick your class');
    expect(container.textContent).toContain('Chemistry Pre-AP');
  });
});
