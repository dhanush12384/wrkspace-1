const { PrismaClient } = require('../src/generated/prisma');
const p = new PrismaClient();
(async () => {
  const total = await p.employee.count();
  const withShift = await p.employee.count({ where: { shiftCheckIn: { not: null } } });
  const withStipend = await p.employee.count({ where: { stipendAmount: { not: null } } });
  console.log({ total, withShift, withStipend });
  await p.$disconnect();
})();
