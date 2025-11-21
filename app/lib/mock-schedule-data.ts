// Mock data service based on CSV example data
// Represents the Schedule Preparation use case with 20 RN staff, 6-week schedule

export type ShiftTime = {
  startTime: string;
  endTime: string;
  shiftType: 'Day' | 'Night';
};

export type StaffMember = {
  staffNumber: number;
  name: string;
  email: string;
  skill: 'RN';
  status: 'FT' | 'PT';
  fte: number;
  canWorkDayShift: boolean;
  canWorkNightShift: boolean;
  seniorityYears: number;
};

export type MasterScheduleShift = {
  staffNumber: number;
  day: number; // 1-42
  shift: ShiftTime | null;
};

export type AvailabilityEntry = {
  staffNumber: number;
  day: number; // 1-42
  shift: ShiftTime | null;
  isFlexible: boolean; // true if "0000-2400" (available anytime)
};

export type LeaveEntry = {
  staffNumber: number;
  startDay: number;
  endDay: number;
  leaveType: 'vac' | 'stat1' | 'stat2' | 'leave1';
  hours: number;
};

export type TimeOffBank = {
  staffNumber: number;
  bankType: 'VACATION' | 'STAT_DAY' | 'PERSONAL_DAY' | 'SICK_TIME';
  balanceHours: number;
  expiryDate: Date | null;
};

export type StaffingGap = {
  day: number;
  date: Date;
  shiftType: 'Day' | 'Night';
  currentStaffing: number;
  targetStaffing: number;
  gap: number;
  affectedByLeaves: number[];
};

// Helper to parse shift time strings
function parseShiftTime(cell: string): ShiftTime | null {
  if (!cell || cell.trim() === '') return null;

  if (cell === '0000-2400') {
    return { startTime: '00:00', endTime: '23:59', shiftType: 'Day' };
  }

  const match = cell.match(/(\d{4})-(\d{4})/);
  if (!match) return null;

  const [, start, end] = match;
  const startTime = `${start.slice(0, 2)}:${start.slice(2)}`;
  const endTime = `${end.slice(0, 2)}:${end.slice(2)}`;

  let shiftType: 'Day' | 'Night' = 'Day';
  if (startTime >= '19:00' || endTime <= '07:00') {
    shiftType = 'Night';
  }

  return { startTime, endTime, shiftType };
}

// Staff data from CSV
export const staff: StaffMember[] = [
  { staffNumber: 1, name: 'Alex Thompson', email: 'alex.thompson@cityhospital.org', skill: 'RN', status: 'FT', fte: 1.0, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 9 },
  { staffNumber: 2, name: 'Blake Martinez', email: 'blake.martinez@cityhospital.org', skill: 'RN', status: 'FT', fte: 1.0, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 8 },
  { staffNumber: 3, name: 'Casey Jordan', email: 'casey.jordan@cityhospital.org', skill: 'RN', status: 'FT', fte: 1.0, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 7 },
  { staffNumber: 4, name: 'Drew Anderson', email: 'drew.anderson@cityhospital.org', skill: 'RN', status: 'FT', fte: 1.0, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 6 },
  { staffNumber: 5, name: 'Ellis Chen', email: 'ellis.chen@cityhospital.org', skill: 'RN', status: 'FT', fte: 1.0, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 12 },
  { staffNumber: 6, name: 'Finley Brown', email: 'finley.brown@cityhospital.org', skill: 'RN', status: 'FT', fte: 1.0, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 15 },
  { staffNumber: 7, name: 'Gray Wilson', email: 'gray.wilson@cityhospital.org', skill: 'RN', status: 'FT', fte: 1.0, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 5 },
  { staffNumber: 8, name: 'Harper Davis', email: 'harper.davis@cityhospital.org', skill: 'RN', status: 'FT', fte: 1.0, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 10 },
  { staffNumber: 9, name: 'Indigo Lee', email: 'indigo.lee@cityhospital.org', skill: 'RN', status: 'FT', fte: 1.0, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 4 },
  { staffNumber: 10, name: 'Jules Kim', email: 'jules.kim@cityhospital.org', skill: 'RN', status: 'FT', fte: 1.0, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 6 },
  { staffNumber: 11, name: 'Kai Patel', email: 'kai.patel@cityhospital.org', skill: 'RN', status: 'FT', fte: 1.0, canWorkDayShift: true, canWorkNightShift: false, seniorityYears: 3 },
  { staffNumber: 12, name: 'Logan Rivera', email: 'logan.rivera@cityhospital.org', skill: 'RN', status: 'FT', fte: 1.0, canWorkDayShift: false, canWorkNightShift: true, seniorityYears: 7 },
  { staffNumber: 13, name: 'Morgan Taylor', email: 'morgan.taylor@cityhospital.org', skill: 'RN', status: 'PT', fte: 0.6, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 2 },
  { staffNumber: 14, name: 'Nico Garcia', email: 'nico.garcia@cityhospital.org', skill: 'RN', status: 'PT', fte: 0.6, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 5 },
  { staffNumber: 15, name: 'Ocean Singh', email: 'ocean.singh@cityhospital.org', skill: 'RN', status: 'PT', fte: 0.6, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 8 },
  { staffNumber: 16, name: 'Parker Nguyen', email: 'parker.nguyen@cityhospital.org', skill: 'RN', status: 'PT', fte: 0.6, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 4 },
  { staffNumber: 17, name: 'Quinn Foster', email: 'quinn.foster@cityhospital.org', skill: 'RN', status: 'PT', fte: 0.6, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 11 },
  { staffNumber: 18, name: 'Reese Murphy', email: 'reese.murphy@cityhospital.org', skill: 'RN', status: 'PT', fte: 0.6, canWorkDayShift: false, canWorkNightShift: true, seniorityYears: 6 },
  { staffNumber: 19, name: 'Skylar Cooper', email: 'skylar.cooper@cityhospital.org', skill: 'RN', status: 'PT', fte: 0.6, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 1 },
  { staffNumber: 20, name: 'Taylor Ross', email: 'taylor.ross@cityhospital.org', skill: 'RN', status: 'PT', fte: 0.6, canWorkDayShift: true, canWorkNightShift: true, seniorityYears: 3 },
];

// Leave/time off data from CSV
export const leaves: LeaveEntry[] = [
  { staffNumber: 1, startDay: 10, endDay: 17, leaveType: 'vac', hours: 96 },
  { staffNumber: 3, startDay: 27, endDay: 28, leaveType: 'vac', hours: 24 },
  { staffNumber: 4, startDay: 22, endDay: 22, leaveType: 'stat1', hours: 12 },
  { staffNumber: 5, startDay: 13, endDay: 13, leaveType: 'stat1', hours: 12 },
  { staffNumber: 6, startDay: 17, endDay: 17, leaveType: 'stat2', hours: 12 },
  { staffNumber: 7, startDay: 6, endDay: 11, leaveType: 'vac', hours: 72 },
  { staffNumber: 8, startDay: 33, endDay: 39, leaveType: 'vac', hours: 84 },
  { staffNumber: 9, startDay: 20, endDay: 20, leaveType: 'stat1', hours: 12 },
  { staffNumber: 9, startDay: 21, endDay: 21, leaveType: 'vac', hours: 12 },
  { staffNumber: 10, startDay: 29, endDay: 29, leaveType: 'stat2', hours: 12 },
  { staffNumber: 12, startDay: 1, endDay: 18, leaveType: 'leave1', hours: 216 },
  { staffNumber: 14, startDay: 41, endDay: 41, leaveType: 'vac', hours: 12 },
  { staffNumber: 18, startDay: 17, endDay: 24, leaveType: 'vac', hours: 96 },
];

// Time off banks with expiry dates
export const timeOffBanks: TimeOffBank[] = [
  // Staff with expiring banks
  { staffNumber: 1, bankType: 'STAT_DAY', balanceHours: 24, expiryDate: new Date('2025-02-15') },
  { staffNumber: 1, bankType: 'VACATION', balanceHours: 120, expiryDate: null },
  { staffNumber: 5, bankType: 'STAT_DAY', balanceHours: 36, expiryDate: new Date('2025-02-01') },
  { staffNumber: 5, bankType: 'VACATION', balanceHours: 80, expiryDate: null },
  { staffNumber: 9, bankType: 'STAT_DAY', balanceHours: 48, expiryDate: new Date('2025-02-28') },
  { staffNumber: 9, bankType: 'VACATION', balanceHours: 96, expiryDate: null },
  // Other staff
  { staffNumber: 13, bankType: 'VACATION', balanceHours: 56, expiryDate: null },
  { staffNumber: 13, bankType: 'STAT_DAY', balanceHours: 16, expiryDate: new Date('2025-03-31') },
  { staffNumber: 17, bankType: 'VACATION', balanceHours: 72, expiryDate: null },
  { staffNumber: 17, bankType: 'STAT_DAY', balanceHours: 20, expiryDate: new Date('2025-03-15') },
];

// Schedule metadata
export const scheduleMetadata = {
  name: 'January-February 2025 Schedule',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-02-11'), // 42 days later
  totalDays: 42,
  staffingTarget: {
    dayShift: 4,
    nightShift: 4,
  },
};

// CBA Rules
export const cbaRules = {
  availabilityMinimum: {
    fullTime: { minHoursPerWeek: 20, minWeekends: 2 },
    partTime: { minHoursPerWeek: 12, minWeekends: 1 },
  },
  overtimeTrigger: {
    hoursPerShift: 12,
    payMultiplier: 1.5,
  },
  sequentialWeekends: {
    minWeeksBetween: 1,
  },
  maxConsecutiveShifts: 4,
  minRestBetweenShifts: 12,
  vacationWeekendRule: {
    requiresWeekendBefore: true,
    description: 'Weekend before vacation must be off',
  },
};

// Helper function to get date for a specific day in the schedule
export function getDateForDay(day: number): Date {
  const date = new Date(scheduleMetadata.startDate);
  date.setDate(date.getDate() + day - 1);
  return date;
}

// Helper to get staff by number
export function getStaffByNumber(staffNumber: number): StaffMember | undefined {
  return staff.find(s => s.staffNumber === staffNumber);
}

// Helper to get leaves for a staff member
export function getLeavesForStaff(staffNumber: number): LeaveEntry[] {
  return leaves.filter(l => l.staffNumber === staffNumber);
}

// Helper to get time off banks for a staff member
export function getBanksForStaff(staffNumber: number): TimeOffBank[] {
  return timeOffBanks.filter(b => b.staffNumber === staffNumber);
}

// Helper to check if staff has leave on a specific day
export function hasLeaveOnDay(staffNumber: number, day: number): LeaveEntry | null {
  return leaves.find(l =>
    l.staffNumber === staffNumber &&
    day >= l.startDay &&
    day <= l.endDay
  ) || null;
}

// Helper to get expiring banks for a staff member
export function getExpiringBanks(staffNumber: number, daysThreshold: number = 60): TimeOffBank[] {
  const today = new Date();
  const threshold = new Date(today.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

  return timeOffBanks.filter(b =>
    b.staffNumber === staffNumber &&
    b.expiryDate &&
    b.expiryDate <= threshold
  );
}

// Calculate days until expiry
export function getDaysUntilExpiry(bank: TimeOffBank): number | null {
  if (!bank.expiryDate) return null;
  const today = new Date();
  return Math.floor((bank.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Mock data summary
export function getScheduleSummary() {
  return {
    totalStaff: staff.length,
    fullTimeStaff: staff.filter(s => s.status === 'FT').length,
    partTimeStaff: staff.filter(s => s.status === 'PT').length,
    totalLeaveRequests: leaves.length,
    schedulePeriod: `${scheduleMetadata.totalDays} days (6 weeks)`,
    staffingRequirement: `${scheduleMetadata.staffingTarget.dayShift} per day shift, ${scheduleMetadata.staffingTarget.nightShift} per night shift`,
  };
}
