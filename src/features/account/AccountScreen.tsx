/** Phase 09: Google sign-in restricted to @stu.wvusd.org (access gate; data stays on-device). */
export function AccountScreen() {
  return (
    <section className="screen" aria-labelledby="account-title">
      <h1 id="account-title" className="screen__title">
        Account
      </h1>
      <p className="screen__sub">Sign in with your school Google account to use the app.</p>
    </section>
  );
}
