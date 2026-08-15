import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireAdmin } from '@/lib/api-auth';
import { normalizeTimeLabel } from '@/lib/shift-policy';
export async function GET(req: NextRequest) {
    try {
        requireAdmin(req);
        const rows = await db.employee.findMany({
            orderBy: { firstName: 'asc' },
            select: {
                id: true,
                firstName: true,
                middleName: true,
                lastName: true,
                email: true,
                role: true,
                wingName: true,
                shiftCheckIn: true,
                shiftCheckOut: true,
            },
        });
        return Response.json({ employees: rows });
    }
    catch (e: any) {
        return jsonError(e.message || 'Unauthorized', e.message === 'Unauthorized' ? 401 : 500);
    }
}
export async function PATCH(req: NextRequest) {
    try {
        requireAdmin(req);
        const body = await req.json();
        const id = String(body.id || '').trim();
        if (!id)
            return jsonError('id required');
        const checkInRaw = body.shiftCheckIn;
        const checkOutRaw = body.shiftCheckOut;
        const shiftCheckIn = checkInRaw === null || checkInRaw === '' ? null : normalizeTimeLabel(checkInRaw);
        const shiftCheckOut = checkOutRaw === null || checkOutRaw === '' ? null : normalizeTimeLabel(checkOutRaw);
        if (checkInRaw && shiftCheckIn == null)
            return jsonError('Invalid shiftCheckIn');
        if (checkOutRaw && shiftCheckOut == null)
            return jsonError('Invalid shiftCheckOut');
        const emp = await db.employee.update({
            where: { id },
            data: { shiftCheckIn, shiftCheckOut },
        });
        return Response.json({ employee: emp });
    }
    catch (e: any) {
        return jsonError(e.message || 'Failed', e.message === 'Unauthorized' ? 401 : 500);
    }
}
