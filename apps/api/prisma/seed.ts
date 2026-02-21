import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient, RoleName } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  for (const name of [RoleName.Admin, RoleName.Officer, RoleName.Clerk, RoleName.ReadOnly]) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash }
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: RoleName.Admin } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id }
  });

  await prisma.appConfig.upsert({
    where: { key: 'excludeDisputedFromVoting' },
    update: { value: process.env.EXCLUDE_DISPUTED_FROM_VOTING === 'true' ? 'true' : 'false', updatedById: admin.id },
    create: {
      key: 'excludeDisputedFromVoting',
      value: process.env.EXCLUDE_DISPUTED_FROM_VOTING === 'true' ? 'true' : 'false',
      updatedById: admin.id
    }
  });

  console.log(`Seed complete. Admin: ${email}`);
}

main().finally(async () => prisma.$disconnect());
