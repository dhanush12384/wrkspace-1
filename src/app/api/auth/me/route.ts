import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { jsonError, requireEmployee } from '@/lib/api-auth';
import { employeeDisplayName } from '@/lib/attendance-geo';

export async function GET(req: NextRequest) {
  try {
    const user = requireEmployee(req);
    const emp = await db.employee.findUnique({ where: { id: user.sub } });
    if (!emp) return jsonError('Employee not found', 404);
    return Response.json({
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
      },
    });
  } catch (e: any) {
    return jsonError(e.message || 'Unauthorized', 401);
  }
}
