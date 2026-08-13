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
        <h2 style="font-size: 18px; font-weight: 500; color: #1e293b; margin-top: 0; margin-bottom: 12px;">Employee OTP Verification</h2>
        <p style="font-size: 14px; line-height: 1.5; margin: 0 0 12px;">Hello ${emp.firstName},</p>
        <p style="font-size: 14px; line-height: 1.5; margin: 0 0 16px;">You requested a login code for your Employee account.</p>
        <p style="font-size: 14px; line-height: 1.5; margin: 0 0 8px;">Your <strong>One-Time Password (OTP)</strong> is:</p>
        <div style="font-size: 24px; font-weight: 500; background-color: #f8fafc; padding: 14px; text-align: center; letter-spacing: 6px; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 8px; margin: 16px 0; font-family: monospace;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #64748b; line-height: 1.4; margin: 16px 0 0;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #94a3b8;">
          © 2026 Redlix Studio. All rights reserved.
        </div>
      </div>`,
    });

    return Response.json({ success: true, email: maskedEmail });
  } catch (err: any) {
    return jsonError(err.message || 'Failed to send OTP', 500);
  }
}
