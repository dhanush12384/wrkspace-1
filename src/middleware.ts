import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MAINTENANCE_TTL_MS = Number(process.env.MAINTENANCE_STATE_TTL_MS || 10_000);
const MAINTENANCE_TIMEOUT_MS = Number(process.env.MAINTENANCE_STATE_TIMEOUT_MS || 1_500);
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

const maintenanceCache: {
  expiresAt: number;
  state: null | {
    maintenance_enabled: boolean;
    source?: string;
    degraded?: boolean;
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

async function fetchMaintenanceState(req: NextRequest) {
  const now = Date.now();
  if (maintenanceCache.state && maintenanceCache.expiresAt > now) {
    return maintenanceCache.state;
  }

  const backendBase = (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    ''
  ).replace(/\/$/, '');

  if (!backendBase) {
    return { maintenance_enabled: false, source: 'no_backend_url', degraded: true };
  }

  const url = `${backendBase}/internal/maintenance-state`;
  const secret = process.env.INTERNAL_PUSH_SECRET || process.env.JWT_SECRET || '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MAINTENANCE_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        ...(secret ? { 'x-internal-secret': secret } : {}),
        'x-forwarded-host': req.nextUrl.host,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`maintenance endpoint failed ${res.status}`);
    }
    const payload = await res.json();
    const state = {
      maintenance_enabled: payload?.maintenance_enabled === true,
      source: String(payload?.source || 'backend'),
      degraded: payload?.degraded === true,
    };
    maintenanceCache.state = state;
    maintenanceCache.expiresAt = now + MAINTENANCE_TTL_MS;
    return state;
  } catch (error) {
    console.warn('[maintenance-guard] failed, allowing live traffic', error);
    if (maintenanceCache.state) return maintenanceCache.state;
    return { maintenance_enabled: false, source: 'safe-live-fallback', degraded: true };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const res = NextResponse.next();
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res;
  }

  if (isAllowedDuringMaintenance(pathname)) {
    return NextResponse.next();
  }

  return fetchMaintenanceState(req).then((state) => {
    if (!state.maintenance_enabled) {
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    url.pathname = '/maintenance';
    url.searchParams.set('from', pathname);
    return NextResponse.rewrite(url);
  });
}

export const config = {
  matcher: '/:path*',
};
