import { db } from '@/lib/db';
import { jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * Public login helper for Employee Verification — emails only (no passwords).
 * So reviewers know which accounts work on this page.
 */
export async function GET() {
	try {
		const [admins, portalUsers] = await Promise.all([
			db.admin.findMany({
				where: { isTeamLead: false },
				select: { email: true, organizationName: true },
				orderBy: { email: 'asc' },
				take: 40,
			}),
			db.verificationPortalUser.findMany({
				where: { active: true },
				select: {
					email: true,
					role: true,
					company: { select: { name: true } },
				},
				orderBy: { email: 'asc' },
				take: 40,
			}),
		]);

		return Response.json({
			workspaceAdmins: admins.map((a) => ({
				email: a.email,
				org: a.organizationName || 'wrkspace',
			})),
			companyLogins: portalUsers.map((u) => ({
				email: u.email,
				role: u.role,
				company: u.company?.name || null,
			})),
			howTo: [
				'Use the same email + password as the Admin panel (/admin).',
				'Or Continue with Google using that same admin Gmail.',
				'Employee portal logins will NOT work here.',
				'Company logins are created inside this portal → Company access (after a workspace admin signs in).',
			],
			adminPanelUrl: '/admin',
		});
	} catch (e: any) {
		return jsonError(e.message || 'Failed', 500);
	}
}
