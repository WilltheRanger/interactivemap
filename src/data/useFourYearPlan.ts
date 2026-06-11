import { useSyncExternalStore } from 'react';
import { getPlanSnapshot, subscribePlan } from '../lib/fourYearPlanStore';

/** Reactive read of the on-device 4-year plan. */
export function useFourYearPlan() {
  return useSyncExternalStore(subscribePlan, getPlanSnapshot, getPlanSnapshot);
}
