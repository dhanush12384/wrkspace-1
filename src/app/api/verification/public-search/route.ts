import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
	try {
		const q = String(req.nextUrl.searchParams.get('q') || '')
			.trim()
			.toLowerCase();

		if (!q) {
			return Response.json({ employees: [], total: 0 });
		}

		// Split the query by spaces to support matching first/middle/last name
		const parts = q.split(/\s+/).filter(Boolean);

		// Find employees matching search parts case-insensitively
		const conditions = parts.map(part => ({
			OR: [
				{ firstName: { contains: part, mode: 'insensitive' as const } },
				{ middleName: { contains: part, mode: 'insensitive' as const } },
				{ lastName: { contains: part, mode: 'insensitive' as const } }
			]
		}));

		const employees = await db.employee.findMany({
			where: {
				AND: conditions
			},
			select: {
				id: true,
				firstName: true,
				middleName: true,
				lastName: true,
				email: true,
				phone: true,
				wingName: true,
				wingLeadName: true,
				role: true,
				gender: true,
				photoUrl: true,
				createdAt: true,
				employmentStatus: true,
				monthWorked: true,
			},
			orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
		});

		const maskEmail = (email: string) => {
			const parts = email.split('@');
			if (parts.length !== 2) return '***';
			const name = parts[0];
			const domain = parts[1];
			if (name.length <= 2) return `${name.charAt(0)}***@${domain}`;
			return `${name.slice(0, 2)}***@${domain}`;
		};

		const maskPhone = (phone: string) => {
			if (phone.length <= 4) return '******';
			return `******${phone.slice(-4)}`;
		};

		const rows = employees.map((e) => {
			const name = [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ').trim();
			return {
				id: e.id,
				name,
				email: maskEmail(e.email),
				phone: maskPhone(e.phone),
				wingName: e.wingName,
				wingLeadName: e.wingLeadName,
				role: e.role,
				gender: e.gender,
				photoUrl: e.photoUrl,
				joinedAt: e.createdAt.toISOString(),
				employmentStatus: e.employmentStatus || 'Active',
				monthWorked: e.monthWorked || '',
			};
		});

		return Response.json({ employees: rows, total: rows.length, at: new Date().toISOString() });
	} catch (e: any) {
		return jsonError(e.message || 'Public search failed', 500);
	}
}
