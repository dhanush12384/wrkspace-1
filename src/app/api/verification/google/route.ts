import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, signEmployeeToken, signVerificationToken } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * After Firebase Google sign-in — works for everyone on this portal:
 * 1) portal / company account → public/company general view (or SUPER if portal SUPER)
 * 2) workspace admin → full admin dossier
 * 3) employee email → professional profile self-service
 * 4) any other Google account → public viewer (general employee info only)
 */
export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => ({}));
		const email = String(body?.email || '')
			.trim()
			.toLowerCase();
		if (!email) return jsonError('Google email missing', 400);

		const portal = await db.verificationPortalUser.findUnique({
			where: { email },
			include: { company: { select: { name: true, active: true } } },
		});
		if (portal) {
			if (!portal.active) return jsonError('Account disabled', 403);
			if (portal.company && portal.company.active === false) {
				return jsonError('Company access disabled', 403);
			}
			const role = portal.role === 'SUPER' ? 'SUPER' : 'COMPANY';
			const token = signVerificationToken({
				id: portal.id,
				email: portal.email,
				role,
				companyId: portal.companyId,
				companyName: portal.company?.name || null,
				source: 'portal',
			});
			await db.verificationPortalUser.update({
				where: { id: portal.id },
				data: { lastLoginAt: new Date() },
			});
			return Response.json({
				ok: true,
				token,
				user: {
					id: portal.id,
					email: portal.email,
					role,
					companyId: portal.companyId,
					companyName: portal.company?.name || null,
					source: 'portal',
				},
			});
		}

		const admin = await db.admin.findUnique({ where: { email } });
		if (admin && !admin.isTeamLead) {
			const token = signVerificationToken({
				id: admin.id,
				email: admin.email,
				role: 'SUPER',
				companyId: null,
				companyName: admin.organizationName || 'wrkspace',
				source: 'workspace_admin',
			});
			return Response.json({
				ok: true,
				token,
				user: {
					id: admin.id,
					email: admin.email,
					role: 'SUPER',
					companyId: null,
					companyName: admin.organizationName || 'wrkspace',
					source: 'workspace_admin',
				},
			});
		}

		const employee = await db.employee.findUnique({ where: { email } });
		if (employee) {
			const token = signEmployeeToken({
				id: employee.id,
				email: employee.email,
				role: employee.role || 'Employee',
			});
			return Response.json({
				ok: true,
				kind: 'employee',
				token,
				employee,
				user: {
					id: employee.id,
					email: employee.email,
					role: 'EMPLOYEE',
					companyId: null,
					companyName: null,
					source: 'employee',
				},
			});
		}

		// Any other Google account → public viewer (general employee information only).
		const publicId = `public:${email}`;
		const token = signVerificationToken({
			id: publicId,
			email,
			role: 'COMPANY',
			companyId: null,
			companyName: 'Public',
			source: 'public_google',
		});
		return Response.json({
			ok: true,
			token,
			user: {
				id: publicId,
				email,
				role: 'COMPANY',
				companyId: null,
				companyName: 'Public',
				source: 'public_google',
			},
		});
	} catch (e: any) {
		return jsonError(e.message || 'Google login failed', 500);
	}
}
