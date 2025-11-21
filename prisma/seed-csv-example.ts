import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Helper to parse CSV
function parseCSV(content: string): string[][] {
  return content
    .trim()
    .split('\n')
    .map((line) => line.split(','));
}

// Helper to get shift data from CSV row
function getShiftFromCell(cell: string | undefined): { startTime: string; endTime: string } | null {
  if (!cell || cell.trim() === '') return null;

  // Handle special "available anytime" marker
  if (cell === '0000-2400') {
    return { startTime: '00:00', endTime: '23:59' };
  }

  // Parse time range like "0700-1900"
  const match = cell.match(/(\d{4})-(\d{4})/);
  if (!match) return null;

  const [, start, end] = match;
  return {
    startTime: `${start.slice(0, 2)}:${start.slice(2)}`,
    endTime: `${end.slice(0, 2)}:${end.slice(2)}`,
  };
}

async function main() {
  console.log('🌱 Starting CSV example seed...');

  // Clean existing data (in reverse dependency order)
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

  // Read CSV files
  const docsPath = path.join(process.cwd(), 'documents', 'example');
  const masterScheduleCSV = fs.readFileSync(
    path.join(docsPath, 'Agent Scheduler - Sample Schedule Prep.xlsx - Master Schedule.csv'),
    'utf-8'
  );
  const availabilityCSV = fs.readFileSync(
    path.join(docsPath, 'Agent Scheduler - Sample Schedule Prep.xlsx - Availability.csv'),
    'utf-8'
  );
  const leavesCSV = fs.readFileSync(
    path.join(docsPath, 'Agent Scheduler - Sample Schedule Prep.xlsx - Leaves.csv'),
    'utf-8'
  );
  const skillsCSV = fs.readFileSync(
    path.join(docsPath, 'Agent Scheduler - Sample Schedule Prep.xlsx - Skills.csv'),
    'utf-8'
  );

  const masterSchedule = parseCSV(masterScheduleCSV);
  const availability = parseCSV(availabilityCSV);
  const leaves = parseCSV(leavesCSV);
  const skillsData = parseCSV(skillsCSV);

  // Create organization
  console.log('🏢 Creating organization...');
  const org = await prisma.organization.create({
    data: {
      name: 'City Hospital - Emergency Department',
      slug: 'city-hospital-ed',
      description: 'Emergency Department with 12-hour rotating shifts',
    },
  });

  // Create Collective Agreement
  console.log('📜 Creating collective agreement...');
  const cba = await prisma.collectiveAgreement.create({
    data: {
      name: 'RN Collective Bargaining Agreement 2024-2027',
      organizationId: org.id,
      effectiveDate: new Date('2024-01-01'),
      expiryDate: new Date('2027-12-31'),
      metadata: {
        shiftLength: 12,
        rotationType: 'rotating_day_night',
        schedulePeriod: 42, // 6 weeks
      },
    },
  });

  // Create CBA rules
  console.log('⚖️ Creating CBA rules...');
  await prisma.schedulingRule.createMany({
    data: [
      {
        collectiveAgreementId: cba.id,
        ruleType: 'OVERTIME_TRIGGER',
        name: 'Daily Overtime - 12 hour threshold',
        description: 'Overtime after 12 hours in a shift',
        parameters: { hoursPerShift: 12, payMultiplier: 1.5 },
        priority: 10,
      },
      {
        collectiveAgreementId: cba.id,
        ruleType: 'SEQUENTIAL_WEEKENDS',
        name: 'No Back-to-Back Weekends',
        description: 'Staff cannot work consecutive weekends',
        parameters: { minWeeksBetween: 1 },
        priority: 8,
      },
      {
        collectiveAgreementId: cba.id,
        ruleType: 'MAX_CONSECUTIVE_SHIFTS',
        name: 'Maximum 4 Consecutive Shifts',
        description: 'No more than 4 consecutive 12-hour shifts',
        parameters: { maxConsecutive: 4 },
        priority: 9,
      },
      {
        collectiveAgreementId: cba.id,
        ruleType: 'MIN_REST_BETWEEN',
        name: 'Minimum 12 Hours Rest',
        description: 'At least 12 hours between shift end and next shift start',
        parameters: { minHours: 12 },
        priority: 10,
      },
      {
        collectiveAgreementId: cba.id,
        ruleType: 'AVAILABILITY_MINIMUM',
        name: 'Minimum Availability Requirements',
        description: 'FT staff: 20 hours/week minimum, PT staff: 12 hours/week minimum',
        parameters: {
          fullTime: { minHoursPerWeek: 20, minWeekends: 2 },
          partTime: { minHoursPerWeek: 12, minWeekends: 1 }
        },
        priority: 7,
      },
      {
        collectiveAgreementId: cba.id,
        ruleType: 'STAFFING_TARGET',
        name: 'Minimum Staffing Levels',
        description: '4 RNs per shift (day and night)',
        parameters: {
          dayShift: { min: 4, target: 4 },
          nightShift: { min: 4, target: 4 }
        },
        priority: 10,
      },
    ],
  });

  // Create department
  console.log('🏥 Creating department...');
  const dept = await prisma.department.create({
    data: {
      name: 'Emergency Department',
      description: '24/7 emergency care with rotating 12-hour shifts',
      organizationId: org.id,
    },
  });

  // Create skills
  console.log('🎓 Creating skills...');
  const rnSkill = await prisma.skill.create({
    data: {
      name: 'Registered Nurse',
      description: 'RN License',
      organizationId: org.id,
      requiresCertification: true,
    },
  });

  // Create schedule for the 42-day period
  console.log('📅 Creating 6-week schedule...');
  const scheduleStart = new Date('2025-01-01');
  const scheduleEnd = new Date(scheduleStart);
  scheduleEnd.setDate(scheduleStart.getDate() + 42); // 6 weeks

  const schedule = await prisma.schedule.create({
    data: {
      name: 'January-February 2025 Schedule (6-week cycle)',
      organizationId: org.id,
      startDate: scheduleStart,
      endDate: scheduleEnd,
      status: 'DRAFT',
      createdBy: 'system', // Will update when we create manager
      notes: '6-week rotating schedule - CSV example data',
    },
  });

  // Create manager user
  console.log('👔 Creating manager...');
  const managerUser = await prisma.user.create({
    data: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@cityhospital.org',
      employeeNumber: 'MGR001',
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
      departmentId: dept.id,
      seniorityDate: new Date('2010-01-01'),
      hireDate: new Date('2010-01-01'),
      jobTitle: 'Nurse Manager',
      workSchedulePattern: 'manager',
    },
  });

  await prisma.organizationMember.create({
    data: {
      userId: managerUser.id,
      organizationId: org.id,
      role: 'MANAGER',
    },
  });

  // Parse staff data from CSVs and create users/profiles
  console.log('👥 Creating 20 staff members from CSV...');
  const staffProfiles: any[] = [];

  // Skip header row (index 0) and process staff rows (index 1-20)
  for (let i = 1; i <= 20; i++) {
    const masterRow = masterSchedule[i];
    const availRow = availability[i];
    const leavesRow = leaves[i];
    const skillsRow = skillsData[i];

    if (!masterRow) continue;

    const staffNumber = masterRow[0];
    const skill = masterRow[1]; // RN
    const status = masterRow[2]; // FT or PT
    const fte = parseFloat(masterRow[3] || '1');

    // Create user
    const user = await prisma.user.create({
      data: {
        name: `Staff Member ${staffNumber}`,
        email: `staff${staffNumber}@cityhospital.org`,
        employeeNumber: `EMP${String(staffNumber).padStart(3, '0')}`,
        timezone: 'America/New_York',
        emailVerified: true,
        currentOrganizationId: org.id,
      },
    });

    // Create staff profile
    const profile = await prisma.staffProfile.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        collectiveAgreementId: cba.id,
        departmentId: dept.id,
        managerId: managerProfile.id,
        seniorityDate: new Date(2020 - i, 0, 1), // Vary seniority
        hireDate: new Date(2020 - i, 0, 1),
        jobTitle: 'Registered Nurse',
        workSchedulePattern: status === 'FT' ? 'rotating_12hr' : 'part_time_rotating',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'STAFF',
      },
    });

    // Add RN skill
    await prisma.staffSkill.create({
      data: {
        staffProfileId: profile.id,
        skillId: rnSkill.id,
        proficiencyLevel: 4,
        certifiedDate: new Date(2020 - i, 0, 1),
      },
    });

    // Parse shift skills from Skills CSV
    if (skillsRow) {
      const canWorkDay = skillsRow[1] === '1';
      const canWorkNight = skillsRow[2] === '1';

      // Store in staff profile metadata
      await prisma.staffProfile.update({
        where: { id: profile.id },
        data: {
          workSchedulePattern: JSON.stringify({
            type: status === 'FT' ? 'rotating_12hr' : 'part_time_rotating',
            fte: fte,
            canWorkDayShift: canWorkDay,
            canWorkNightShift: canWorkNight,
          }),
        },
      });
    }

    staffProfiles.push({
      index: i,
      profile,
      user,
      staffNumber,
      status,
      fte,
    });
  }

  console.log(`✅ Created ${staffProfiles.length} staff members`);

  // Create master schedule shifts (base rotational pattern)
  console.log('📋 Creating master schedule shifts...');
  let masterShiftCount = 0;

  for (let day = 1; day <= 42; day++) {
    const shiftDate = new Date(scheduleStart);
    shiftDate.setDate(scheduleStart.getDate() + day - 1);

    // Process each staff member's master schedule for this day
    for (const staff of staffProfiles) {
      const masterRow = masterSchedule[staff.index];
      const cell = masterRow[day + 3]; // +3 to skip Staff,Skill,Status,FTE columns

      const shiftTime = getShiftFromCell(cell);
      if (!shiftTime) continue; // No shift this day

      // Determine shift type based on time
      let shiftType = 'Day';
      if (shiftTime.startTime >= '19:00' || shiftTime.endTime <= '07:00') {
        shiftType = 'Night';
      }

      // Create or find shift for this date/time
      let shift = await prisma.shift.findFirst({
        where: {
          scheduleId: schedule.id,
          shiftDate: shiftDate,
          startTime: shiftTime.startTime,
          shiftType: shiftType,
        },
      });

      if (!shift) {
        shift = await prisma.shift.create({
          data: {
            scheduleId: schedule.id,
            organizationId: org.id,
            shiftDate: shiftDate,
            startTime: shiftTime.startTime,
            endTime: shiftTime.endTime,
            shiftType: shiftType,
            location: 'Emergency Department',
            minStaffing: 4,
            targetStaffing: 4,
            notes: 'Master schedule shift',
          },
        });
      }

      // Create assignment for this staff on this shift
      await prisma.shiftAssignment.create({
        data: {
          shiftId: shift.id,
          staffProfileId: staff.profile.id,
          status: 'SCHEDULED',
          triggersOT: false,
          triggersPremium: false,
          notes: 'From master schedule',
        },
      });

      masterShiftCount++;
    }
  }

  console.log(`✅ Created master schedule with ${masterShiftCount} shift assignments`);

  // Create staff availability (additional shifts they can work)
  console.log('📝 Creating staff availability...');
  let availabilityCount = 0;

  for (const staff of staffProfiles) {
    const availRow = availability[staff.index];

    for (let day = 1; day <= 42; day++) {
      const cell = availRow[day + 3];
      const shiftTime = getShiftFromCell(cell);
      if (!shiftTime) continue;

      const availDate = new Date(scheduleStart);
      availDate.setDate(scheduleStart.getDate() + day - 1);

      await prisma.staffAvailability.create({
        data: {
          staffProfileId: staff.profile.id,
          scheduleId: schedule.id,
          availabilityDate: availDate,
          startTime: shiftTime.startTime,
          endTime: shiftTime.endTime,
          isAvailable: true,
          preferenceLevel: cell === '0000-2400' ? 5 : 3, // Higher preference for anytime availability
          notes: cell === '0000-2400' ? 'Available anytime' : 'Additional shift availability',
        },
      });

      availabilityCount++;
    }
  }

  console.log(`✅ Created ${availabilityCount} availability records`);

  // Create approved leaves
  console.log('🏖️ Creating approved time off / leaves...');
  let leavesCount = 0;

  for (const staff of staffProfiles) {
    const leavesRow = leaves[staff.index];

    // Track consecutive leave days to create consolidated requests
    let leaveStart: Date | null = null;
    let leaveType: string | null = null;

    for (let day = 1; day <= 42; day++) {
      const cell = leavesRow[day + 3];
      const currentDate = new Date(scheduleStart);
      currentDate.setDate(scheduleStart.getDate() + day - 1);

      if (cell && cell.trim() !== '') {
        // Leave day found
        if (!leaveStart || leaveType !== cell) {
          // Start new leave period
          if (leaveStart && leaveType) {
            // Save previous leave period
            await createLeaveRequest(staff, leaveStart, currentDate, leaveType);
            leavesCount++;
          }
          leaveStart = currentDate;
          leaveType = cell;
        }
      } else {
        // No leave this day - save any pending leave
        if (leaveStart && leaveType) {
          const leaveEnd = new Date(currentDate);
          leaveEnd.setDate(currentDate.getDate() - 1);
          await createLeaveRequest(staff, leaveStart, leaveEnd, leaveType);
          leavesCount++;
          leaveStart = null;
          leaveType = null;
        }
      }
    }

    // Handle leave that extends to end of period
    if (leaveStart && leaveType) {
      const leaveEnd = new Date(scheduleStart);
      leaveEnd.setDate(scheduleStart.getDate() + 41);
      await createLeaveRequest(staff, leaveStart, leaveEnd, leaveType);
      leavesCount++;
    }
  }

  console.log(`✅ Created ${leavesCount} leave requests`);

  // Helper function to create leave/time off request
  async function createLeaveRequest(
    staff: any,
    startDate: Date,
    endDate: Date,
    leaveCode: string
  ) {
    // Map leave codes to bank types
    let bankType: any = 'VACATION';
    let reason = '';

    if (leaveCode === 'vac') {
      bankType = 'VACATION';
      reason = 'Vacation time';
    } else if (leaveCode.startsWith('stat')) {
      bankType = 'STAT_DAY';
      reason = 'Stat day';
    } else if (leaveCode.startsWith('leave')) {
      bankType = 'SICK_TIME';
      reason = 'Extended leave';
    }

    // Calculate hours (assuming 12-hour shifts)
    const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const hours = days * 12; // 12-hour shifts

    // Get or create time off bank
    let bank = await prisma.timeOffBank.findFirst({
      where: {
        staffProfileId: staff.profile.id,
        bankType: bankType,
      },
    });

    if (!bank) {
      bank = await prisma.timeOffBank.create({
        data: {
          staffProfileId: staff.profile.id,
          bankType: bankType,
          balanceHours: hours + 100, // Give them enough balance
          yearGranted: 2024,
        },
      });
    }

    // Create time off request
    await prisma.timeOffRequest.create({
      data: {
        staffProfileId: staff.profile.id,
        bankId: bank.id,
        startDate: startDate,
        endDate: endDate,
        hoursRequested: hours,
        reason: reason,
        status: 'APPROVED',
        approvedBy: managerUser.id,
        approvedAt: new Date(),
      },
    });
  }

  console.log('✅ CSV Example Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  Organization: City Hospital - Emergency Department`);
  console.log(`  Schedule Period: 42 days (6 weeks)`);
  console.log(`  Staff: 20 RNs (12 FT, 8 PT)`);
  console.log(`  Master Schedule Assignments: ${masterShiftCount}`);
  console.log(`  Additional Availability: ${availabilityCount}`);
  console.log(`  Approved Leaves: ${leavesCount}`);
  console.log(`  Staffing Target: 4 per shift (day and night)`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ CSV Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
