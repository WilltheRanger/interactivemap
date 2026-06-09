/** Phase 12: pick a reason, scan the teacher's QR -> opens the teacher's Apps Script logger. */
export function LogScreen() {
  return (
    <section className="screen" aria-labelledby="log-title">
      <h1 id="log-title" className="screen__title">
        Log
      </h1>
      <p className="screen__sub">
        Pick a reason, then scan your teacher&rsquo;s hall-pass QR to log your pass.
      </p>
    </section>
  );
}
