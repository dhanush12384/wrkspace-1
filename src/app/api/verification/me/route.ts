import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireVerification, signEmployeeToken } from '@/lib/api-auth';
import { linkAdminToEmployee } from '@/lib/verification-admin-employee-link';

export const dynamic = 'force-dynamic';

/** SUPER: resolve / refresh the linked Employee row (Admin · Technical merge). */
export async function GET(req: NextRequest) {
	try {
		const user = requireVerification(req);
		if (user.role !== 'SUPER') {
			return Response.json({ linkedEmployee: null, employeeToken: null, employeeId: null });
		}

		const admin = await db.admin.findUnique({ where: { email: user.email } });
		if (admin) {
			const linked = await linkAdminToEmployee(admin);
			return Response.json({
				ok: true,
				linkedEmployee: linked.employee,
				employeeToken: linked.employeeToken,
				employeeId: linked.employee?.id || null,
			});
		}

		const emp = await db.employee.findUnique({ where: { email: user.email } });
		if (!emp) {
			return Response.json({ ok: true, linkedEmployee: null, employeeToken: null, employeeId: null });
		}

		return Response.json({
			ok: true,
			linkedEmployee: emp,
			employeeToken: signEmployeeToken({
				id: emp.id,
				email: emp.email,
				role: emp.role || 'Employee',
			}),
			employeeId: emp.id,
		});
	} catch (e: any) {
		const msg = e.message || 'Unauthorized';
		return jsonError(msg, msg === 'Unauthorized' ? 401 : 500);
	}
}
