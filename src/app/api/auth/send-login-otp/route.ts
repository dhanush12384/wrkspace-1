import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError } from '@/lib/api-auth';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const employeeId = String(body.employeeId || '').trim();
    if (!employeeId) return jsonError('Employee ID required', 400);

    const emp = await db.employee.findUnique({
      where: { id: employeeId },
    });
    if (!emp) return jsonError('Employee not found', 404);

    if (!emp.email || !emp.email.includes('@')) {
      return jsonError('Employee has no registered email address', 400);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.employee.update({
      where: { id: emp.id },
      data: {
        activeOtp: otp,
        otpExpiresAt: expiresAt,
      },
    });

    const resend = new Resend(process.env.RESEND_API_KEY);

    const maskedEmail = emp.email.replace(/^(..)(.*)(@.*)$/, (_, p1, p2, p3) => {
      return p1 + '*'.repeat(p2.length) + p3;
    });

    await resend.emails.send({
      from: 'WrkSpace Support <support@app.redlix.co.in>',
      to: emp.email,
      subject: 'WrkSpace – Employee Verification OTP',
      text: `Hello ${emp.firstName},\n\nYour One-Time Password (OTP) to login is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nBest,\nWrkSpace Team`,
      html: `<div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e4e4e7;">
        <h2 style="color: #E61E32;">WrkSpace – Employee OTP Verification</h2>
        <p>Hello <strong>${emp.firstName}</strong>,</p>
        <p>You requested a login code for your Employee account.</p>
        <p>Your <strong>One-Time Password (OTP)</strong> is:</p>
        <div style="font-size: 28px; font-weight: bold; background-color: #f4f4f5; padding: 15px; text-align: center; letter-spacing: 8px; color: #E61E32; border: 1px solid #e4e4e7; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #71717a; font-size: 14px;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
      </div>`,
    });

    return Response.json({ success: true, email: maskedEmail });
  } catch (err: any) {
    return jsonError(err.message || 'Failed to send OTP', 500);
  }
}
