import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, signEmployeeToken } from '@/lib/api-auth';
import { employeeDisplayName } from '@/lib/attendance-geo';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const employeeId = String(body.employeeId || '').trim();
        const otp = String(body.otp || '').trim();
        if (!employeeId || !otp) {
            return jsonError('Employee ID and OTP are required', 400);
        }
        const emp = await db.employee.findUnique({
            where: { id: employeeId },
        });
        if (!emp)
            return jsonError('Employee not found', 404);
        if (!emp.activeOtp || emp.activeOtp !== otp) {
            return jsonError('Incorrect OTP code', 401);
        }
        if (emp.otpExpiresAt && new Date() > new Date(emp.otpExpiresAt)) {
            return jsonError('OTP code has expired', 401);
        }
        await db.employee.update({
            where: { id: emp.id },
            data: {
                activeOtp: null,
                otpExpiresAt: null,
            },
        });
        const token = signEmployeeToken({ id: emp.id, email: emp.email, role: emp.role });
        return Response.json({
            token,
            employee: {
                id: emp.id,
                email: emp.email,
                name: employeeDisplayName(emp),
                firstName: emp.firstName,
                lastName: emp.lastName,
                wingName: emp.wingName,
                wingLeadName: emp.wingLeadName,
                role: emp.role,
                phone: emp.phone,
                photoUrl: emp.photoUrl ?? null,
                gender: emp.gender ?? 'UNSPECIFIED',
            },
        });
    }
    catch (err: any) {
        return jsonError(err.message || 'OTP verification failed', 500);
    }
}
