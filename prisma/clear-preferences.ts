import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Clearing all preferences...');

  await prisma.schedulePreference.deleteMany({});
  console.log('✅ Deleted all schedule preferences');

  await prisma.generalPreference.deleteMany({});
  console.log('✅ Deleted all general preferences');

  console.log('🎉 All preferences cleared!');
}

main()
  .catch((e) => {
    console.error('❌ Error clearing preferences:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
