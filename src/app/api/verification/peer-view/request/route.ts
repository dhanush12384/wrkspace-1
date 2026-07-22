import { NextRequest } from 'next/server';
import nodemailer from 'nodemailer';
import { db } from '@/lib/db';
import { bearerFrom, jsonError, requireEmployee, requireVerification } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

function mailer() {
	return nodemailer.createTransport({
		host: 'smtp.gmail.com',
		port: 465,
		secure: true,
		auth: {
			user: 'forgedigitaltechnologies@gmail.com',
			pass: 'grty hjnq zdvh mjwx',
		},
	});
}

/** Any signed-in portal member (employee JWT or SUPER verification JWT). */
function requireMember(req: NextRequest): { viewerId: string; viewerEmail: string } {
	const token = bearerFrom(req);
	if (!token) throw new Error('Unauthorized');
	try {
		const emp = requireEmployee(req);
		return { viewerId: emp.sub, viewerEmail: emp.email };
	} catch {
		/* fall through */
	}
	const v = requireVerification(req);
	if (v.role !== 'SUPER') throw new Error('Unauthorized');
	return { viewerId: v.sub, viewerEmail: v.email };
}

/**
 * Request an OTP to view another employee's profile (read-only).
 * OTP is emailed to the target employee — they share it with the requester.
 */
export async function POST(req: NextRequest) {
	try {
		const viewer = requireMember(req);
		const body = await req.json().catch(() => ({}));
		const employeeId = String(body?.employeeId || '')
			.trim()
			.toUpperCase();
		if (!employeeId) return jsonError('Employee ID required', 400);

		const target = await db.employee.findUnique({ where: { id: employeeId } });
		if (!target) return jsonError('No employee found with that ID', 404);
		if (target.id === viewer.viewerId) {
			return jsonError('You already have your own profile — no OTP needed', 400);
		}

		const otp = Math.floor(100000 + Math.random() * 900000).toString();
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

		await db.employee.update({
			where: { id: target.id },
			data: { peerViewOtp: otp, peerViewOtpExpiresAt: expiresAt },
		});

		const name = [target.firstName, target.lastName].filter(Boolean).join(' ') || target.email;
		await mailer().sendMail({
			from: '"Employee Verification Portal" <forgedigitaltechnologies@gmail.com>',
			to: target.email,
			subject: 'Verification portal – share OTP to let a colleague view your profile',
			text: `Hello ${target.firstName},\n\nSomeone (${viewer.viewerEmail}) requested to view your employee profile in the Verification Portal (read-only).\n\nIf you approve, share this OTP with them:\n\n${otp}\n\nValid for 10 minutes.\n\nIf you did not expect this, ignore this email — do not share the OTP.\n`,
			html: `<div style="font-family:sans-serif;max-width:520px;padding:20px;border:1px solid #e2e8f0">
        <h2 style="color:#0047ff;margin:0 0 12px">Profile view request</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p><strong>${viewer.viewerEmail}</strong> asked to view your employee profile (read-only) in the Employee Verification Portal.</p>
        <p>If you approve, share this OTP with them:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:8px;text-align:center;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;margin:16px 0;color:#0047ff">${otp}</div>
        <p style="color:#64748b;font-size:13px">Valid for 10 minutes. If you did not expect this, ignore the email and do not share the code.</p>
      </div>`,
		});

		return Response.json({
			ok: true,
			employeeId: target.id,
			maskedEmail: maskEmail(target.email),
			message: `OTP sent to the employee’s registered email (${maskEmail(target.email)}). Ask them to share it with you.`,
		});
	} catch (e: any) {
		const msg = e.message || 'Failed';
		return jsonError(msg, msg === 'Unauthorized' ? 401 : 500);
	}
}

function maskEmail(email: string) {
	const [u, d] = String(email).split('@');
	if (!d) return '***';
	const user = u.length <= 2 ? '*'.repeat(u.length) : `${u[0]}***${u[u.length - 1]}`;
	return `${user}@${d}`;
}
