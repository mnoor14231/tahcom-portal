import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './style.css';
import { deriveBrandColorsFromLogo, applyBrandColors } from './utils/brandColors.ts';
import { supabase } from './lib/supabaseClient.ts';
import { buildAdminApiUrl } from './utils/apiBase.ts';

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

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  let token = data.session?.access_token;

  if ((!token || error) && typeof supabase.auth.refreshSession === 'function') {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session?.access_token) {
      throw new Error('session_expired');
    }
    token = refreshData.session.access_token;
  }

  if (!token) throw new Error('session_missing');
  return token;
}

if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url && url.includes('/rest/v1/kpis')) {
      try {
        const method = (init?.method ?? 'GET').toUpperCase();
        if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
          return originalFetch(input, init);
        }

        const token = await getAccessToken();
        let body: any = undefined;
        if (init?.body && typeof init.body === 'string') {
          try {
            body = JSON.parse(init.body);
          } catch {
            body = undefined;
          }
        }

        const urlObj = new URL(url);
        const idParam = urlObj.searchParams.get('id');
        const id = idParam?.startsWith('eq.') ? idParam.slice(3) : idParam ?? body?.id;

        let backendUrl = '';
        if (method === 'POST') {
          backendUrl = buildAdminApiUrl('/api/admin/kpis');
        } else if (id) {
          backendUrl = buildAdminApiUrl(`/api/admin/kpis/${id}`);
        } else {
          console.warn('[DataContext] KPI intercept missing id', { method, url });
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const response = await originalFetch(backendUrl, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: method === 'DELETE' ? undefined : JSON.stringify({
            id,
            departmentCode: body?.department_code ?? body?.departmentCode,
            name: body?.name,
            description: body?.description ?? null,
            unit: body?.unit,
            target: body?.target,
            currentValue: body?.current_value ?? body?.currentValue,
            ownerUserId: body?.owner_user_id ?? body?.ownerUserId ?? null,
            lastUpdated: body?.last_updated ?? body?.lastUpdated ?? new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          console.warn('[DataContext] KPI intercept backend error', response.status, detail);
          return new Response(JSON.stringify({ error: 'kpi_backend_failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (method === 'POST') {
          return new Response(JSON.stringify([]), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(null, { status: method === 'PATCH' ? 204 : 200 });
      } catch (err) {
        console.error('[DataContext] KPI intercept failed', err);
        return new Response(JSON.stringify({ error: 'kpi_intercept_failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return originalFetch(input, init);
  };
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


