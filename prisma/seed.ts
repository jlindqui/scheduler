import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.chatMessage.deleteMany();
  await prisma.chatConversation.deleteMany();
  await prisma.shiftSwapRequest.deleteMany();
  await prisma.schedulePreference.deleteMany();
  await prisma.staffAvailability.deleteMany();
  await prisma.shiftAssignment.deleteMany();
  await prisma.shiftSkillRequirement.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.scheduleDraft.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.staffSkill.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.timeOffRequest.deleteMany();
  await prisma.timeOffBank.deleteMany();
  await prisma.violationDocumentation.deleteMany();
  await prisma.schedulingRule.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.department.deleteMany();
  await prisma.collectiveAgreement.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  // Create organization
  console.log('🏢 Creating organization...');
  const org = await prisma.organization.create({
    data: {
      name: 'City Hospital',
      slug: 'city-hospital',
      description: 'Large urban hospital with unionized healthcare workers',
    },
  });

  // Create Collective Agreement
  console.log('📜 Creating collective agreement...');
  const cba = await prisma.collectiveAgreement.create({
    data: {
      name: 'Healthcare Workers Union CBA 2024-2027',
      organizationId: org.id,
      effectiveDate: new Date('2024-01-01'),
      expiryDate: new Date('2027-12-31'),
      documentUrl: 'https://example.com/cba-2024.pdf',
      metadata: {
        unionName: 'Healthcare Workers Union Local 401',
        bargainingUnit: 'Registered Nurses',
      },
    },
  });

  // Create scheduling rules
  console.log('⚖️ Creating scheduling rules...');
  await prisma.schedulingRule.createMany({
    data: [
      {
        collectiveAgreementId: cba.id,
        ruleType: 'OVERTIME_TRIGGER',
        name: 'Daily Overtime',
        description: 'Overtime kicks in after 8 hours in a single shift',
        parameters: { hoursPerShift: 8, payMultiplier: 1.5 },
        priority: 10,
      },
      {
        collectiveAgreementId: cba.id,
        ruleType: 'SEQUENTIAL_WEEKENDS',
        name: 'Weekend Spacing',
        description: 'Staff cannot work consecutive weekends',
        parameters: { minWeeksBetween: 1 },
        priority: 8,
      },
      {
        collectiveAgreementId: cba.id,
        ruleType: 'MAX_CONSECUTIVE_SHIFTS',
        name: 'Maximum Consecutive Shifts',
        description: 'No more than 5 consecutive shifts',
        parameters: { maxConsecutive: 5 },
        priority: 9,
      },
      {
        collectiveAgreementId: cba.id,
        ruleType: 'MIN_REST_BETWEEN',
        name: 'Minimum Rest Period',
        description: 'At least 11 hours between shifts',
        parameters: { minHours: 11 },
        priority: 10,
      },
      {
        collectiveAgreementId: cba.id,
        ruleType: 'AVAILABILITY_MINIMUM',
        name: 'Minimum Weekly Availability',
        description: 'Staff must provide at least 20 hours of availability per week',
        parameters: { minHoursPerWeek: 20, minWeekends: 2 },
        priority: 5,
      },
      {
        collectiveAgreementId: cba.id,
        ruleType: 'SWAP_LIMIT',
        name: 'Shift Swap Limit',
        description: 'Maximum 3 shift swaps per schedule period',
        parameters: { maxSwapsPerPeriod: 3 },
        priority: 6,
      },
    ],
  });

  // Create departments
  console.log('🏥 Creating departments...');
  const emergencyDept = await prisma.department.create({
    data: {
      name: 'Emergency Department',
      description: '24/7 emergency care',
      organizationId: org.id,
    },
  });

  const icuDept = await prisma.department.create({
    data: {
      name: 'Intensive Care Unit',
      description: 'Critical care unit',
      organizationId: org.id,
    },
  });

  // Create skills
  console.log('🎓 Creating skills...');
  const rnSkill = await prisma.skill.create({
    data: {
      name: 'Registered Nurse',
      description: 'RN certification',
      organizationId: org.id,
      requiresCertification: true,
    },
  });

  const aclsSkill = await prisma.skill.create({
    data: {
      name: 'ACLS Certified',
      description: 'Advanced Cardiac Life Support',
      organizationId: org.id,
      requiresCertification: true,
    },
  });

  const traumaSkill = await prisma.skill.create({
    data: {
      name: 'Trauma Certified',
      description: 'Trauma nursing certification',
      organizationId: org.id,
      requiresCertification: true,
    },
  });

  // Create users and staff profiles
  console.log('👥 Creating users and staff...');

  // Manager
  const managerUser = await prisma.user.create({
    data: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@cityhospital.org',
      employeeNumber: 'EMP001',
      timezone: 'America/New_York',
      emailVerified: true,
      currentOrganizationId: org.id,
    },
  });

  const managerProfile = await prisma.staffProfile.create({
    data: {
      userId: managerUser.id,
      organizationId: org.id,
      collectiveAgreementId: cba.id,
      departmentId: emergencyDept.id,
      seniorityDate: new Date('2010-03-15'),
      hireDate: new Date('2010-03-15'),
      jobTitle: 'Nurse Manager',
    },
  });

  await prisma.organizationMember.create({
    data: {
      userId: managerUser.id,
      organizationId: org.id,
      role: 'MANAGER',
    },
  });

  // Staff 1 - Senior nurse
  const staff1User = await prisma.user.create({
    data: {
      name: 'Michael Chen',
      email: 'michael.chen@cityhospital.org',
      employeeNumber: 'EMP002',
      timezone: 'America/New_York',
      emailVerified: true,
      currentOrganizationId: org.id,
    },
  });

  const staff1Profile = await prisma.staffProfile.create({
    data: {
      userId: staff1User.id,
      organizationId: org.id,
      collectiveAgreementId: cba.id,
      departmentId: emergencyDept.id,
      managerId: managerProfile.id,
      seniorityDate: new Date('2015-06-01'),
      hireDate: new Date('2015-06-01'),
      jobTitle: 'Registered Nurse',
      workSchedulePattern: '4 on 4 off',
    },
  });

  await prisma.organizationMember.create({
    data: {
      userId: staff1User.id,
      organizationId: org.id,
      role: 'STAFF',
    },
  });

  // Staff 2 - Mid-level nurse
  const staff2User = await prisma.user.create({
    data: {
      name: 'Emily Rodriguez',
      email: 'emily.rodriguez@cityhospital.org',
      employeeNumber: 'EMP003',
      timezone: 'America/New_York',
      emailVerified: true,
      currentOrganizationId: org.id,
    },
  });

  const staff2Profile = await prisma.staffProfile.create({
    data: {
      userId: staff2User.id,
      organizationId: org.id,
      collectiveAgreementId: cba.id,
      departmentId: emergencyDept.id,
      managerId: managerProfile.id,
      seniorityDate: new Date('2018-09-15'),
      hireDate: new Date('2018-09-15'),
      jobTitle: 'Registered Nurse',
      workSchedulePattern: 'rotating',
    },
  });

  await prisma.organizationMember.create({
    data: {
      userId: staff2User.id,
      organizationId: org.id,
      role: 'STAFF',
    },
  });

  // Staff 3 - Junior nurse
  const staff3User = await prisma.user.create({
    data: {
      name: 'James Wilson',
      email: 'james.wilson@cityhospital.org',
      employeeNumber: 'EMP004',
      timezone: 'America/New_York',
      emailVerified: true,
      currentOrganizationId: org.id,
    },
  });

  const staff3Profile = await prisma.staffProfile.create({
    data: {
      userId: staff3User.id,
      organizationId: org.id,
      collectiveAgreementId: cba.id,
      departmentId: emergencyDept.id,
      managerId: managerProfile.id,
      seniorityDate: new Date('2022-01-10'),
      hireDate: new Date('2022-01-10'),
      jobTitle: 'Registered Nurse',
    },
  });

  await prisma.organizationMember.create({
    data: {
      userId: staff3User.id,
      organizationId: org.id,
      role: 'STAFF',
    },
  });

  // Assign skills to staff
  console.log('🎯 Assigning skills...');
  await prisma.staffSkill.createMany({
    data: [
      {
        staffProfileId: staff1Profile.id,
        skillId: rnSkill.id,
        proficiencyLevel: 5,
        certifiedDate: new Date('2015-06-01'),
      },
      {
        staffProfileId: staff1Profile.id,
        skillId: aclsSkill.id,
        proficiencyLevel: 5,
        certifiedDate: new Date('2016-03-15'),
      },
      {
        staffProfileId: staff1Profile.id,
        skillId: traumaSkill.id,
        proficiencyLevel: 4,
        certifiedDate: new Date('2017-08-20'),
      },
      {
        staffProfileId: staff2Profile.id,
        skillId: rnSkill.id,
        proficiencyLevel: 4,
        certifiedDate: new Date('2018-09-15'),
      },
      {
        staffProfileId: staff2Profile.id,
        skillId: aclsSkill.id,
        proficiencyLevel: 3,
        certifiedDate: new Date('2019-05-10'),
      },
      {
        staffProfileId: staff3Profile.id,
        skillId: rnSkill.id,
        proficiencyLevel: 3,
        certifiedDate: new Date('2022-01-10'),
      },
    ],
  });

  // Create time off banks
  console.log('💰 Creating time off banks...');
  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

  await prisma.timeOffBank.createMany({
    data: [
      // Staff 1 - Senior, good balance
      {
        staffProfileId: staff1Profile.id,
        bankType: 'VACATION',
        balanceHours: 120,
        yearGranted: 2024,
      },
      {
        staffProfileId: staff1Profile.id,
        bankType: 'STAT_DAY',
        balanceHours: 24,
        expiryDate: in30Days, // Expiring soon!
        yearGranted: 2024,
      },
      {
        staffProfileId: staff1Profile.id,
        bankType: 'PERSONAL_DAY',
        balanceHours: 16,
        yearGranted: 2024,
      },
      // Staff 2
      {
        staffProfileId: staff2Profile.id,
        bankType: 'VACATION',
        balanceHours: 80,
        yearGranted: 2024,
      },
      {
        staffProfileId: staff2Profile.id,
        bankType: 'STAT_DAY',
        balanceHours: 16,
        expiryDate: in90Days,
        yearGranted: 2024,
      },
      // Staff 3 - Junior, lower balance
      {
        staffProfileId: staff3Profile.id,
        bankType: 'VACATION',
        balanceHours: 40,
        yearGranted: 2024,
      },
      {
        staffProfileId: staff3Profile.id,
        bankType: 'STAT_DAY',
        balanceHours: 8,
        expiryDate: in90Days,
        yearGranted: 2024,
      },
    ],
  });

  // Create schedule
  console.log('📅 Creating schedule...');
  const scheduleStart = new Date();
  scheduleStart.setDate(scheduleStart.getDate() - (scheduleStart.getDate() - 1)); // First of current month
  const scheduleEnd = new Date(scheduleStart);
  scheduleEnd.setMonth(scheduleEnd.getMonth() + 1);
  scheduleEnd.setDate(0); // Last day of month

  const schedule = await prisma.schedule.create({
    data: {
      name: `${scheduleStart.toLocaleString('default', { month: 'long' })} ${scheduleStart.getFullYear()} Schedule`,
      organizationId: org.id,
      startDate: scheduleStart,
      endDate: scheduleEnd,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      createdBy: managerUser.id,
      notes: 'Regular monthly schedule',
    },
  });

  // Create shifts for next 2 weeks
  console.log('⏰ Creating shifts...');
  const shifts = [];
  const startDate = new Date();
  for (let i = 0; i < 14; i++) {
    const shiftDate = new Date(startDate);
    shiftDate.setDate(startDate.getDate() + i);

    // Day shift
    shifts.push({
      scheduleId: schedule.id,
      organizationId: org.id,
      shiftDate: shiftDate,
      startTime: '07:00',
      endTime: '15:00',
      shiftType: 'Day',
      location: 'Emergency Department',
      minStaffing: 2,
      targetStaffing: 3,
    });

    // Evening shift
    shifts.push({
      scheduleId: schedule.id,
      organizationId: org.id,
      shiftDate: shiftDate,
      startTime: '15:00',
      endTime: '23:00',
      shiftType: 'Evening',
      location: 'Emergency Department',
      minStaffing: 2,
      targetStaffing: 3,
    });

    // Night shift
    shifts.push({
      scheduleId: schedule.id,
      organizationId: org.id,
      shiftDate: shiftDate,
      startTime: '23:00',
      endTime: '07:00',
      shiftType: 'Night',
      location: 'Emergency Department',
      minStaffing: 2,
      targetStaffing: 2,
    });
  }

  const createdShifts = await Promise.all(
    shifts.map((shift) => prisma.shift.create({ data: shift }))
  );

  // Add skill requirements to shifts
  console.log('🎯 Adding skill requirements to shifts...');
  for (const shift of createdShifts) {
    await prisma.shiftSkillRequirement.createMany({
      data: [
        {
          shiftId: shift.id,
          skillId: rnSkill.id,
          quantity: shift.targetStaffing,
          minLevel: 3,
        },
        {
          shiftId: shift.id,
          skillId: aclsSkill.id,
          quantity: 1,
          minLevel: 3,
        },
      ],
    });
  }

  // Create shift assignments for some shifts
  console.log('📝 Creating shift assignments...');
  const assignmentData = [
    // Today's day shift - Staff 1
    { shiftIndex: 0, staffProfileId: staff1Profile.id },
    // Today's day shift - Staff 2
    { shiftIndex: 0, staffProfileId: staff2Profile.id },
    // Today's evening shift - Staff 3
    { shiftIndex: 1, staffProfileId: staff3Profile.id },
    // Tomorrow's day shift - Staff 2
    { shiftIndex: 3, staffProfileId: staff2Profile.id },
    // Tomorrow's evening shift - Staff 1
    { shiftIndex: 4, staffProfileId: staff1Profile.id },
  ];

  for (const assignment of assignmentData) {
    await prisma.shiftAssignment.create({
      data: {
        shiftId: createdShifts[assignment.shiftIndex].id,
        staffProfileId: assignment.staffProfileId,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        triggersOT: false,
        triggersPremium: false,
      },
    });
  }

  // Create staff availability
  console.log('📋 Creating staff availability...');
  for (let i = 0; i < 14; i++) {
    const availDate = new Date(startDate);
    availDate.setDate(startDate.getDate() + i);

    // Staff 1 - available most days
    if (i % 4 !== 0) {
      await prisma.staffAvailability.create({
        data: {
          staffProfileId: staff1Profile.id,
          scheduleId: schedule.id,
          availabilityDate: availDate,
          startTime: '07:00',
          endTime: '23:00',
          isAvailable: true,
          preferenceLevel: i % 2 === 0 ? 5 : 3,
        },
      });
    }

    // Staff 2 - rotating availability
    if (i % 3 !== 0) {
      await prisma.staffAvailability.create({
        data: {
          staffProfileId: staff2Profile.id,
          scheduleId: schedule.id,
          availabilityDate: availDate,
          startTime: '07:00',
          endTime: '23:00',
          isAvailable: true,
          preferenceLevel: 4,
        },
      });
    }

    // Staff 3 - less availability (junior)
    if (i % 2 === 0) {
      await prisma.staffAvailability.create({
        data: {
          staffProfileId: staff3Profile.id,
          scheduleId: schedule.id,
          availabilityDate: availDate,
          startTime: '15:00',
          endTime: '23:00',
          isAvailable: true,
          preferenceLevel: 3,
        },
      });
    }
  }

  // Create schedule preferences
  console.log('⚙️ Creating schedule preferences...');
  await prisma.schedulePreference.createMany({
    data: [
      {
        staffProfileId: staff1Profile.id,
        scheduleId: schedule.id,
        minShifts: 8,
        maxShifts: 12,
        maxConsecutive: 4,
        preferredDays: [1, 2, 3, 4], // Mon-Thu
        avoidDays: [0, 6], // Sun, Sat
        preferredShiftTypes: ['Day', 'Evening'],
        workWithStaff: [staff2Profile.id],
        avoidWithStaff: [],
        additionalNotes: 'Prefer to work with Emily, avoid weekend shifts when possible',
      },
      {
        staffProfileId: staff2Profile.id,
        scheduleId: schedule.id,
        minShifts: 10,
        maxShifts: 14,
        maxConsecutive: 5,
        preferredDays: [],
        avoidDays: [],
        preferredShiftTypes: ['Day'],
        workWithStaff: [],
        avoidWithStaff: [],
        additionalNotes: 'Flexible with scheduling',
      },
      {
        staffProfileId: staff3Profile.id,
        scheduleId: schedule.id,
        minShifts: 6,
        maxShifts: 10,
        maxConsecutive: 3,
        preferredDays: [1, 2, 3, 4, 5], // Weekdays
        avoidDays: [0, 6],
        preferredShiftTypes: ['Evening'],
        workWithStaff: [],
        avoidWithStaff: [],
        additionalNotes: 'Still building experience, prefer evenings',
      },
    ],
  });

  // Create a time off request
  console.log('🏖️ Creating time off request...');
  const vacationStart = new Date(startDate);
  vacationStart.setDate(startDate.getDate() + 21);
  const vacationEnd = new Date(vacationStart);
  vacationEnd.setDate(vacationStart.getDate() + 6);

  const timeOffBanks = await prisma.timeOffBank.findMany({
    where: { staffProfileId: staff1Profile.id },
  });
  const vacationBank = timeOffBanks.find((b) => b.bankType === 'VACATION');

  await prisma.timeOffRequest.create({
    data: {
      staffProfileId: staff1Profile.id,
      bankId: vacationBank?.id,
      startDate: vacationStart,
      endDate: vacationEnd,
      hoursRequested: 56, // 7 days * 8 hours
      reason: 'Family vacation',
      status: 'APPROVED',
      suggestedBank: 'VACATION',
      requiresWeekendOff: true,
      approvedBy: managerUser.id,
      approvedAt: new Date(),
    },
  });

  // Create a shift swap request
  console.log('🔄 Creating shift swap request...');
  const swapShift = createdShifts[10]; // A future shift
  await prisma.shiftSwapRequest.create({
    data: {
      requestingStaffId: staff3Profile.id,
      targetStaffId: staff2Profile.id,
      originalShiftId: swapShift.id,
      status: 'PENDING',
      requestReason: 'Need to attend family event',
      aiSuggestions: {
        suggestedPartners: [
          {
            staffId: staff2Profile.id,
            staffName: 'Emily Rodriguez',
            compatibility: {
              skillsMatch: true,
              availabilityMatch: true,
              noViolations: true,
              swapLimitOk: true,
            },
            score: 95,
          },
          {
            staffId: staff1Profile.id,
            staffName: 'Michael Chen',
            compatibility: {
              skillsMatch: true,
              availabilityMatch: true,
              noViolations: true,
              swapLimitOk: true,
            },
            score: 88,
          },
        ],
      },
      skillsMatched: true,
      triggersViolations: {},
    },
  });

  // Create chat conversations
  console.log('💬 Creating chat conversations...');
  const conversation1 = await prisma.chatConversation.create({
    data: {
      staffProfileId: staff1Profile.id,
      conversationType: 'AVAILABILITY_SUBMISSION',
      context: {
        scheduleId: schedule.id,
        currentStep: 'reviewing_cba_requirements',
      },
      isActive: true,
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        conversationId: conversation1.id,
        role: 'assistant',
        content:
          "Hi Michael! It's time to submit your availability for next month's schedule. Would you like to do that now?",
        metadata: {
          action: 'availability_reminder',
          scheduleId: schedule.id,
        },
      },
      {
        conversationId: conversation1.id,
        role: 'user',
        content: 'Yes, please!',
      },
      {
        conversationId: conversation1.id,
        role: 'assistant',
        content:
          "Great! Let me first show you your current schedule and any pre-approved time off. You have 1 approved vacation request from " +
          vacationStart.toDateString() +
          " to " +
          vacationEnd.toDateString() +
          ". According to the CBA, you need to provide at least 20 hours of availability per week. Let's review your availability together.",
        metadata: {
          timeOffRequests: [vacationStart.toISOString()],
          cbaRequirements: {
            minHoursPerWeek: 20,
            minWeekends: 2,
          },
        },
      },
    ],
  });

  const conversation2 = await prisma.chatConversation.create({
    data: {
      staffProfileId: staff3Profile.id,
      conversationType: 'SHIFT_SWAP',
      context: {
        swapRequestId: (await prisma.shiftSwapRequest.findFirst())?.id,
        originalShiftId: swapShift.id,
      },
      isActive: true,
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        conversationId: conversation2.id,
        role: 'user',
        content: 'I need next Thursday evening off. Who can I swap with?',
      },
      {
        conversationId: conversation2.id,
        role: 'assistant',
        content:
          "I can help you with that! Let me check who's available and qualified for a swap. First, is your availability up to date?",
        metadata: {
          action: 'verify_availability',
        },
      },
      {
        conversationId: conversation2.id,
        role: 'user',
        content: 'Yes, it should be current.',
      },
      {
        conversationId: conversation2.id,
        role: 'assistant',
        content:
          "Perfect! I've found 2 compatible swap partners:\n\n1. **Emily Rodriguez** (Score: 95/100)\n   - ✅ Skills match\n   - ✅ Has availability that day\n   - ✅ No CBA violations\n   - ✅ Within swap limit\n\n2. **Michael Chen** (Score: 88/100)\n   - ✅ Skills match\n   - ✅ Has availability that day\n   - ✅ No CBA violations\n   - ✅ Within swap limit\n\nWould you like me to submit a swap request to Emily?",
        metadata: {
          action: 'present_swap_options',
          suggestions: 2,
        },
      },
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  Organizations: 1`);
  console.log(`  Collective Agreements: 1`);
  console.log(`  Scheduling Rules: 6`);
  console.log(`  Departments: 2`);
  console.log(`  Skills: 3`);
  console.log(`  Users: 4 (1 manager, 3 staff)`);
  console.log(`  Time Off Banks: 7`);
  console.log(`  Schedules: 1`);
  console.log(`  Shifts: ${shifts.length}`);
  console.log(`  Shift Assignments: ${assignmentData.length}`);
  console.log(`  Time Off Requests: 1`);
  console.log(`  Shift Swap Requests: 1`);
  console.log(`  Chat Conversations: 2`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
