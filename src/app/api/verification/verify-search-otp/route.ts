import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
	try {
		const { employeeId, otp } = await req.json().catch(() => ({}));

		if (!employeeId || !otp) {
			return jsonError('Employee ID and OTP are required', 400);
		}

		const employee = await db.employee.findUnique({
			where: { id: employeeId }
		});

		if (!employee) {
			return jsonError('Employee not found', 404);
		}

		if (!employee.activeOtp || employee.activeOtp !== otp) {
			return jsonError('Invalid OTP code. Please check and try again.', 400);
		}

		if (employee.otpExpiresAt && new Date() > employee.otpExpiresAt) {
			return jsonError('OTP code has expired. Please request a new one.', 400);
		}

		// Clear OTP code to prevent reuse
		const unlockedEmployee = await db.employee.update({
			where: { id: employee.id },
			data: {
				activeOtp: null,
				otpExpiresAt: null
			},
			select: {
				id: true,
				firstName: true,
				middleName: true,
				lastName: true,
				email: true,
				phone: true,
				wingName: true,
				wingLeadName: true,
				role: true,
				gender: true,
				photoUrl: true,
				createdAt: true,
				employmentStatus: true,
				remarks: true,
				monthWorked: true,
				companyWorkedFor: true,
				overallScore: true,
				conduct: true,
				badges: true,
			}
		});

		const name = [unlockedEmployee.firstName, unlockedEmployee.middleName, unlockedEmployee.lastName].filter(Boolean).join(' ').trim();

		return Response.json({
			success: true,
			employee: {
				...unlockedEmployee,
				name,
				joinedAt: unlockedEmployee.createdAt.toISOString()
			}
		});
	} catch (e: any) {
		console.error('Error verifying OTP:', e);
		return jsonError(e.message || 'Failed to verify OTP', 500);
	}
}
