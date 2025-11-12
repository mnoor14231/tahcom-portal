const STABLE_BACKEND_BASE = 'https://tahcom-api.vercel.app';

function normalizeConfiguredBase(raw?: string | null): string | null {
  if (!raw) return null;
  let base = raw.trim();
  if (!base) return null;

  base = base.replace(/\/+$/, '');

  // Strip trailing /api/partners because admin endpoints live at the root
  const partnersSuffix = '/api/partners';
  if (base.toLowerCase().endsWith(partnersSuffix)) {
    base = base.slice(0, -partnersSuffix.length);
  }

  try {
    const url = new URL(base);
    // If we are already pointing at the stable backend domain, stick to the known host
    if (url.hostname === 'tahcom-api.vercel.app') {
      return STABLE_BACKEND_BASE;
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

export function getAdminApiBase(): string {
  const configured = normalizeConfiguredBase(import.meta.env.VITE_API_BASE_URL);
  if (configured) {
    return configured;
  }

  const defaultBackend = import.meta.env.DEV
    ? 'http://localhost:8787'
    : STABLE_BACKEND_BASE;

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      if (port === '5173') {
        return `${protocol}//${hostname}:8787`;
      }
      return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
    }
  }

  return defaultBackend;
}

export function buildAdminApiUrl(path: string): string {
  const base = getAdminApiBase();
  return `${base}${path}`;
}


