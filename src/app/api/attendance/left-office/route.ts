import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireEmployee } from '@/lib/api-auth';
import { notifyPush } from '@/lib/push-notify';
import { todayKeyIST } from '@/lib/attendance-geo';
import { emitAttendanceUpdate } from '@/lib/realtime-emit';

function isOpen(row: { checkIn?: string | null; checkOut?: string | null } | null) {
	if (!row?.checkIn) return false;
	const out = row.checkOut;
	return out == null || String(out).trim() === '';
}

function distM(aLat: number, aLng: number, bLat: number, bLng: number) {
	const R = 6371000;
	const toR = (d: number) => (d * Math.PI) / 180;
	const dLat = toR(bLat - aLat);
	const dLng = toR(bLng - aLng);
	const x =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(x));
}

/** Mobile left office geofence → FCM with Office work / Going home choice. */
export async function POST(req: NextRequest) {
	try {
		const user = requireEmployee(req);
		const date = todayKeyIST();
		const existing = await db.attendance.findFirst({
			where: { employeeId: user.sub, date },
			orderBy: { createdAt: 'desc' },
		});
		if (!existing || !isOpen(existing)) {
			return jsonError('No open shift', 400);
		}

		// Server-side guard: do not push if last known GPS is still inside an office fence.
		const emp = await db.employee.findUnique({
			where: { id: user.sub },
			select: { lastLat: true, lastLng: true, lastLocationAt: true },
		});
		const lat = emp?.lastLat != null ? Number(emp.lastLat) : NaN;
		const lng = emp?.lastLng != null ? Number(emp.lastLng) : NaN;
		const locAgeMs = emp?.lastLocationAt ? Date.now() - new Date(emp.lastLocationAt).getTime() : Infinity;

		if (Number.isFinite(lat) && Number.isFinite(lng) && locAgeMs < 5 * 60_000) {
			const offices = await db.office.findMany({
				where: { active: true },
				select: { lat: true, lng: true, geofenceM: true },
			});
			const stillInside = offices.some((o) => {
				const r = Number(o.geofenceM) > 0 ? Number(o.geofenceM) : 300;
				// Keep a soft buffer so noisy indoor GPS does not pass the server check.
				return distM(lat, lng, Number(o.lat), Number(o.lng)) <= r + 80;
			});
			if (stillInside) {
				return Response.json({
					ok: false,
					skipped: 'still_inside_office',
					attendance: existing,
				});
			}
		}

		void emitAttendanceUpdate(user.sub, existing, 'left-office');

		const push = await notifyPush({
			title: 'Leaving office area',
			body: 'Choose within 5 min: Office work (stay checked in) or Going home / check out. No reply → auto check-out.',
			employeeId: user.sub,
			data: {
				type: 'office_exit',
				action: 'choose',
				officeWork: 'office_work',
				goingHome: 'going_home',
			},
		});

		return Response.json({ ok: true, push, attendance: existing });
	} catch (e: any) {
		const status = e.message === 'Unauthorized' ? 401 : 500;
		return jsonError(e.message || 'Failed to notify', status);
	}
}
