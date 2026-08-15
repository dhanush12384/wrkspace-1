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
        role: e.role,
        wingName: e.wingName,
        ...paymentFieldsForPublic(e),
        paymentDetailsComplete: isPaymentDetailsComplete(e),
    };
}
export async function GET(req: NextRequest) {
    try {
        requireAdmin(req);
        const all = req.nextUrl.searchParams.get('all') === '1';
        const rows = await db.employee.findMany({
            where: all ? undefined : { stipendAmount: { not: null } },
            orderBy: { firstName: 'asc' },
            select: {
                id: true,
                firstName: true,
                middleName: true,
                lastName: true,
                email: true,
                role: true,
                wingName: true,
                stipendAmount: true,
                upiId: true,
                bankAccountHolderName: true,
                bankAccountNumber: true,
                bankName: true,
                bankIfsc: true,
                paymentDetailsFilledAt: true,
            },
        });
        return Response.json({ employees: rows.map(row) });
    }
    catch (e: any) {
        return jsonError(e.message || 'Unauthorized', e.message === 'Unauthorized' ? 401 : 500);
    }
}
export async function PATCH(req: NextRequest) {
    try {
        requireAdmin(req);
        const body = await req.json();
        const employeeId = String(body.employeeId || body.id || '').trim();
        if (!employeeId)
            return jsonError('employeeId required');
        let stipendAmount = body.stipendAmount;
        if (stipendAmount === null || stipendAmount === '' || stipendAmount === undefined) {
            stipendAmount = null;
        }
        else {
            stipendAmount = Math.round(Number(stipendAmount));
            if (!Number.isFinite(stipendAmount) || stipendAmount < 0) {
                return jsonError('Invalid stipendAmount');
            }
        }
        const emp = await db.employee.update({
            where: { id: employeeId },
            data: { stipendAmount },
        });
        void emitAttendanceUpdate(emp.id, { payout: row(emp) }, 'payout-update');
        return Response.json({ employee: row(emp) });
    }
    catch (e: any) {
        return jsonError(e.message || 'Failed', e.message === 'Unauthorized' ? 401 : 500);
    }
}
