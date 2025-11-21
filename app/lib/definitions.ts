// Domain types for the Scheduling System
// These types represent the business entities and their structure
// They should match the Prisma schema but be independent of Prisma implementation details

// ============================================================================
// ENUMS
// ============================================================================

export enum MemberRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum ScheduleStatus {
  PREFERENCE_COLLECTION = 'PREFERENCE_COLLECTION',
  OPTIMIZATION = 'OPTIMIZATION',
  MANAGER_REVIEW = 'MANAGER_REVIEW',
  PUBLISHED = 'PUBLISHED',
  COMPLETED = 'COMPLETED',
}

export enum AssignmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export enum ConstraintType {
  DAY_RESTRICTION = 'DAY_RESTRICTION',
  CONSECUTIVE_DAYS = 'CONSECUTIVE_DAYS',
  WEEKEND_PATTERN = 'WEEKEND_PATTERN',
  DAY_PAIRING = 'DAY_PAIRING',
  MAX_SHIFTS_PER_WEEK = 'MAX_SHIFTS_PER_WEEK',
  PREFERRED_DAYS_OFF = 'PREFERRED_DAYS_OFF',
  TIME_OF_DAY = 'TIME_OF_DAY',
  MINIMUM_DAYS_BETWEEN = 'MINIMUM_DAYS_BETWEEN',
}

// ============================================================================
// CORE TYPES
// ============================================================================

export type User = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  employeeNumber: string | null;
  timezone: string | null;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  currentOrganizationId: string | null;
  isSuperAdmin: boolean;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganizationMember = {
  id: string;
  userId: string;
  organizationId: string;
  role: MemberRole;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// EMPLOYEE MANAGEMENT
// ============================================================================

export type EmployeeProfile = {
  id: string;
  userId: string;
  organizationId: string;
  hireDate: Date;
  jobTitle: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// SCHEDULING
// ============================================================================

export type Schedule = {
  id: string;
  name: string;
  organizationId: string;
  startDate: Date;
  endDate: Date;
  status: ScheduleStatus;
  preferencesDueDate: Date | null;
  publishedAt: Date | null;
  createdBy: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type OptimizationDraft = {
  id: string;
  scheduleId: string;
  draftNumber: number;
  name: string | null;
  summary: Record<string, any>;
  assignments: Record<string, any>;
  score: number | null;
  riskAnalysis: Record<string, any> | null;
  notes: string | null;
  createdAt: Date;
};

export type Shift = {
  id: string;
  scheduleId: string;
  shiftDate: Date;
  startTime: string;
  endTime: string;
  shiftType: string | null;
  location: string | null;
  minStaffing: number;
  targetStaffing: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ShiftAssignment = {
  id: string;
  shiftId: string;
  employeeProfileId: string;
  status: AssignmentStatus;
  assignedAt: Date;
  confirmedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// PREFERENCES
// ============================================================================

export type GeneralPreference = {
  id: string;
  employeeProfileId: string;
  constraintType: ConstraintType;
  description: string;
  parameters: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SchedulePreference = {
  id: string;
  employeeProfileId: string;
  scheduleId: string;
  constraintType: ConstraintType;
  description: string;
  parameters: Record<string, any>;
  priority: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// EXTENDED TYPES WITH RELATIONS
// ============================================================================

export type EmployeeProfileWithDetails = EmployeeProfile & {
  user: User;
  generalPreferences: GeneralPreference[];
};

export type ScheduleWithPreferences = Schedule & {
  preferences: (SchedulePreference & {
    employeeProfile: EmployeeProfile & { user: User };
  })[];
};

export type ShiftWithAssignments = Shift & {
  assignments: (ShiftAssignment & {
    employeeProfile: EmployeeProfile & { user: User };
  })[];
};

export type ScheduleAnalysis = {
  schedule: Schedule;
  summary: {
    totalShifts: number;
    assignedShifts: number;
    unassignedShifts: number;
    staffingLevelsMet: boolean;
    preferenceSatisfaction: number; // 0-100 percentage
  };
  risks: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    affectedShifts: string[];
  }[];
  employeeUtilization: {
    employeeId: string;
    shiftsAssigned: number;
    hoursScheduled: number;
    preferencesRespected: number; // 0-100 percentage
  }[];
};

// ============================================================================
// CONSTRAINT PARAMETER TYPES
// ============================================================================

// Type-safe parameter definitions for each constraint type
export type DayRestrictionParams = {
  days: number[]; // Array of day numbers (0=Sunday, 6=Saturday)
  maxDays: number; // Maximum number of these days that can be worked
};

export type ConsecutiveDaysParams = {
  maxConsecutive: number;
};

export type WeekendPatternParams = {
  allowBackToBack: boolean;
};

export type DayPairingParams = {
  ifDay: number; // If working this day (0-6)
  thenNotDay: number; // Cannot work this day (0-6)
};

export type MaxShiftsPerWeekParams = {
  maxShifts: number;
};

export type PreferredDaysOffParams = {
  days: number[]; // Preferred days off (0-6)
};

export type TimeOfDayParams = {
  availableStart: string; // HH:MM
  availableEnd: string; // HH:MM
};

export type MinimumDaysBetweenParams = {
  minDays: number;
};
