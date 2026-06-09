import { motion } from 'framer-motion';
import { SearchInput } from '../../components/SearchInput';
import { MapControls } from './MapControls';
import { fadeUpItem, staggerContainer } from '../../lib/motion';
import './MapScreen.css';

/**
 * Map screen chrome (search + Level/Period card) over a placeholder canvas. Phase 05 replaces the
 * canvas with the real campus SVG (clickable buildings, pins, highlight, zoom controls).
 */
export function MapScreen() {
  return (
    <div className="map-screen">
      <motion.div
        className="map-screen__top"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div className="map-screen__search" variants={fadeUpItem}>
          <SearchInput
            placeholder="Search rooms, buildings, or locations…"
            aria-label="Search rooms, buildings, or locations"
          />
        </motion.div>
        <motion.div variants={fadeUpItem}>
          <MapControls level="1" period="3" />
        </motion.div>
      </motion.div>
      <div className="map-screen__canvas" role="img" aria-label="Campus map placeholder">
        <p className="map-screen__placeholder">Interactive campus map — Phase 05.</p>
      </div>
    </div>
  );
}
