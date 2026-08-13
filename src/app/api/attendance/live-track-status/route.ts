import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireEmployee } from '@/lib/api-auth';
import { shouldTrackLocationNow } from '@/lib/location-track-policy';
import { todayKeyIST } from '@/lib/shift-policy';

export const dynamic = 'force-dynamic';


export async function GET(req: NextRequest) {
	try {
		const user = requireEmployee(req);
		const today = todayKeyIST();
		const [config, emp, att, openTrip] = await Promise.all([
			db.liveTrackConfig.findUnique({ where: { id: 'global' } }),
			db.employee.findUnique({
				where: { id: user.sub },
				select: {
					liveTrackActive: true,
					shiftCheckIn: true,
					shiftCheckOut: true,
					gender: true,
				},
			}),
			db.attendance.findFirst({
				where: { employeeId: user.sub, date: today, checkOut: null },
				orderBy: { createdAt: 'desc' },
			}),
			db.safetyTrip.findFirst({
				where: { employeeId: user.sub, status: 'IN_TRANSIT' },
				select: { id: true },
			}),
		]);

		const onShift = Boolean(att?.checkIn && (att.checkOut == null || String(att.checkOut).trim() === ''));
		const global = Boolean(config?.active);
		const personal = Boolean(emp?.liveTrackActive);
		const hasOpenHomeTrip = Boolean(openTrip?.id);
		const policy = shouldTrackLocationNow({
			onShift,
			shiftCheckIn: emp?.shiftCheckIn,
			shiftCheckOut: emp?.shiftCheckOut,
			hasOpenHomeTrip,
			adminOverride: global || personal,
		});

		return Response.json({
			shouldTrack: policy,
			global,
			personal,
			onShift,
			hasOpenHomeTrip,
			shiftCheckIn: emp?.shiftCheckIn ?? null,
			shiftCheckOut: emp?.shiftCheckOut ?? null,
			reason: global || personal
				? 'admin_override'
				: hasOpenHomeTrip
					? 'home_trip'
					: onShift
						? 'on_shift'
						: policy
							? 'pre_checkin_window'
							: 'idle',
			intervalMs: policy ? 20_000 : 120_000,
		});
	} catch (e: any) {
		const status = e.message === 'Unauthorized' ? 401 : 500;
		return jsonError(e.message || 'Failed', status);
	}
}
