import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireEmployee, requireVerification } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
	try {
		let authUser: { sub: string; email: string; role: string; isSuper: boolean };
		try {
			const emp = requireEmployee(req);
			authUser = { sub: emp.sub, email: emp.email, role: 'EMPLOYEE', isSuper: false };
		} catch {
			const v = requireVerification(req);
			authUser = { sub: v.sub, email: v.email, role: v.role, isSuper: v.role === 'SUPER' };
		}

		if (authUser.role !== 'SUPER' && authUser.role !== 'EMPLOYEE') {
			return jsonError('This portal is for employees and admins only', 403);
		}
		const q = String(req.nextUrl.searchParams.get('q') || '')
			.trim()
			.toLowerCase();

		const employees = await db.employee.findMany({
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
				lastLocationAt: true,
				employmentStatus: true,
			},
			orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
		});

		const isAdmin = authUser.role === 'SUPER';
		const rows = employees
			.map((e) => {
				const name = [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ').trim();
				return {
					id: e.id,
					name,
					email: e.email,
					phone: e.phone,
					wingName: e.wingName,
					wingLeadName: e.wingLeadName,
					role: e.role,
					gender: e.gender,
					photoUrl: e.photoUrl,
					joinedAt: e.createdAt,
					employmentStatus: e.employmentStatus || 'Active',
					
					lastLocationAt: isAdmin ? e.lastLocationAt : null,
				};
			})
			.filter((e) => {
				if (!q) return true;
				return (
					e.name.toLowerCase().includes(q) ||
					e.email.toLowerCase().includes(q) ||
					e.phone.toLowerCase().includes(q) ||
					e.id.toLowerCase().includes(q) ||
					e.wingName.toLowerCase().includes(q)
				);
			});

		return Response.json({ employees: rows, total: rows.length, at: new Date().toISOString() });
	} catch (e: any) {
		const msg = e.message || 'Unauthorized';
		return jsonError(msg, msg === 'Unauthorized' ? 401 : 500);
	}
}
