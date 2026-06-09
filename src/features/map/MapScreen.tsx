import { SearchInput } from '../../components/SearchInput';
import { MapControls } from './MapControls';
import './MapScreen.css';

/**
 * Map screen chrome (search + Level/Period card) over a placeholder canvas. Phase 05 replaces the
 * canvas with the real campus SVG (clickable buildings, pins, highlight, zoom controls).
 */
export function MapScreen() {
  return (
    <div className="map-screen">
      <div className="map-screen__top">
        <SearchInput
          placeholder="Search rooms, buildings, or locations…"
          aria-label="Search rooms, buildings, or locations"
        />
        <MapControls level="1" period="3" />
      </div>
      <div className="map-screen__canvas" role="img" aria-label="Campus map placeholder">
        <p className="map-screen__placeholder">Interactive campus map — Phase 05.</p>
      </div>
    </div>
  );
}
