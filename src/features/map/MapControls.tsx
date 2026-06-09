import { motion } from 'framer-motion';
import { spring } from '../../lib/motion';
import './MapControls.css';

interface MapControlsProps {
  level: string;
  period: string;
}

/**
 * The stacked Level / Period card from the mockup. Static for now; both become interactive selectors:
 * - **Level**: switches the map between floors (downstairs/upstairs) — Phase 05 multi-level toggle
 *   (filters building shapes by `buildings.level`).
 * - **Period**: picks a period from the student's saved schedule; that period's class is highlighted
 *   on the map (passive, tap-driven — no live clock) — Phase 07.
 */
export function MapControls({ level, period }: MapControlsProps) {
  return (
    <motion.div
      className="map-controls"
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={spring.smooth}
    >
      <div className="map-controls__row">
        <span className="map-controls__label">Level</span>
        <span className="map-controls__value">{level}</span>
      </div>
      <div className="map-controls__divider" />
      <div className="map-controls__row">
        <span className="map-controls__label">Period</span>
        <span className="map-controls__value">{period}</span>
      </div>
    </motion.div>
  );
}
