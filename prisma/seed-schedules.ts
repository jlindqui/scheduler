import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding schedules...');

  // Delete existing schedules
  await prisma.schedule.deleteMany({});
  console.log('🗑️  Deleted old schedules');

  // Create organization if it doesn't exist
  let org = await prisma.organization.findUnique({
    where: { slug: 'test-org' },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        id: 'org_1',
        name: 'Test Organization',
        slug: 'test-org',
      },
    });
    console.log('✅ Created organization:', org.name);
  }

  // Create a user for createdBy field
  let user = await prisma.user.findFirst({
    where: { email: 'admin@test.com' },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        name: 'Admin User',
      },
    });
    console.log('✅ Created user:', user.email);
  }

  // Create 20 employee profiles for testing (matching example schedule)
  const employees = [
    { id: 'employee_1', staffNumber: 1, name: 'Alex Thompson', fte: 1.0 },
    { id: 'employee_2', staffNumber: 2, name: 'Jordan Martinez', fte: 1.0 },
    { id: 'employee_3', staffNumber: 3, name: 'Sam Chen', fte: 1.0 },
    { id: 'employee_4', staffNumber: 4, name: 'Taylor Johnson', fte: 1.0 },
    { id: 'employee_5', staffNumber: 5, name: 'Casey Rodriguez', fte: 1.0 },
    { id: 'employee_6', staffNumber: 6, name: 'Morgan Davis', fte: 1.0 },
    { id: 'employee_7', staffNumber: 7, name: 'Riley Wilson', fte: 1.0 },
    { id: 'employee_8', staffNumber: 8, name: 'Jamie Anderson', fte: 1.0 },
    { id: 'employee_9', staffNumber: 9, name: 'Avery Brown', fte: 1.0 },
    { id: 'employee_10', staffNumber: 10, name: 'Quinn Miller', fte: 1.0 },
    { id: 'employee_11', staffNumber: 11, name: 'Parker Garcia', fte: 1.0 },
    { id: 'employee_12', staffNumber: 12, name: 'Reese Lee', fte: 1.0 },
    { id: 'employee_13', staffNumber: 13, name: 'Cameron White', fte: 0.6 },
    { id: 'employee_14', staffNumber: 14, name: 'Skyler Harris', fte: 0.6 },
    { id: 'employee_15', staffNumber: 15, name: 'Dakota Clark', fte: 0.6 },
    { id: 'employee_16', staffNumber: 16, name: 'Charlie Lewis', fte: 0.6 },
    { id: 'employee_17', staffNumber: 17, name: 'Finley Walker', fte: 0.6 },
    { id: 'employee_18', staffNumber: 18, name: 'Sage Hall', fte: 0.6 },
    { id: 'employee_19', staffNumber: 19, name: 'River Young', fte: 0.6 },
    { id: 'employee_20', staffNumber: 20, name: 'Phoenix King', fte: 0.6 },
  ];

  // Delete existing employee profiles to start fresh
  await prisma.employeeProfile.deleteMany({
    where: {
      organizationId: org.id,
    },
  });
  console.log('🗑️  Deleted old employee profiles');

  for (const emp of employees) {
    // Create a user for this employee
    const emailPrefix = emp.name.toLowerCase().replace(/\s+/g, '.');
    let empUser = await prisma.user.findFirst({
      where: { email: `${emailPrefix}@test.com` },
    });

    if (!empUser) {
      empUser = await prisma.user.create({
        data: {
          email: `${emailPrefix}@test.com`,
          name: emp.name,
        },
      });
    }

    await prisma.employeeProfile.create({
      data: {
        id: emp.id,
        userId: empUser.id,
        organizationId: org.id,
        hireDate: new Date('2020-01-01'),
        jobTitle: 'Staff Member',
      },
    });
    console.log(`✅ Created employee profile: ${emp.name}`);
  }

  // Create 6 schedules, each 6 weeks long, starting Dec 1, 2025
  const startDate = new Date('2025-12-01');
  const schedules = [];

  for (let i = 0; i < 6; i++) {
    const scheduleStart = new Date(startDate);
    scheduleStart.setDate(scheduleStart.getDate() + (i * 42)); // 42 days = 6 weeks

    const scheduleEnd = new Date(scheduleStart);
    scheduleEnd.setDate(scheduleEnd.getDate() + 41); // 42 days total (day 0 to day 41)

    // Preferences due 2 weeks before schedule starts
    const preferencesDue = new Date(scheduleStart);
    preferencesDue.setDate(preferencesDue.getDate() - 14);

    const schedule = await prisma.schedule.create({
      data: {
        name: `Schedule Period ${i + 1}`,
        organizationId: org.id,
        startDate: scheduleStart,
        endDate: scheduleEnd,
        status: 'PREFERENCE_COLLECTION',
        preferencesDueDate: preferencesDue,
        createdBy: user.id,
        notes: `6-week scheduling period from ${scheduleStart.toLocaleDateString()} to ${scheduleEnd.toLocaleDateString()}`,
      },
    });

    schedules.push(schedule);
    console.log(`✅ Created schedule ${i + 1}: ${schedule.name} (${scheduleStart.toLocaleDateString()} - ${scheduleEnd.toLocaleDateString()})`);
  }

  console.log('\n🎉 Successfully seeded 6 schedules!');
  console.log(`📅 Schedule range: ${schedules[0].startDate.toLocaleDateString()} to ${schedules[5].endDate.toLocaleDateString()}`);
  console.log(`🏢 Organization ID: ${org.id}`);
  console.log(`👥 Created ${employees.length} employee profiles`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
