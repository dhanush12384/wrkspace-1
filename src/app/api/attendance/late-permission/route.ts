import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireEmployee } from '@/lib/api-auth';
import { employeeDisplayName, todayKeyIST } from '@/lib/attendance-geo';
import { LATE_PERMISSION_APPROVER_IDS, getShiftPolicy } from '@/lib/shift-policy';
import { hasApprovedLatePermission } from '@/lib/shift-jobs';
import { notifyPush } from '@/lib/push-notify';
import { emitAttendanceUpdate } from '@/lib/realtime-emit';

export async function GET(req: NextRequest) {
	try {
		const user = requireEmployee(req);
		const date = todayKeyIST();
		const row = await db.lateCheckInRequest.findUnique({
			where: { employeeId_date: { employeeId: user.sub, date } },
		});
		return Response.json({ date, request: row });
	} catch (e: any) {
		return jsonError(e.message || 'Unauthorized', 401);
	}
}

export async function POST(req: NextRequest) {
	try {
		const user = requireEmployee(req);
		const emp = await db.employee.findUnique({ where: { id: user.sub } });
		if (!emp) return jsonError('Employee not found', 404);

		const policy = getShiftPolicy(emp);
		if (policy.kind === 'open') {
			return jsonError('You can check in anytime — no permission needed', 400);
		}
		if (await hasApprovedLatePermission(emp.id)) {
			return Response.json({ ok: true, status: 'APPROVED', message: 'Already approved for today' });
		}

		const date = todayKeyIST();
		const body = await req.json().catch(() => ({}));
		const reason = String(body?.reason || '').trim() || null;
		const existing = await db.lateCheckInRequest.findUnique({
			where: { employeeId_date: { employeeId: emp.id, date } },
		});
		if (existing?.status === 'PENDING') {
			return Response.json({ ok: true, request: existing, message: 'Request already pending' });
		}

		const request =
			existing?.status === 'DENIED'
				? await db.lateCheckInRequest.update({
						where: { id: existing.id },
						data: { status: 'PENDING', reason, reviewedBy: null, reviewedAt: null },
					})
				: await db.lateCheckInRequest.create({
						data: { employeeId: emp.id, date, reason, status: 'PENDING' },
					});

		const name = employeeDisplayName(emp);
		for (const id of LATE_PERMISSION_APPROVER_IDS) {
			void notifyPush({
				title: 'Late check-in request',
				body: `${name} missed ${policy.checkInLabel} — approve in Admin → Late check-ins.`,
				employeeId: id,
				data: {
					type: 'late_permission',
					action: 'pending',
					requestId: request.id,
					employeeId: emp.id,
					date,
				},
			}).catch(() => {});
		}
		void emitAttendanceUpdate(emp.id, { latePermission: request }, 'late-permission');

		return Response.json({ ok: true, request });
	} catch (e: any) {
		return jsonError(e.message || 'Failed', e.message === 'Unauthorized' ? 401 : 500);
	}
}
