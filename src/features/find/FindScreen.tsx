import { SearchInput } from '../../components/SearchInput';

/** Phase 05 wires this to the reference data (rooms / buildings / teachers) lookup. */
export function FindScreen() {
  return (
    <section className="screen" aria-labelledby="find-title">
      <h1 id="find-title" className="screen__title">
        Find
      </h1>
      <p className="screen__sub">Search rooms, buildings, and locations across campus.</p>
      <div className="screen__body">
        <SearchInput
          placeholder="Search rooms, buildings, or locations…"
          aria-label="Search rooms, buildings, or locations"
        />
      </div>
    </section>
  );
}
