import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError } from '@/lib/api-auth';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
	try {
		const { employeeId } = await req.json().catch(() => ({}));

		if (!employeeId) {
			return jsonError('Employee ID is required', 400);
		}

		const employee = await db.employee.findUnique({
			where: { id: employeeId }
		});

		if (!employee) {
			return jsonError('Employee not found', 404);
		}

		const otp = Math.floor(100000 + Math.random() * 900000).toString();
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

		await db.employee.update({
			where: { id: employee.id },
			data: {
				activeOtp: otp,
				otpExpiresAt: expiresAt
			}
		});

		const transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 465,
			secure: true,
			auth: {
				user: 'forgedigitaltechnologies@gmail.com',
				pass: 'grty hjnq zdvh mjwx',
			},
		});

		await transporter.sendMail({
			from: '"WrkSpace Support" <forgedigitaltechnologies@gmail.com>',
			to: employee.email,
			subject: 'WrkSpace – Employee Remarks Verification OTP',
			text: `Hello ${employee.firstName},\n\nYour OTP for viewing your employee remarks and dossier on WrkSpace is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nBest,\nWrkSpace Team`,
			html: `<div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e4e4e7;">
				<h2 style="color: #4f46e5;">WrkSpace – Verification OTP</h2>
				<p>Hello <strong>${employee.firstName}</strong>,</p>
				<p>Someone is attempting to verify your employee remarks and professional dossier on WrkSpace.</p>
				<p>Your <strong>One-Time Password (OTP)</strong> is:</p>
				<div style="font-size: 28px; font-weight: bold; background-color: #f4f4f5; padding: 15px; text-align: center; letter-spacing: 8px; color: #4f46e5; border: 1px solid #e4e4e7; margin: 20px 0;">
					${otp}
				</div>
				<p style="font-size: 12px; color: #71717a;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
			</div>`
		});

		return Response.json({ success: true, message: 'OTP sent successfully to registered email.' });
	} catch (e: any) {
		console.error('Error sending verification OTP:', e);
		return jsonError(e.message || 'Failed to send OTP', 500);
	}
}
