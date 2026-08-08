import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireEmployee } from '@/lib/api-auth';
import { isInsideRadius, todayKeyIST } from '@/lib/attendance-geo';
import { emitAttendanceUpdate } from '@/lib/realtime-emit';
import { notifyPush } from '@/lib/push-notify';

function isOpenSession(row: { checkIn?: string | null; checkOut?: string | null; status?: string | null } | null) {
	if (!row?.checkIn) return false;
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

		const date = todayKeyIST();
		const today = await db.attendance.findFirst({
			where: { employeeId: user.sub, date },
			orderBy: { createdAt: 'desc' },
		});
		const onShift = isOpenSession(today);
		let officeArrive = false;

		if (!onShift) {
			const offices = await db.office.findMany({ where: { active: true } });
			const inside = offices.some((o) => {
				const r = o.radiusMeters || 300;
				return isInsideRadius(lat, lng, o.lat, o.lng, r).within;
			});
			if (inside) {
				const last = emp.officeArriveNotifiedAt ? new Date(emp.officeArriveNotifiedAt).getTime() : 0;
				if (Date.now() - last > 30 * 60_000) {
					await db.employee.update({
						where: { id: emp.id },
						data: { officeArriveNotifiedAt: new Date() },
					});
					void notifyPush({
						title: 'You are at the office',
						body: 'Please scan the QR code to check in.',
						employeeId: emp.id,
						data: { type: 'attendance', action: 'office_arrive' },
					}).catch(() => {});
					void emitAttendanceUpdate(emp.id, { officeArrive: true }, 'office-arrive');
					officeArrive = true;
				}
			}
		}

		return Response.json({ ok: true, location: emp, officeArrive, autoCheckedOut: null });
	} catch (e: any) {
		const status = e.message === 'Unauthorized' ? 401 : 500;
		return jsonError(e.message || 'Failed', status);
	}
}
