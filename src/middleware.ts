import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MAINTENANCE_TTL_MS = Number(process.env.MAINTENANCE_STATE_TTL_MS || 10_000);
const MAINTENANCE_TIMEOUT_MS = Number(process.env.MAINTENANCE_STATE_TIMEOUT_MS || 6_000);
const MAINTENANCE_RETRY_DELAY_MS = 250;
const MAINTENANCE_ALLOWED_PREFIXES = [
  '/maintenance',
  '/_next',
  '/branding',
  '/studentforge',
];
const MAINTENANCE_ALLOWED_PATHS = new Set([
  '/favicon.ico',
  '/icon.png',
  '/manifest.webmanifest',
  '/robots.txt',
  '/sitemap.xml',
  '/firebase-messaging-sw.js',
]);

function normalizeEnvValue(value: string | undefined | null) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

function withMaintDebugHeaders(
  res: NextResponse,
  info: { source: string; enabled: boolean; reason: string; error?: string },
) {
  res.headers.set('x-maint-source', info.source);
  res.headers.set('x-maint-enabled', info.enabled ? 'true' : 'false');
  res.headers.set('x-maint-reason', info.reason);
  res.headers.set('x-maint-error', info.error || 'none');
  return res;
}

const maintenanceCache: {
  expiresAt: number;
  state: null | {
    maintenance_enabled: boolean;
    source?: string;
    degraded?: boolean;
    reason?: string;
    error?: string;
  };
} = {
  expiresAt: 0,
  state: null,
};

function isAllowedDuringMaintenance(pathname: string) {
  if (pathname.startsWith('/api/')) return true;
  if (MAINTENANCE_ALLOWED_PATHS.has(pathname)) return true;
  return MAINTENANCE_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function shortErrorCode(error: unknown) {
  const e = error as { name?: string; message?: string; code?: string };
  const msg = String(e?.message || '').toLowerCase();
  if (e?.name === 'AbortError' || msg.includes('aborted') || msg.includes('timeout')) {
    return 'timeout';
  }
  if (msg.includes('401')) return 'http_401';
  if (msg.includes('403')) return 'http_403';
  if (msg.includes('404')) return 'http_404';
  if (msg.includes('5')) return 'http_5xx';
  if (e?.code) return String(e.code).toLowerCase();
  return 'fetch_error';
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestMaintenanceState(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`maintenance endpoint failed ${res.status}`);
    }
    const payload = await res.json();
    return {
      maintenance_enabled: payload?.maintenance_enabled === true,
      source: String(payload?.source || 'backend'),
      degraded: payload?.degraded === true,
      reason: payload?.degraded ? 'backend_degraded' : 'backend_ok',
      error: 'none',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchMaintenanceState(req: NextRequest) {
  const now = Date.now();
  if (maintenanceCache.state && maintenanceCache.expiresAt > now) {
    return {
      ...maintenanceCache.state,
      reason: 'cache_fresh',
      error: 'none',
    };
  }

  const backendBase = (
    normalizeEnvValue(process.env.BACKEND_URL) ||
    normalizeEnvValue(process.env.NEXT_PUBLIC_BACKEND_URL) ||
    ''
  ).replace(/\/$/, '');

  if (!backendBase) {
    return {
      maintenance_enabled: false,
      source: 'no_backend_url',
      degraded: true,
      reason: 'missing_backend_url',
      error: 'config',
    };
  }

  const url = `${backendBase}/internal/maintenance-state`;
  const secret =
    normalizeEnvValue(process.env.INTERNAL_PUSH_SECRET) ||
    normalizeEnvValue(process.env.JWT_SECRET);
  const headers = {
    ...(secret ? { 'x-internal-secret': secret } : {}),
    'x-forwarded-host': req.nextUrl.host,
  };
  const staleCache = maintenanceCache.state;

  try {
    const state = await requestMaintenanceState(url, headers, MAINTENANCE_TIMEOUT_MS);
    maintenanceCache.state = state;
    maintenanceCache.expiresAt = now + MAINTENANCE_TTL_MS;
    return state;
  } catch (firstError) {
    const firstCode = shortErrorCode(firstError);
    if (staleCache) {
      // First failure + stale cache: keep last known state to avoid propagation drops.
      // Retry once in the background to recover quickly.
      void (async () => {
        try {
          await delay(MAINTENANCE_RETRY_DELAY_MS);
          const refreshed = await requestMaintenanceState(url, headers, MAINTENANCE_TIMEOUT_MS);
          maintenanceCache.state = refreshed;
          maintenanceCache.expiresAt = Date.now() + MAINTENANCE_TTL_MS;
        } catch {
          /* keep stale cache */
        }
      })();
      return {
        ...staleCache,
        source: 'cache-stale-fallback',
        degraded: true,
        reason: 'stale_cache_after_fetch_error',
        error: firstCode,
      };
    }

    try {
      await delay(MAINTENANCE_RETRY_DELAY_MS);
      const retryState = await requestMaintenanceState(url, headers, MAINTENANCE_TIMEOUT_MS);
      maintenanceCache.state = retryState;
      maintenanceCache.expiresAt = Date.now() + MAINTENANCE_TTL_MS;
      return {
        ...retryState,
        reason: 'retry_success',
      };
    } catch (retryError) {
      const retryCode = shortErrorCode(retryError);
      console.warn('[maintenance-guard] retry failed, allowing live traffic', retryError);
      if (maintenanceCache.state) {
        return {
          ...maintenanceCache.state,
          source: 'cache-fallback-after-retry',
          degraded: true,
          reason: 'stale_cache_after_retry_error',
          error: retryCode,
        };
      }
      return {
        maintenance_enabled: false,
        source: 'safe-live-fallback',
        degraded: true,
        reason: 'bridge_fetch_failed_after_retry',
        error: retryCode || firstCode,
      };
    }
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    if (req.method === 'OPTIONS') {
      const res = new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
      return withMaintDebugHeaders(res, {
        source: 'api',
        enabled: false,
        reason: 'api_options_bypass',
        error: 'none',
      });
    }

    const res = NextResponse.next();
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return withMaintDebugHeaders(res, {
      source: 'api',
      enabled: false,
      reason: 'api_bypass',
      error: 'none',
    });
  }

  if (isAllowedDuringMaintenance(pathname)) {
    const res = NextResponse.next();
    return withMaintDebugHeaders(res, {
      source: 'allowed',
      enabled: false,
      reason: 'allowed_path_bypass',
      error: 'none',
    });
  }

  const state = await fetchMaintenanceState(req);
  if (!state.maintenance_enabled) {
    const res = NextResponse.next();
    return withMaintDebugHeaders(res, {
      source: String(state.source || 'unknown'),
      enabled: false,
      reason: String(state.reason || 'maintenance_disabled'),
      error: String(state.error || 'none'),
    });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/maintenance';
  url.searchParams.set('from', pathname);
  const res = NextResponse.rewrite(url);
  return withMaintDebugHeaders(res, {
    source: String(state.source || 'unknown'),
    enabled: true,
    reason: String(state.reason || 'maintenance_enabled_rewrite'),
    error: String(state.error || 'none'),
  });
}

export const config = {
  matcher: '/:path*',
};
