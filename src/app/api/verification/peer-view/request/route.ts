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

function requireMember(req: NextRequest): { viewerId: string; viewerEmail: string } {
	const token = bearerFrom(req);
	if (!token) throw new Error('Unauthorized');
	try {
		const emp = requireEmployee(req);
		return { viewerId: emp.sub, viewerEmail: emp.email };
	} catch {
		
	}
	const v = requireVerification(req);
	if (v.role !== 'SUPER') throw new Error('Unauthorized');
	return { viewerId: v.sub, viewerEmail: v.email };
}

async function findEmployeeById(rawId: string) {
	const id = String(rawId || '').trim();
	if (!id) return null;
	const exact = await db.employee.findUnique({ where: { id } });
	if (exact) return exact;
	const upper = id.toUpperCase();
	if (upper !== id) {
		const byUpper = await db.employee.findUnique({ where: { id: upper } });
		if (byUpper) return byUpper;
	}
	const lower = id.toLowerCase();
	if (lower !== id && lower !== upper) {
		const byLower = await db.employee.findUnique({ where: { id: lower } });
		if (byLower) return byLower;
	}
	
	const rows = await db.employee.findMany({
		where: { id: { equals: id, mode: 'insensitive' } },
		take: 1,
	});
	return rows[0] || null;
}







export async function POST(req: NextRequest) {
	try {
		const viewer = requireMember(req);
		const body = await req.json().catch(() => ({}));
		const employeeId = String(body?.employeeId || '').trim();
		if (!employeeId) return jsonError('Employee ID required', 400);

		const target = await findEmployeeById(employeeId);
		if (!target) return jsonError('No employee found with that ID', 404);
		if (target.id === viewer.viewerId) {
			return jsonError('You already have your own profile — no OTP needed', 400);
		}
		if (!target.email || !String(target.email).includes('@')) {
			return jsonError('That employee has no email on file — cannot send OTP', 400);
		}

		const otp = Math.floor(100000 + Math.random() * 900000).toString();
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

		await db.employee.update({
			where: { id: target.id },
			data: { peerViewOtp: otp, peerViewOtpExpiresAt: expiresAt },
		});

		const name = [target.firstName, target.lastName].filter(Boolean).join(' ') || target.email;
		const transporter = mailer();

		try {
			await transporter.sendMail({
				from: '"Employee Verification Portal" <forgedigitaltechnologies@gmail.com>',
				to: target.email,
				subject: `Your profile-view OTP: ${otp}`,
				text: `Hello ${target.firstName},\n\n${viewer.viewerEmail} requested to view your employee profile (read-only) in the Employee Verification Portal.\n\nYour OTP is: ${otp}\n\nShare this code with them if you approve. Valid for 10 minutes.\n\nIf you did not expect this, ignore this email.\n`,
				html: `<div style="font-family:sans-serif;max-width:520px;padding:20px;border:1px solid #e2e8f0;background:#ffffff">
        <h2 style="color:#0047ff;margin:0 0 12px">Profile view OTP</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p><strong>${viewer.viewerEmail}</strong> asked to view your profile (read-only).</p>
        <p>If you approve, share this OTP with them:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:10px;text-align:center;padding:18px;background:#eff4ff;border:1px solid #d7e3ff;margin:16px 0;color:#0047ff">${otp}</div>
        <p style="color:#64748b;font-size:13px">Valid for 10 minutes. Check Spam/Promotions if you don’t see this mail.</p>
      </div>`,
			});
		} catch (mailErr: any) {
			console.error('peer-view OTP mail to target failed', mailErr);
			return jsonError(
				`Could not send OTP email to the employee (${maskEmail(target.email)}): ${mailErr?.message || 'SMTP error'}. Try again later.`,
				502,
			);
		}

		
		try {
			await transporter.sendMail({
				from: '"Employee Verification Portal" <forgedigitaltechnologies@gmail.com>',
				to: viewer.viewerEmail,
				subject: `OTP sent to ${name} — ask them for the code`,
				text: `You requested to view ${name} (${target.id}).\n\nThe OTP was emailed to THEIR registered address (${maskEmail(target.email)}), not to you.\n\nAsk them to check their inbox (and Spam) and share the 6-digit code with you. It expires in 10 minutes.\n`,
				html: `<div style="font-family:sans-serif;max-width:520px;padding:20px;border:1px solid #e2e8f0;background:#ffffff">
          <h2 style="color:#0f172a;margin:0 0 12px">OTP sent to your colleague</h2>
          <p>You asked to view <strong>${name}</strong> (ID ${target.id}).</p>
          <p>The OTP was sent to <strong>their</strong> email (${maskEmail(target.email)}) — <strong>not</strong> to your inbox.</p>
          <p>Ask them to open that email and share the 6-digit code with you. Valid 10 minutes. They should also check Spam/Promotions.</p>
        </div>`,
			});
		} catch (notifyErr: any) {
			console.error('peer-view notify requester failed', notifyErr);
			
		}

		return Response.json({
			ok: true,
			employeeId: target.id,
			maskedEmail: maskEmail(target.email),
			message: `OTP emailed to ${name}'s registered address (${maskEmail(target.email)}) — not to your inbox. Ask them to share the code. We also emailed you a reminder. Check Spam if needed.`,
		});
	} catch (e: any) {
		const msg = e.message || 'Failed';
		console.error('peer-view request', e);
		return jsonError(msg, msg === 'Unauthorized' ? 401 : 500);
	}
}

function maskEmail(email: string) {
	const [u, d] = String(email).split('@');
	if (!d) return '***';
	const user = u.length <= 2 ? '*'.repeat(u.length) : `${u[0]}***${u[u.length - 1]}`;
	return `${user}@${d}`;
}
