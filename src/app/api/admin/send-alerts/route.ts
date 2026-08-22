import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireAdmin } from '@/lib/api-auth';
import { addAlertJobsToQueue } from '@/lib/queue';
export async function POST(req: NextRequest) {
    try {
        const admin = requireAdmin(req);
        const body = await req.json().catch(() => ({}));
        const subject = String(body.subject || '').trim();
        const bodyText = String(body.body || '').trim();
        const employeeIds = body.employeeIds as string[] | undefined;
        const customEmails = (body.recipientEmails || body.customEmails || body.recipients) as string[] | string | undefined;

        if (!subject)
            return jsonError('Subject is required', 400);
        if (!bodyText)
            return jsonError('Body message is required', 400);

        let targetEmails: string[] = [];

        if (customEmails) {
            const list = Array.isArray(customEmails) ? customEmails : [customEmails];
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            for (const item of list) {
                if (typeof item === 'string') {
                    const parts = item.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
                    for (const email of parts) {
                        if (emailRegex.test(email) && !targetEmails.includes(email)) {
                            targetEmails.push(email);
                        }
                    }
                }
            }
        } else if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
            const employees = await db.employee.findMany({
                where: {
                    id: { in: employeeIds },
                    employmentStatus: 'Active',
                },
                select: { email: true },
            });
            targetEmails = employees.map(emp => emp.email);
        } else {
            const employees = await db.employee.findMany({
                where: {
                    employmentStatus: 'Active',
                },
                select: { email: true },
            });
            targetEmails = employees.map(emp => emp.email);
        }

        if (targetEmails.length === 0) {
            return jsonError('No active recipients or valid emails found to notify.', 404);
        }

        const result = await addAlertJobsToQueue(targetEmails, subject, bodyText);
        return Response.json({
            success: true,
            count: targetEmails.length,
            recipients: targetEmails,
            result
        });
    }
    catch (e: any) {
        console.error('Failed to send alerts:', e);
        return jsonError(e.message || 'Alert dispatch failed', 500);
    }
}
