import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { bearerFrom, jsonError, verifyToken } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

function requireAnyUser(req: NextRequest) {
	const token = bearerFrom(req);
	if (!token) throw new Error('Unauthorized');
	const payload = verifyToken<{ sub?: string }>(token);
	if (!payload?.sub) throw new Error('Unauthorized');
	return payload;
}

/** Binary avatar for Messages (mobile NetworkImage / web <img> with Bearer). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
	try {
		requireAnyUser(req);
		const { id } = await ctx.params;
		const emp = await db.employee.findUnique({
			where: { id },
			select: { photoUrl: true },
		});
		const raw = (emp?.photoUrl || '').trim();
		if (!raw) return new Response('Not found', { status: 404 });

		if (raw.startsWith('data:')) {
			const match = /^data:([^;]+);base64,(.+)$/s.exec(raw);
			if (!match) return jsonError('Invalid photo', 500);
			const contentType = match[1] || 'image/jpeg';
			const buf = Buffer.from(match[2], 'base64');
			return new Response(buf, {
				status: 200,
				headers: {
					'Content-Type': contentType,
					'Cache-Control': 'private, max-age=3600',
				},
			});
		}

		if (raw.startsWith('http://') || raw.startsWith('https://')) {
			return Response.redirect(raw, 302);
		}

		// Raw base64 without data: prefix
		const buf = Buffer.from(raw, 'base64');
		return new Response(buf, {
			status: 200,
			headers: {
				'Content-Type': 'image/jpeg',
				'Cache-Control': 'private, max-age=3600',
			},
		});
	} catch (e: any) {
		const msg = e.message || 'Unauthorized';
		return jsonError(msg, msg === 'Unauthorized' ? 401 : 500);
	}
}
