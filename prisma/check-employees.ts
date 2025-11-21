import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📋 Checking employee profiles...\n');

  const profiles = await prisma.employeeProfile.findMany({
    include: {
      user: true,
    },
    take: 5,
  });

  for (const profile of profiles) {
    console.log(`ID: ${profile.id}`);
    console.log(`User Name: ${profile.user.name}`);
    console.log(`User Email: ${profile.user.email}`);
    console.log('---');
  }

  console.log(`\nTotal profiles: ${await prisma.employeeProfile.count()}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
