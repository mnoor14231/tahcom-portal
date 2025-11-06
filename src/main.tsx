import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './style.css';
import { deriveBrandColorsFromLogo, applyBrandColors } from './utils/brandColors.ts';

// CRITICAL: Completely disable service worker for now to fix API issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      // Unregister ALL service workers immediately
      registration.unregister().then((success) => {
        console.log('[ServiceWorker] Unregistered:', success);
      });
    });
  });
  
  // Also unregister on controller change
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
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


