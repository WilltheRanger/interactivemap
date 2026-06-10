import { motion } from 'framer-motion';
import { spring } from '../../lib/motion';
import type { CampusLevel } from './campusGeo';
import './MapControls.css';

interface MapControlsProps {
  level: CampusLevel;
  onToggleLevel: () => void;
  period: string;
}

const LEVEL_LABEL: Record<CampusLevel, string> = { upper: 'Upper', lower: 'Lower' };

/**
 * The stacked Level / Period card from the mockup.
 * - **Level**: tappable — switches the map between the upper and lower campus.
 * - **Period**: picks a period from the student's saved schedule; that period's class is
 *   highlighted on the map (passive, tap-driven — no live clock) — Phase 07, still static.
 */
export function MapControls({ level, onToggleLevel, period }: MapControlsProps) {
  const other = level === 'upper' ? 'lower' : 'upper';
  return (
    <motion.div
      className="map-controls"
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={spring.smooth}
    >
      <button
        type="button"
        className="map-controls__row map-controls__row--button"
        onClick={onToggleLevel}
        aria-label={`Level: ${LEVEL_LABEL[level]} campus. Switch to ${LEVEL_LABEL[other]}`}
      >
        <span className="map-controls__label">Level</span>
        <span className="map-controls__value">{LEVEL_LABEL[level]}</span>
      </button>
      <div className="map-controls__divider" />
      <div className="map-controls__row">
        <span className="map-controls__label">Period</span>
        <span className="map-controls__value">{period}</span>
      </div>
    </motion.div>
  );
}
