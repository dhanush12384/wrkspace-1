import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireAdmin } from '@/lib/api-auth';
import { addAlertJobToQueue } from '@/lib/queue';

export async function POST(req: NextRequest) {
	try {
		// Secure endpoint to require Admin permissions
		const admin = requireAdmin(req);

		const body = await req.json().catch(() => ({}));
		const subject = String(body.subject || '').trim();
		const bodyText = String(body.body || '').trim();
		const employeeIds = body.employeeIds as string[] | undefined;

		if (!subject) return jsonError('Subject is required', 400);
		if (!bodyText) return jsonError('Body message is required', 400);

		let employees;
		if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
			employees = await db.employee.findMany({
				where: {
					id: { in: employeeIds },
					employmentStatus: 'Active',
				},
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
				},
			});
		} else {
			// Select all active employees
			employees = await db.employee.findMany({
				where: {
					employmentStatus: 'Active',
				},
				select: {
					id: true,
					email: true,
					firstName: true,
					lastName: true,
				},
			});
		}

		if (employees.length === 0) {
			return jsonError('No active employees selected/found to notify.', 404);
		}

		// Enqueue / dispatch email alert jobs
		const promises = employees.map(emp => 
			addAlertJobToQueue(emp.email, subject, bodyText)
		);
		const results = await Promise.all(promises);

		return Response.json({
			success: true,
			count: employees.length,
			results: results.map((r, i) => ({
				email: employees[i].email,
				...r
			}))
		});
	} catch (e: any) {
		console.error('Failed to send alerts:', e);
		return jsonError(e.message || 'Alert dispatch failed', 500);
	}
}
