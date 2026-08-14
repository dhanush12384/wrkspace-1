import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireEmployee } from '@/lib/api-auth';
import { nowTimeLabelIST, todayKeyIST } from '@/lib/attendance-geo';
import { emitAttendanceUpdate } from '@/lib/realtime-emit';

const IGNORED_SCHEDULE_REASONS = new Set([
	'day_730',
	'day_700',
	'late_after_900',
	'late_after_930',
	'schedule_auto',
	'force_midnight',
]);

export async function POST(req: NextRequest) {
	try {
		const user = requireEmployee(req);
		const date = todayKeyIST();
		const body = await req.json().catch(() => ({}));
		const reason = String(body?.reason || '').trim();

		if (IGNORED_SCHEDULE_REASONS.has(reason)) {
			const existing = await db.attendance.findFirst({
				where: { employeeId: user.sub, date },
				orderBy: { createdAt: 'desc' },
			});
			return Response.json({
				attendance: existing,
				reason: 'ignored_schedule_auto',
				skipped: true,
				message: 'Schedule auto-checkout is disabled',
			});
		}

		const existing = await db.attendance.findFirst({
			where: { employeeId: user.sub, date },
			orderBy: { createdAt: 'desc' },
		});
		if (!existing) return jsonError('No clock-in found for today');
		if (existing.checkOut && String(existing.checkOut).trim() !== '') {
			return jsonError('Already clocked out');
		}

		// Apply strict completion rules
		const pendingTasks = await db.task.findMany({
			where: {
				assigneeId: user.sub,
				date: date,
				status: { not: 'Completed' }
			}
		});
		if (pendingTasks.length > 0) {
			return jsonError('You have incomplete tasks assigned for today. Please mark them as Completed before checking out.', 400);
		}

		const startOfDay = new Date(`${date}T00:00:00.000+05:30`);
		const endOfDay = new Date(`${date}T23:59:59.999+05:30`);
		const submissions = await db.workSubmission.findFirst({
			where: {
				employeeId: user.sub,
				submittedAt: { gte: startOfDay, lte: endOfDay }
			}
		});
		if (!submissions) {
			return jsonError('You have not submitted your work for today. Please submit your work before checking out.', 400);
		}

		const row = await db.attendance.update({
			where: { id: existing.id },
			data: { checkOut: nowTimeLabelIST(), status: 'Present' },
		});

		const action =
			reason === 'going_home'
				? 'going-home'
				: reason === 'outside_geofence_timeout' || reason === 'outside_geofence'
					? 'auto-check-out'
					: 'check-out';
		void emitAttendanceUpdate(user.sub, row, action);

		return Response.json({ attendance: row, reason: reason || 'manual' });
	} catch (e: any) {
		return jsonError(e.message || 'Unauthorized', e.message === 'Unauthorized' ? 401 : 500);
	}
}
