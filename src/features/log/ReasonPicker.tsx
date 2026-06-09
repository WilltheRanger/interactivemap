import { motion } from 'framer-motion';
import { HALL_PASS_REASONS, type HallPassReason } from '../../lib/hallPass';
import { fadeUpItem, staggerContainer, tap } from '../../lib/motion';

interface ReasonPickerProps {
  /** Fired with the chosen reason; the parent advances to the scan step. */
  onPick: (reason: HallPassReason) => void;
}

/**
 * Step 1 of the Log flow: the student taps a reason (placeholder list from hallPass.ts). One tap
 * advances straight to the scanner so it's quick to use in a hallway.
 */
export function ReasonPicker({ onPick }: ReasonPickerProps) {
  return (
    <motion.ul
      className="reason-picker"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {HALL_PASS_REASONS.map((reason) => (
        <motion.li key={reason} variants={fadeUpItem}>
          <motion.button
            type="button"
            className="reason-picker__option"
            onClick={() => onPick(reason)}
            whileTap={tap}
          >
            {reason}
          </motion.button>
        </motion.li>
      ))}
    </motion.ul>
  );
}
