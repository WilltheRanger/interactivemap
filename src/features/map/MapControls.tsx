import { motion } from 'framer-motion';
import { spring } from '../../lib/motion';
import './MapControls.css';

interface MapControlsProps {
  level: string;
  period: string;
}

/**
 * The stacked Level / Period card from the mockup. Static for now; Phase 05 wires Level to the map's
 * level toggle and Phase 07 wires Period to the (passive) schedule highlight selector.
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
