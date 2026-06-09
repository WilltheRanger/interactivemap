import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/app.css';
import { initTheme } from './lib/theme';
import { initDisplayPrefs } from './lib/displayPrefs';
import App from './app/App';

// Apply saved appearance prefs + wire OS-scheme/cross-tab listeners (the inline script in index.html
// already set the first paint to avoid a flash).
initTheme();
initDisplayPrefs();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
