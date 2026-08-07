import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
// Inter is the official M2M working face (BRAND FOUNDATION v6 §2, ruled 2026-08-03).
// Self-hosted rather than loaded from Google Fonts on purpose: a kiosk on flaky shop
// WiFi must not fall back to a system face, and iPads do not ship with Inter.
// The variable font carries 400–800 in one file — 800 is the wordmark weight.
import '@fontsource-variable/inter';
import App from './App.tsx';
import ErrorBoundary from './ErrorBoundary.tsx';
import './index.css';

// The boundary sits OUTSIDE App, so it still stands if App's own top level throws. Without
// it a render error unmounts the tree and leaves a blank white panel in a shop — see the
// file header. It is the outermost thing here for that reason; do not move it inside.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
