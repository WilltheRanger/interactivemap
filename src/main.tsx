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
import App from './app/App';

// Apply the saved theme + wire OS-scheme/cross-tab listeners (the inline script in index.html already
// set the first paint's data-theme to avoid a flash).
initTheme();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
