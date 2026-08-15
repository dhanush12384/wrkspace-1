import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, signEmployeeToken, signVerificationToken } from '@/lib/api-auth';
import { linkAdminToEmployee } from '@/lib/verification-admin-employee-link';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const email = String(body?.email || '')
            .trim()
            .toLowerCase();
        if (!email)
            return jsonError('Google email missing', 400);
        const portal = await db.verificationPortalUser.findUnique({
            where: { email },
            include: { company: { select: { name: true, active: true } } },
        });
        if (portal) {
            if (!portal.active)
                return jsonError('Account disabled', 403);
            if (portal.role !== 'SUPER') {
                return jsonError('This portal is for employees and admins only', 403);
            }
            if (portal.company && portal.company.active === false) {
                return jsonError('Company access disabled', 403);
            }
            const token = signVerificationToken({
                id: portal.id,
                email: portal.email,
                role: 'SUPER',
                companyId: portal.companyId,
                companyName: portal.company?.name || null,
                source: 'portal',
            });
            await db.verificationPortalUser.update({
                where: { id: portal.id },
                data: { lastLoginAt: new Date() },
            });
            let linkedEmployee = null as Awaited<ReturnType<typeof linkAdminToEmployee>>['employee'];
            let employeeToken = null as string | null;
            const adminRow = await db.admin.findUnique({ where: { email } });
            if (adminRow) {
                const linked = await linkAdminToEmployee(adminRow);
                linkedEmployee = linked.employee;
                employeeToken = linked.employeeToken;
            }
            return Response.json({
                ok: true,
                token,
                employeeToken,
                linkedEmployee,
                user: {
                    id: portal.id,
                    email: portal.email,
                    role: 'SUPER',
                    companyId: portal.companyId,
                    companyName: portal.company?.name || null,
                    source: 'portal',
                    employeeId: linkedEmployee?.id || null,
                },
            });
        }
        const admin = await db.admin.findUnique({ where: { email } });
        if (admin && !admin.isTeamLead) {
            const linked = await linkAdminToEmployee(admin);
            const token = signVerificationToken({
                id: admin.id,
                email: admin.email,
                role: 'SUPER',
                companyId: null,
                companyName: admin.organizationName || 'wrkspace',
                source: 'workspace_admin',
            });
            return Response.json({
                ok: true,
                token,
                employeeToken: linked.employeeToken,
                linkedEmployee: linked.employee,
                user: {
                    id: admin.id,
                    email: admin.email,
                    role: 'SUPER',
                    companyId: null,
                    companyName: admin.organizationName || 'wrkspace',
                    source: 'workspace_admin',
                    employeeId: linked.employee?.id || null,
                },
            });
        }
        const employee = await db.employee.findUnique({ where: { email } });
        if (employee) {
            const token = signEmployeeToken({
                id: employee.id,
                email: employee.email,
                role: employee.role || 'Employee',
            });
            return Response.json({
                ok: true,
                kind: 'employee',
                token,
                employee,
                user: {
                    id: employee.id,
                    email: employee.email,
                    role: 'EMPLOYEE',
                    companyId: null,
                    companyName: null,
                    source: 'employee',
                    employeeId: employee.id,
                },
            });
        }
        return jsonError('No access — this portal is for employees and admins only', 403);
    }
    catch (e: any) {
        return jsonError(e.message || 'Google login failed', 500);
    }
}
