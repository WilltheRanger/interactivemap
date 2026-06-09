/**
 * Schedule screen (shell stub).
 * Phase 06 adds master-schedule-powered entry; Phase 07 adds the passive, tap-driven display.
 * The three async states (loading / empty-first-run / not-found) get the Phase 04 state primitives.
 */
export function ScheduleScreen() {
  return (
    <section className="app-screen" aria-labelledby="schedule-title">
      <h1 id="schedule-title">Schedule</h1>
      <p>Enter your classes to see where to go. (Coming in Phases 06–07.)</p>
    </section>
  );
}
