import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireEmployee } from '@/lib/api-auth';
import {
	profileFromEmployee,
	sanitizeProfessionalProfile,
	type ProfessionalProfile,
} from '@/lib/employee-professional-profile';

export const dynamic = 'force-dynamic';


export async function PATCH(req: NextRequest) {
	try {
		const user = requireEmployee(req);
		const body = (await req.json().catch(() => ({}))) as Partial<ProfessionalProfile>;
		const data = sanitizeProfessionalProfile(body, { allowRemarks: false });
		const employee = await db.employee.update({
			where: { id: user.sub },
			data,
		});
		const profile = profileFromEmployee(employee as any);
		profile.remarks = '';
		return Response.json({
			ok: true,
			employee: { ...employee, remarks: null },
			profile,
		});
	} catch (e: any) {
		const msg = e.message || 'Unauthorized';
		return jsonError(msg, msg === 'Unauthorized' ? 401 : 500);
	}
}

export async function GET(req: NextRequest) {
	try {
		const user = requireEmployee(req);
		const employee = await db.employee.findUnique({ where: { id: user.sub } });
		if (!employee) return jsonError('Employee not found', 404);
		const profile = profileFromEmployee(employee as any);
		profile.remarks = '';
		return Response.json({
			ok: true,
			profile,
			employee: { ...employee, remarks: null },
		});
	} catch (e: any) {
		const msg = e.message || 'Unauthorized';
		return jsonError(msg, msg === 'Unauthorized' ? 401 : 500);
	}
}
