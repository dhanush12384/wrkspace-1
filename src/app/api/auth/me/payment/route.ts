import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireEmployee } from '@/lib/api-auth';
import {
	isPaymentDetailsComplete,
	parseEmployeePaymentBody,
	paymentFieldsForPublic,
} from '@/lib/payment-details';
import { employeeDisplayName } from '@/lib/attendance-geo';
import { emitAttendanceUpdate } from '@/lib/realtime-emit';

function shape(emp: any) {
	const gender = String(emp.gender || 'UNSPECIFIED').toUpperCase();
	return {
		id: emp.id,
		employeeCode: emp.id,
		email: emp.email,
		name: employeeDisplayName(emp),
		firstName: emp.firstName,
		middleName: emp.middleName,
		lastName: emp.lastName,
		wingName: emp.wingName,
		wingLeadName: emp.wingLeadName,
		role: emp.role,
		phone: emp.phone,
		gender,
		isFemale: gender === 'FEMALE',
		...paymentFieldsForPublic(emp),
	};
}

export async function PATCH(req: NextRequest) {
	try {
		const user = requireEmployee(req);
		const existing = await db.employee.findUnique({ where: { id: user.sub } });
		if (!existing) return jsonError('Employee not found', 404);
		const body = await req.json().catch(() => ({}));
		const parsed = parseEmployeePaymentBody(body, isPaymentDetailsComplete(existing));
		if ('error' in parsed) return jsonError(parsed.error, parsed.status);
		const emp = await db.employee.update({
			where: { id: user.sub },
			data: parsed.data as any,
		});
		void emitAttendanceUpdate(emp.id, { payout: shape(emp) }, 'payout-update');
		return Response.json({ employee: shape(emp) });
	} catch (e: any) {
		const msg = e.message || 'Unauthorized';
		return jsonError(msg, msg === 'Unauthorized' ? 401 : 500);
	}
}
