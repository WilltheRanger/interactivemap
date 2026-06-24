import { motion } from 'framer-motion';
import { spring } from '../../lib/motion';
import { CAMPUS_LEVELS, LEVEL_ORDER, type CampusLevel } from './campusGeo';
import './MapControls.css';

interface MapControlsProps {
  level: CampusLevel;
  onSelectLevel: (level: CampusLevel) => void;
}

/**
 * Floating level switcher for the map — Upper / Lower as a segmented pill (same visual language as
 * the app's Segmented control + bottom-nav indicator: a sliding primary fill marks the active level).
 * The old static "Period" row is gone: it showed a hardcoded number and did nothing, so it read as a
 * broken control. The passive period→class highlight returns here once schedule→room resolution lands.
 */
export function MapControls({ level, onSelectLevel }: MapControlsProps) {
  return (
    <div className="map-levels" role="radiogroup" aria-label="Campus level">
      {LEVEL_ORDER.map((lvl) => {
        const active = lvl === level;
        return (
          <button
            key={lvl}
            type="button"
            role="radio"
            aria-checked={active}
            className={`map-levels__option${active ? ' is-active' : ''}`}
            onClick={() => onSelectLevel(lvl)}
          >
            {active && (
              <motion.span
                layoutId="map-level-indicator"
                className="map-levels__indicator"
                transition={spring.snappy}
              />
            )}
            <span className="map-levels__label">{CAMPUS_LEVELS[lvl].label}</span>
          </button>
        );
      })}
    </div>
  );
}
