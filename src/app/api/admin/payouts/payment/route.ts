import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireAdmin } from '@/lib/api-auth';
import { isPaymentDetailsComplete, paymentFieldsForPublic } from '@/lib/payment-details';
import { employeeDisplayName } from '@/lib/attendance-geo';
import { emitAttendanceUpdate } from '@/lib/realtime-emit';

function row(e: any) {
	return {
		id: e.id,
		firstName: e.firstName,
		middleName: e.middleName,
		lastName: e.lastName,
		name: employeeDisplayName(e),
		email: e.email,
		...paymentFieldsForPublic(e),
		paymentDetailsComplete: isPaymentDetailsComplete(e),
	};
}

export async function PATCH(req: NextRequest) {
	try {
		requireAdmin(req);
		const body = await req.json();
		const employeeId = String(body.employeeId || body.id || '').trim();
		if (!employeeId) return jsonError('employeeId required');

		let data: Record<string, unknown>;
		if (body.clear === true) {
			data = {
				upiId: null,
				bankAccountHolderName: null,
				bankAccountNumber: null,
				bankName: null,
				bankIfsc: null,
				paymentDetailsFilledAt: null,
			};
		} else {
			const upiId =
				body.upiId != null ? String(body.upiId).trim().slice(0, 120) || null : undefined;
			const bankAccountHolderName =
				body.bankAccountHolderName != null
					? String(body.bankAccountHolderName).trim().slice(0, 120) || null
					: undefined;
			const bankAccountNumber =
				body.bankAccountNumber != null
					? String(body.bankAccountNumber).trim().slice(0, 40) || null
					: undefined;
			const bankName =
				body.bankName != null ? String(body.bankName).trim().slice(0, 120) || null : undefined;
			const bankIfsc =
				body.bankIfsc != null
					? String(body.bankIfsc).trim().toUpperCase().slice(0, 20) || null
					: undefined;
			data = {};
			if (upiId !== undefined) data.upiId = upiId;
			if (bankAccountHolderName !== undefined) data.bankAccountHolderName = bankAccountHolderName;
			if (bankAccountNumber !== undefined) data.bankAccountNumber = bankAccountNumber;
			if (bankName !== undefined) data.bankName = bankName;
			if (bankIfsc !== undefined) data.bankIfsc = bankIfsc;
			const existing = await db.employee.findUnique({ where: { id: employeeId } });
			const next = { ...existing, ...data };
			data.paymentDetailsFilledAt = isPaymentDetailsComplete(next as any) ? new Date() : null;
		}

		const emp = await db.employee.update({
			where: { id: employeeId },
			data: data as any,
		});
		void emitAttendanceUpdate(emp.id, { payout: row(emp) }, 'payout-update');
		return Response.json({ employee: row(emp) });
	} catch (e: any) {
		return jsonError(e.message || 'Failed', e.message === 'Unauthorized' ? 401 : 500);
	}
}
