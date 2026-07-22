import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, signVerificationToken } from '@/lib/api-auth';
import { linkAdminToEmployee } from '@/lib/verification-admin-employee-link';

export const dynamic = 'force-dynamic';

async function sessionFromPortalUser(user: {
	id: string;
	email: string;
	role: string;
	companyId: string | null;
	company?: { name: string } | null;
}) {
	const role = user.role === 'SUPER' ? 'SUPER' : 'COMPANY';
	const token = signVerificationToken({
		id: user.id,
		email: user.email,
		role,
		companyId: user.companyId,
		companyName: user.company?.name || null,
		source: 'portal',
	});
	await db.verificationPortalUser.update({
		where: { id: user.id },
		data: { lastLoginAt: new Date() },
	});

	// Portal SUPER may also be a workspace person — attach linked employee if same email
	let linkedEmployee = null as Awaited<ReturnType<typeof linkAdminToEmployee>>['employee'];
	let employeeToken = null as string | null;
	if (role === 'SUPER') {
		const admin = await db.admin.findUnique({ where: { email: user.email } });
		if (admin) {
			const linked = await linkAdminToEmployee(admin);
			linkedEmployee = linked.employee;
			employeeToken = linked.employeeToken;
		} else {
			const emp = await db.employee.findUnique({
				where: { email: user.email },
				select: {
					id: true,
					email: true,
					firstName: true,
					middleName: true,
					lastName: true,
					phone: true,
					wingName: true,
					wingLeadName: true,
					role: true,
					photoUrl: true,
					professionalTitle: true,
					about: true,
				},
			});
			if (emp) {
				const { signEmployeeToken } = await import('@/lib/api-auth');
				linkedEmployee = emp;
				employeeToken = signEmployeeToken({
					id: emp.id,
					email: emp.email,
					role: emp.role || 'Employee',
				});
			}
		}
	}

	return {
		token,
		employeeToken,
		linkedEmployee,
		user: {
			id: user.id,
			email: user.email,
			role,
			companyId: user.companyId,
			companyName: user.company?.name || null,
			source: 'portal' as const,
			employeeId: linkedEmployee?.id || null,
		},
	};
}

async function sessionFromWorkspaceAdmin(admin: {
	id: string;
	email: string;
	organizationName?: string | null;
	employeeId?: string | null;
}) {
	const linked = await linkAdminToEmployee(admin);
	const token = signVerificationToken({
		id: admin.id,
		email: admin.email,
		role: 'SUPER',
		companyId: null,
		companyName: admin.organizationName || 'wrkspace',
		source: 'workspace_admin',
	});
	return {
		token,
		employeeToken: linked.employeeToken,
		linkedEmployee: linked.employee,
		user: {
			id: admin.id,
			email: admin.email,
			role: 'SUPER' as const,
			companyId: null,
			companyName: admin.organizationName || 'wrkspace',
			source: 'workspace_admin' as const,
			employeeId: linked.employee?.id || null,
		},
	};
}

/** Email/password login for Employee Verification portal. */
export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => ({}));
		const email = String(body?.email || '')
			.trim()
			.toLowerCase();
		const password = String(body?.password || '');
		if (!email || !password) return jsonError('Email and password required', 400);

		const portal = await db.verificationPortalUser.findUnique({
			where: { email },
			include: { company: { select: { name: true, active: true } } },
		});
		if (portal) {
			if (!portal.active) return jsonError('Account disabled', 403);
			if (portal.company && portal.company.active === false) {
				return jsonError('Company access disabled', 403);
			}
			if (portal.password !== password) return jsonError('Invalid credentials', 401);
			return Response.json({ ok: true, ...(await sessionFromPortalUser(portal)) });
		}

		// Workspace admins (main admin panel) may enter this portal as SUPER
		const admin = await db.admin.findUnique({ where: { email } });
		if (admin && admin.password === password && !admin.isTeamLead) {
			return Response.json({ ok: true, ...(await sessionFromWorkspaceAdmin(admin)) });
		}

		return jsonError('Invalid credentials', 401);
	} catch (e: any) {
		return jsonError(e.message || 'Login failed', 500);
	}
}
