import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireEmployee } from '@/lib/api-auth';
import { isInsideRadius, todayKeyIST } from '@/lib/attendance-geo';
import { emitAttendanceUpdate } from '@/lib/realtime-emit';
import { notifyPush } from '@/lib/push-notify';
function isOpenSession(row: {
    checkIn?: string | null;
    checkOut?: string | null;
    status?: string | null;
} | null) {
    if (!row?.checkIn)
        return false;
    const out = row.checkOut;
    return out == null || String(out).trim() === '' || String(row.status || '') === 'Checked In';
}
export async function POST(req: NextRequest) {
    try {
        const user = requireEmployee(req);
        const body = await req.json().catch(() => ({}));
        const lat = Number(body?.lat);
        const lng = Number(body?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return jsonError('lat/lng required', 400);
        }
        const emp = await db.employee.update({
            where: { id: user.sub },
            data: { lastLat: lat, lastLng: lng, lastLocationAt: new Date() },
        });
        let officeArrive = false;
        let autoCheckedOut: unknown = null;
        try {
            const todayStr = todayKeyIST();
            const offices = await db.office.findMany({ where: { active: true } });
            let inside = false;
            for (const off of offices) {
                const check = isInsideRadius(lat, lng, off.lat, off.lng, off.radiusMeters || 300);
                if (check.within) {
                    inside = true;
                    break;
                }
            }
            const open = await db.attendance.findFirst({
                where: { employeeId: user.sub, date: todayStr },
                orderBy: { createdAt: 'desc' },
            });
            if (inside) {
                const last = emp.officeArriveNotifiedAt ? new Date(emp.officeArriveNotifiedAt).getTime() : 0;
                if (Date.now() - last > 30 * 60000) {
                    await db.employee.update({
                        where: { id: emp.id },
                        data: { officeArriveNotifiedAt: new Date() },
                    });
                    void notifyPush({
                        title: 'You are at the office',
                        body: 'Please scan the QR code to check in.',
                        employeeId: emp.id,
                        data: { type: 'attendance', action: 'office_arrive' },
                    }).catch(() => { });
                    void emitAttendanceUpdate(emp.id, { officeArrive: true }, 'office-arrive');
                    officeArrive = true;
                }
            }
            const stale = await db.attendance.findMany({
                where: {
                    employeeId: user.sub,
                    date: { lt: todayStr },
                    OR: [{ checkOut: null }, { checkOut: '' }, { status: 'Checked In' }],
                },
                take: 5,
            });
            for (const log of stale) {
                const row = await db.attendance.update({
                    where: { id: log.id },
                    data: { checkOut: '12:00 AM', status: 'Present', checkoutReminderSent: true },
                });
                void emitAttendanceUpdate(user.sub, row, 'auto-check-out');
            }
        }
        catch (e) {
            console.warn('[location] auto-checkout side effect', e);
        }
        return Response.json({ ok: true, location: emp, officeArrive, autoCheckedOut: null });
    }
    catch (e: any) {
        const status = e.message === 'Unauthorized' ? 401 : 500;
        return jsonError(e.message || 'Failed', status);
    }
}
