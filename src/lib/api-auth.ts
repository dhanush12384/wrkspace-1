import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const secret = () => process.env.JWT_SECRET || 'wrkspace-neon-dev-secret-change-me';

export type EmployeeJwt = { sub: string; email: string; role: string; kind?: 'employee' };
export type AdminJwt = { sub: string; email: string; kind: 'admin'; allowedPages?: string };

export function signEmployeeToken(employee: { id: string; email: string; role: string }) {
  return jwt.sign(
    { sub: employee.id, email: employee.email, role: employee.role, kind: 'employee' } satisfies EmployeeJwt,
    secret(),
    { expiresIn: '30d' }
  );
}

export function signAdminToken(admin: { id: string; email: string; allowedPages?: string | null }) {
  return jwt.sign(
    {
      sub: admin.id,
      email: admin.email,
      kind: 'admin',
      allowedPages: admin.allowedPages || undefined,
    } satisfies AdminJwt,
    secret(),
    { expiresIn: '12h' }
  );
}

export function verifyToken<T = EmployeeJwt | AdminJwt>(token: string): T {
  return jwt.verify(token, secret()) as T;
}

export function bearerFrom(req: NextRequest) {
  const header = req.headers.get('authorization') || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export function requireEmployee(req: NextRequest): EmployeeJwt {
  const token = bearerFrom(req);
  if (!token) throw new Error('Unauthorized');
  const payload = verifyToken<EmployeeJwt>(token);
  if (!payload.sub) throw new Error('Unauthorized');
  return payload;
}

export function requireAdmin(req: NextRequest): AdminJwt {
  const token = bearerFrom(req);
  if (!token) throw new Error('Unauthorized');
  const payload = verifyToken<AdminJwt>(token);
  if (payload.kind !== 'admin') throw new Error('Admin access required');
  return payload;
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
