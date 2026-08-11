import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { bearerFrom, jsonError, requireEmployee, requireVerification } from '@/lib/api-auth';
import { profileFromEmployee } from '@/lib/employee-professional-profile';

export const dynamic = 'force-dynamic';

function requireMember(req: NextRequest): { viewerId: string } {
	const token = bearerFrom(req);
	if (!token) throw new Error('Unauthorized');
	try {
		const emp = requireEmployee(req);
		return { viewerId: emp.sub };
	} catch {
		
	}
	const v = requireVerification(req);
	if (v.role !== 'SUPER') throw new Error('Unauthorized');
	return { viewerId: v.sub };
}





export async function POST(req: NextRequest) {
	try {
		const viewer = requireMember(req);
		const body = await req.json().catch(() => ({}));
		const employeeId = String(body?.employeeId || '').trim();
		const otp = String(body?.otp || '').trim();
		if (!employeeId || !otp) return jsonError('Employee ID and OTP required', 400);
		if (otp.length !== 6) return jsonError('OTP must be 6 digits', 400);

		let target = await db.employee.findUnique({ where: { id: employeeId } });
		if (!target) {
			target = await db.employee.findUnique({ where: { id: employeeId.toUpperCase() } });
		}
		if (!target) {
			const rows = await db.employee.findMany({
				where: { id: { equals: employeeId, mode: 'insensitive' } },
				take: 1,
			});
			target = rows[0] || null;
		}
		if (!target) return jsonError('No employee found with that ID', 404);
		if (target.id === viewer.viewerId) {
			return jsonError('You already have your own profile', 400);
		}
		if (!target.peerViewOtp || target.peerViewOtp !== otp) {
			return jsonError('Invalid OTP', 401);
		}
		if (target.peerViewOtpExpiresAt && new Date() > new Date(target.peerViewOtpExpiresAt)) {
			return jsonError('OTP expired — request a new one', 401);
		}

		await db.employee.update({
			where: { id: target.id },
			data: { peerViewOtp: null, peerViewOtpExpiresAt: null },
		});

		const name = [target.firstName, target.middleName, target.lastName].filter(Boolean).join(' ').trim();
		const profile = profileFromEmployee(target as any);
		
		profile.remarks = '';

		return Response.json({
			ok: true,
			readOnly: true,
			employee: {
				id: target.id,
				name,
				email: target.email,
				phone: target.phone,
				wingName: target.wingName,
				wingLeadName: target.wingLeadName,
				role: target.role,
				gender: target.gender,
				photoUrl: target.photoUrl,
				employmentStatus: target.employmentStatus || 'Active',
				professionalTitle: target.professionalTitle,
				createdAt: target.createdAt?.toISOString?.() || target.createdAt,
			},
			profile,
		});
	} catch (e: any) {
		const msg = e.message || 'Failed';
		return jsonError(msg, msg === 'Unauthorized' ? 401 : 500);
	}
}
