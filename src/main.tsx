import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './style.css';
import { deriveBrandColorsFromLogo, applyBrandColors } from './utils/brandColors.ts';

// Clean up any problematic service workers on page load
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      // Unregister old service workers that might be causing issues
      // The new one will be registered by VitePWA plugin
      registration.unregister().then((success) => {
        if (success) {
          console.log('[ServiceWorker] Old service worker unregistered');
        }
      });
    });
  });
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root not found');
}

const root = createRoot(container);

// Derive brand colors from company logo at runtime (non-blocking)
(async () => {
  const derived = await deriveBrandColorsFromLogo('/tahcomlogo.png');
  if (derived) applyBrandColors(derived);
})();

root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);


