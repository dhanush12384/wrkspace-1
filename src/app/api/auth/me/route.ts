import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireEmployee } from '@/lib/api-auth';
import { employeeDisplayName } from '@/lib/attendance-geo';
import { paymentFieldsForPublic } from '@/lib/payment-details';
function withGender(emp: {
    id: string;
    email: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    wingName: string;
    wingLeadName: string;
    role: string;
    phone: string;
    gender?: string | null;
    photoUrl?: string | null;
    idCardUrl?: string | null;
    homeLat?: number | null;
    homeLng?: number | null;
    homePlusCode?: string | null;
    homeAddress?: string | null;
    homeRadiusM?: number | null;
    homeEditAllowed?: boolean | null;
    stipendAmount?: number | null;
    upiId?: string | null;
    bankAccountNumber?: string | null;
    bankName?: string | null;
    bankIfsc?: string | null;
    paymentDetailsFilledAt?: Date | null;
    shiftCheckIn?: string | null;
    shiftCheckOut?: string | null;
}) {
    const gender = String(emp.gender || 'UNSPECIFIED').toUpperCase();
    return {
        id: emp.id,
        employeeCode: emp.id,
        email: emp.email,
        name: employeeDisplayName(emp),
        firstName: emp.firstName,
        middleName: emp.middleName,
        lastName: emp.lastName,
        wingName: emp.wingName,
        wingLeadName: emp.wingLeadName,
        role: emp.role,
        phone: emp.phone,
        photoUrl: emp.photoUrl ?? null,
        idCardUrl: emp.idCardUrl ?? null,
        gender,
        needsGenderSetup: gender !== 'MALE' && gender !== 'FEMALE',
        isFemale: gender === 'FEMALE',
        homeLat: emp.homeLat ?? null,
        homeLng: emp.homeLng ?? null,
        homePlusCode: emp.homePlusCode ?? null,
        homeAddress: emp.homeAddress ?? null,
        homeRadiusM: emp.homeRadiusM ?? 100,
        homeEditAllowed: emp.homeEditAllowed !== false,
        shiftCheckIn: emp.shiftCheckIn ?? null,
        shiftCheckOut: emp.shiftCheckOut ?? null,
        ...paymentFieldsForPublic(emp),
    };
}
export async function GET(req: NextRequest) {
    try {
        const user = requireEmployee(req);
        const emp = await db.employee.findUnique({ where: { id: user.sub } });
        if (!emp)
            return jsonError('Employee not found', 404);
        return Response.json({ employee: withGender(emp) });
    }
    catch (e: any) {
        return jsonError(e.message || 'Unauthorized', 401);
    }
}
export async function PATCH(req: NextRequest) {
    try {
        const user = requireEmployee(req);
        const body = await req.json().catch(() => ({}));
        const gender = String(body?.gender || '')
            .trim()
            .toUpperCase();
        if (gender !== 'MALE' && gender !== 'FEMALE') {
            return jsonError('gender must be MALE or FEMALE', 400);
        }
        const emp = await db.employee.update({
            where: { id: user.sub },
            data: { gender },
        });
        return Response.json({ employee: withGender(emp) });
    }
    catch (e: any) {
        const msg = e.message || 'Unauthorized';
        return jsonError(msg, msg === 'Unauthorized' ? 401 : 500);
    }
}
