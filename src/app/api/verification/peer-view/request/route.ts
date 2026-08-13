import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { bearerFrom, jsonError, requireEmployee, requireVerification } from '@/lib/api-auth';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

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

		try {
			await resend.emails.send({
				from: 'Employee Verification Portal <support@app.redlix.co.in>',
				to: target.email,
				subject: `Your profile-view OTP: ${otp}`,
				text: `Hello ${target.firstName},\n\n${viewer.viewerEmail} requested to view your employee profile (read-only) in the Employee Verification Portal.\n\nYour OTP is: ${otp}\n\nShare this code with them if you approve. Valid for 10 minutes.\n\nIf you did not expect this, ignore this email.\n`,
				html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; color: #334155; margin: 0 auto; background: #ffffff;">
					<div style="text-align: center; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
						<!--[if !mso]><!-->
						<style>
							@media (prefers-color-scheme: dark) {
								.wrkspace-light-logo { display: none !important; }
								.wrkspace-dark-logo { display: inline-block !important; }
							}
						</style>
						<!--<![endif]-->
						<img class="wrkspace-light-logo" src="https://ik.imagekit.io/dypkhqxip/wrkspacenew?updatedAt=1786471821009" alt="WrkSpace" style="height: 36px; width: auto; max-width: 100%; display: inline-block;" />
						<!--[if !mso]><!-->
						<img class="wrkspace-dark-logo" src="https://ik.imagekit.io/dypkhqxip/codered" alt="WrkSpace" style="height: 36px; width: auto; max-width: 100%; display: none;" />
						<!--<![endif]-->
					</div>
					<h2 style="font-size: 18px; font-weight: 500; color: #1e293b; margin-top: 0; margin-bottom: 12px;">Profile view OTP</h2>
					<p style="font-size: 14px; line-height: 1.5; margin: 0 0 12px;">Hello ${name},</p>
					<p style="font-size: 14px; line-height: 1.5; margin: 0 0 12px;"><strong>${viewer.viewerEmail}</strong> asked to view your profile (read-only).</p>
					<p style="font-size: 14px; line-height: 1.5; margin: 0 0 8px;">If you approve, share this OTP with them:</p>
					<div style="font-size: 24px; font-weight: 500; background-color: #f8fafc; padding: 14px; text-align: center; letter-spacing: 6px; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 8px; margin: 16px 0; font-family: monospace;">
						${otp}
					</div>
					<p style="font-size: 12px; color: #64748b; line-height: 1.4; margin: 16px 0 0;">Valid for 10 minutes. Check Spam/Promotions if you don’t see this mail.</p>
					<div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #94a3b8;">
						© 2026 Redlix Studio. All rights reserved.
					</div>
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
			await resend.emails.send({
				from: 'Employee Verification Portal <support@app.redlix.co.in>',
				to: viewer.viewerEmail,
				subject: `OTP sent to ${name} — ask them for the code`,
				text: `You requested to view ${name} (${target.id}).\n\nThe OTP was emailed to THEIR registered address (${maskEmail(target.email)}), not to you.\n\nAsk them to check their inbox (and Spam) and share the 6-digit code with you. It expires in 10 minutes.\n`,
				html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; padding: 24px; border: 1px solid #e4e4e7; border-radius: 12px; color: #334155; margin: 0 auto; background: #ffffff;">
					<div style="text-align: center; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
						<!--[if !mso]><!-->
						<style>
							@media (prefers-color-scheme: dark) {
								.wrkspace-light-logo { display: none !important; }
								.wrkspace-dark-logo { display: inline-block !important; }
							}
						</style>
						<!--<![endif]-->
						<img class="wrkspace-light-logo" src="https://ik.imagekit.io/dypkhqxip/wrkspacenew?updatedAt=1786471821009" alt="WrkSpace" style="height: 36px; width: auto; max-width: 100%; display: inline-block;" />
						<!--[if !mso]><!-->
						<img class="wrkspace-dark-logo" src="https://ik.imagekit.io/dypkhqxip/codered" alt="WrkSpace" style="height: 36px; width: auto; max-width: 100%; display: none;" />
						<!--<![endif]-->
					</div>
					<h2 style="font-size: 18px; font-weight: 500; color: #1e293b; margin-top: 0; margin-bottom: 12px;">OTP sent to your colleague</h2>
					<p style="font-size: 14px; line-height: 1.5; margin: 0 0 12px;">You asked to view <strong>${name}</strong> (ID ${target.id}).</p>
					<p style="font-size: 14px; line-height: 1.5; margin: 0 0 12px;">The OTP was sent to <strong>their</strong> email (${maskEmail(target.email)}) — <strong>not</strong> to your inbox.</p>
					<p style="font-size: 14px; line-height: 1.5; margin: 0 0 0;">Ask them to open that email and share the 6-digit code with you. Valid 10 minutes. They should also check Spam/Promotions.</p>
					<div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #94a3b8;">
						© 2026 Redlix Studio. All rights reserved.
					</div>
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
