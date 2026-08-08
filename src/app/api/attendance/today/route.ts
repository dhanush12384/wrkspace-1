import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireEmployee } from '@/lib/api-auth';
import { todayKeyIST } from '@/lib/attendance-geo';
import { getShiftPolicy } from '@/lib/shift-policy';
import { assertCanCheckIn, hasApprovedLatePermission } from '@/lib/shift-jobs';

export async function GET(req: NextRequest) {
	try {
		const user = requireEmployee(req);
		const date = todayKeyIST();
		const emp = await db.employee.findUnique({ where: { id: user.sub } });
		const row = await db.attendance.findFirst({
			where: { employeeId: user.sub, date },
			orderBy: { createdAt: 'desc' },
		});
		const late = await db.lateCheckInRequest.findUnique({
			where: { employeeId_date: { employeeId: user.sub, date } },
		});
		const policy = getShiftPolicy(emp || {});
		let canCheckIn = true;
		let checkInBlock = null as Record<string, unknown> | null;
		try {
			if (emp) await assertCanCheckIn(emp);
		} catch (e: any) {
			canCheckIn = false;
			checkInBlock = e.payload || { code: e.code, error: e.message };
		}
		return Response.json({
			date,
			attendance: row,
			shiftCheckIn: emp?.shiftCheckIn || null,
			shiftCheckOut: emp?.shiftCheckOut || null,
			shiftPolicy: policy,
			latePermissionStatus: late?.status || null,
			canCheckIn,
			checkInBlock,
			approvedLate: await hasApprovedLatePermission(user.sub, date),
		});
	} catch (e: any) {
		return jsonError(e.message || 'Unauthorized', 401);
	}
}
