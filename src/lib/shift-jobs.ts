import { db } from '@/lib/db';
import { notifyPush } from '@/lib/push-notify';
import { emitAttendanceUpdate, emitSafetyUpdate } from '@/lib/realtime-emit';
import { CHECKIN_REMINDER_OFFSETS, canCheckInNow, checkoutDue, getShiftPolicy, nowMinutesIST, todayKeyIST, } from '@/lib/shift-policy';
function isOpenSession(row: {
    checkIn?: string | null;
    checkOut?: string | null;
    status?: string | null;
}) {
    if (!row?.checkIn)
        return false;
    const out = row.checkOut;
    return out == null || String(out).trim() === '' || String(row.status || '') === 'Checked In';
}
async function markReminder(employeeId: string, date: string, kind: string) {
    try {
        await db.shiftReminderLog.create({
            data: { employeeId, date, kind },
        });
        return true;
    }
    catch {
        return false;
    }
}
export async function hasApprovedLatePermission(employeeId: string, date = todayKeyIST()) {
    const row = await db.lateCheckInRequest.findUnique({
        where: { employeeId_date: { employeeId, date } },
    });
    return row?.status === 'APPROVED';
}
export async function assertCanCheckIn(emp: {
    id: string;
    shiftCheckIn?: string | null;
    shiftCheckOut?: string | null;
}) {
    const approved = await hasApprovedLatePermission(emp.id);
    const gate = canCheckInNow(emp, { approvedLateForToday: approved });
    if (!gate.ok) {
        const err = new Error(`Unable to check in. Your check-in time was ${gate.checkInBy}. Request permission from admin.`) as Error & {
            status?: number;
            code?: string;
            payload?: Record<string, unknown>;
        };
        err.status = 403;
        err.code = 'CHECKIN_WINDOW_CLOSED';
        err.payload = {
            error: err.message,
            code: 'CHECKIN_WINDOW_CLOSED',
            checkInBy: gate.checkInBy,
            canRequestPermission: true,
        };
        throw err;
    }
    return gate;
}
export async function processShiftCheckoutJobs(opts?: {
    notify?: boolean;
}) {
    const notify = opts?.notify !== false;
    const today = todayKeyIST();
    const nowMins = nowMinutesIST();
    const result = { autoCheckedOut: 0, reminded: 0, todayStr: today, nowMins, disabled: false as const };
    const employees = await db.employee.findMany({
        select: {
            id: true,
            shiftCheckIn: true,
            shiftCheckOut: true,
        },
    });
    const byId = new Map(employees.map((e) => [e.id, e]));
    const openRows = await db.attendance.findMany({
        where: {
            OR: [{ checkOut: null }, { checkOut: '' }, { status: 'Checked In' }],
        },
        take: 800,
    });
    for (const row of openRows) {
        if (!isOpenSession(row))
            continue;
        const emp = byId.get(row.employeeId);
        if (!emp)
            continue;
        const due = checkoutDue(emp, row, { nowMins, today });
        if (!due?.due)
            continue;
        const updated = await db.attendance.update({
            where: { id: row.id },
            data: { checkOut: due.label, status: 'Present', checkoutReminderSent: true },
        });
        void emitAttendanceUpdate(row.employeeId, updated, 'auto-check-out');
        if (notify) {
            void notifyPush({
                title: 'Auto checked out',
                body: `You were checked out at ${due.label} (${row.date}).`,
                employeeId: row.employeeId,
                data: {
                    type: 'attendance',
                    action: 'auto_checkout',
                    date: row.date,
                    checkOut: due.label,
                    reason: due.reason,
                },
            }).catch(() => { });
        }
        result.autoCheckedOut++;
    }
    for (const emp of employees) {
        const policy = getShiftPolicy(emp);
        if (policy.kind !== 'timed' || policy.checkInMins == null)
            continue;
        const todayAtt = await db.attendance.findFirst({
            where: { employeeId: emp.id, date: today },
            orderBy: { createdAt: 'desc' },
        });
        if (todayAtt?.checkIn)
            continue;
        for (const { kind, lead } of CHECKIN_REMINDER_OFFSETS) {
            const at = policy.checkInMins - lead;
            if (nowMins < at || nowMins >= policy.checkInMins)
                continue;
            const ok = await markReminder(emp.id, today, kind);
            if (!ok)
                continue;
            if (notify) {
                void notifyPush({
                    title: 'Check-in reminder',
                    body: `Check in by ${policy.checkInLabel} (about ${lead} min left).`,
                    employeeId: emp.id,
                    data: {
                        type: 'attendance',
                        action: 'checkin_reminder',
                        lead: String(lead),
                        checkInBy: policy.checkInLabel || '',
                    },
                }).catch(() => { });
            }
            result.reminded++;
        }
    }
    return result;
}
export async function maybeArriveHomeFromLocation(tripId: string, employeeId: string, lat: number, lng: number) {
    const emp = await db.employee.findUnique({ where: { id: employeeId } });
    if (emp?.homeLat == null || emp?.homeLng == null)
        return null;
    const radius = emp.homeRadiusM || 100;
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(emp.homeLat - lat);
    const dLng = toRad(emp.homeLng - lng);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat)) * Math.cos(toRad(emp.homeLat)) * Math.sin(dLng / 2) ** 2;
    const dist = 2 * R * Math.asin(Math.sqrt(a));
    if (dist > radius)
        return null;
    const updated = await db.safetyTrip.update({
        where: { id: tripId },
        data: { status: 'ARRIVED_HOME', endedAt: new Date(), lat, lng },
    });
    void emitSafetyUpdate('trip_arrived', {
        employeeId,
        trip: updated,
    });
    void notifyPush({
        title: 'Arrived home',
        body: 'Home tracking stopped. You are safe.',
        employeeId,
        data: { type: 'safety', action: 'trip_arrived', tripId },
    }).catch(() => { });
    return updated;
}
