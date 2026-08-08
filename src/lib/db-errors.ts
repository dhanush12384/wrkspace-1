/** Map Neon/Prisma failures to short client-facing messages. */
export function friendlyDbError(err: unknown, fallback = 'Database error'): string {
	const raw = String((err as { message?: string })?.message || err || '');
	if (/data transfer quota|exceeded the data transfer|53000/i.test(raw)) {
		return 'Database data transfer quota exceeded. Upgrade or wait for Neon plan reset, then try again.';
	}
	if (/too many connections|connection pool|P2024/i.test(raw)) {
		return 'Database is busy. Wait a moment and try again.';
	}
	if (/Can't reach database|P1001|ECONNREFUSED|ETIMEDOUT/i.test(raw)) {
		return 'Cannot reach database. Check connection and try again.';
	}
	// Avoid dumping raw Prisma stacks to the app UI.
	if (/Invalid `prisma\.|PrismaClient/i.test(raw)) {
		return fallback;
	}
	return raw.trim() || fallback;
}
