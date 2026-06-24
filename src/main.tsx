import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/app.css';
import { registerSW } from 'virtual:pwa-register';
import { initTheme } from './lib/theme';
import { initDisplayPrefs } from './lib/displayPrefs';
import { initPwaInstall } from './lib/pwaInstall';
import App from './app/App';

// Apply saved appearance prefs + wire OS-scheme/cross-tab listeners (the inline script in index.html
// already set the first paint to avoid a flash).
initTheme();
initDisplayPrefs();

// Capture the "Add to Home Screen" prompt early — Chromium can fire beforeinstallprompt before React
// mounts, so the listener must be attached before render (see InstallPrompt).
initPwaInstall();

// PWA updates take over immediately: with registerType 'autoUpdate' the new service worker skips
// waiting, and this registration reloads the tab when it takes control — no more stale builds
// until a manual double-reload. (GitHub Pages still caches sw.js ~10 min after a deploy.)
registerSW({ immediate: true });

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

// Boot guard: if mounting throws before the in-app error boundaries exist, show a plain reload
// prompt instead of leaving the static "Loading…" fallback (index.html) up forever.
try {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  console.error('[boot]', error);
  rootEl.innerHTML =
    '<div class="boot-fallback" role="alert"><p>Something went wrong starting the app.</p>' +
    '<button onclick="location.reload()">Reload</button></div>';
}
