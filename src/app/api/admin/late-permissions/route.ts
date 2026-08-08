import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireAdmin } from '@/lib/api-auth';
import { employeeDisplayName } from '@/lib/attendance-geo';
import { emitAttendanceUpdate } from '@/lib/realtime-emit';
import { notifyPush } from '@/lib/push-notify';

export async function GET(req: NextRequest) {
	try {
		requireAdmin(req);
		const status = req.nextUrl.searchParams.get('status') || undefined;
		const rows = await db.lateCheckInRequest.findMany({
			where: status ? { status } : undefined,
			orderBy: { createdAt: 'desc' },
			take: 200,
			include: {
				employee: {
					select: {
						id: true,
						firstName: true,
						middleName: true,
						lastName: true,
						email: true,
						shiftCheckIn: true,
						shiftCheckOut: true,
					},
				},
			},
		});
		return Response.json({
			requests: rows.map((r) => ({
				...r,
				employeeName: employeeDisplayName(r.employee),
			})),
		});
	} catch (e: any) {
		return jsonError(e.message || 'Unauthorized', e.message === 'Unauthorized' ? 401 : 500);
	}
}

export async function POST(req: NextRequest) {
	try {
		const admin = requireAdmin(req);
		const body = await req.json();
		const id = String(body.id || '').trim();
		const action = String(body.action || '').toLowerCase();
		if (!id) return jsonError('id required');
		if (action !== 'approve' && action !== 'deny') return jsonError('action must be approve or deny');
		const status = action === 'approve' ? 'APPROVED' : 'DENIED';
		const row = await db.lateCheckInRequest.update({
			where: { id },
			data: {
				status,
				reviewedBy: admin.email || admin.sub,
				reviewedAt: new Date(),
			},
			include: { employee: true },
		});
		void emitAttendanceUpdate(row.employeeId, { latePermission: row }, 'late-permission');
		void notifyPush({
			title: status === 'APPROVED' ? 'Late check-in approved' : 'Late check-in denied',
			body:
				status === 'APPROVED'
					? 'You can check in now. Scan the office QR.'
					: 'Your late check-in request was denied.',
			employeeId: row.employeeId,
			data: { type: 'late_permission', action: status.toLowerCase(), requestId: row.id },
		}).catch(() => {});
		return Response.json({
			request: { ...row, employeeName: employeeDisplayName(row.employee) },
		});
	} catch (e: any) {
		return jsonError(e.message || 'Failed', e.message === 'Unauthorized' ? 401 : 500);
	}
}
