import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';
import { env } from './shared/env';

async function enableMocking() {
  if (!env.VITE_MOCKS_ENABLED) return;

  const { worker } = await import('./mocks/browser');
  // BASE_URL is '/' locally and '/OrderPulsev2/' on GitHub Pages
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

  await worker.start({
    serviceWorker: { url: `${base}mockServiceWorker.js` },
    onUnhandledRequest: 'bypass',
  });
}

function renderApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element #root not found');

  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </StrictMode>,
  );
}

enableMocking()
  .catch((err) => {
    console.error('[MSW] Failed to start mock service worker:', err);
  })
  .finally(renderApp);
