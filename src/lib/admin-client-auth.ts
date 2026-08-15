'use client';

/** Admin UI historically stored only `{ email }` — mint a Bearer JWT when missing. */
export function adminSessionEmail(): string {
	if (typeof window === 'undefined') return '';
	try {
		const raw = localStorage.getItem('wrkspace_admin_session');
		if (!raw) return '';
		return String((JSON.parse(raw) as { email?: string }).email || '')
			.trim()
			.toLowerCase();
	} catch {
		return '';
	}
}

export function readAdminToken(): string {
	if (typeof window === 'undefined') return '';
	try {
		const direct = localStorage.getItem('wrkspace_admin_token');
		if (direct) return direct;
		const raw = localStorage.getItem('wrkspace_admin_session');
		if (!raw) return '';
		return String((JSON.parse(raw) as { token?: string }).token || '');
	} catch {
		return '';
	}
}

export async function ensureAdminToken(emailFallback?: string): Promise<string> {
	const existing = readAdminToken();
	if (existing) return existing;
	const email = (emailFallback || adminSessionEmail()).trim().toLowerCase();
	if (!email) return '';
	const res = await fetch('/api/admin/realtime-token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email }),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok || !data.token) {
		throw new Error((data as any).error || 'Admin auth failed — sign in again');
	}
	const token = String(data.token);
	localStorage.setItem('wrkspace_admin_token', token);
	try {
		const raw = localStorage.getItem('wrkspace_admin_session');
		const prev = raw ? JSON.parse(raw) : {};
		localStorage.setItem('wrkspace_admin_session', JSON.stringify({ ...prev, email, token }));
	} catch {
		localStorage.setItem('wrkspace_admin_session', JSON.stringify({ email, token }));
	}
	return token;
}
