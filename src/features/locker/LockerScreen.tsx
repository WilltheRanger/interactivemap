/**
 * Locker screen (shell stub).
 * Phase 08 adds number entry -> section-by-range resolution -> map highlight -> Pannellum 360° + pin.
 * States to cover: loading (large panorama), found, not-found (number in no range).
 */
export function LockerScreen() {
  return (
    <section className="app-screen" aria-labelledby="locker-title">
      <h1 id="locker-title">Locker</h1>
      <p>Find your locker and see it in 360°. (Coming in Phase 08.)</p>
    </section>
  );
}
