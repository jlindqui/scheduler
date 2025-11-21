-- CreateEnum
CREATE TYPE "public"."MemberRole" AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "public"."ScheduleStatus" AS ENUM ('PREFERENCE_COLLECTION', 'OPTIMIZATION', 'MANAGER_REVIEW', 'PUBLISHED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."AssignmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ConstraintType" AS ENUM ('DAY_RESTRICTION', 'CONSECUTIVE_DAYS', 'WEEKEND_PATTERN', 'DAY_PAIRING', 'MAX_SHIFTS_PER_WEEK', 'PREFERRED_DAYS_OFF', 'TIME_OF_DAY', 'MINIMUM_DAYS_BETWEEN');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "employee_number" TEXT,
    "timezone" TEXT DEFAULT 'America/New_York',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "current_organization_id" TEXT,
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationMember" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" "public"."MemberRole" NOT NULL DEFAULT 'EMPLOYEE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmployeeProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "hire_date" TIMESTAMP(3) NOT NULL,
    "job_title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Schedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "public"."ScheduleStatus" NOT NULL DEFAULT 'PREFERENCE_COLLECTION',
    "preferences_due_date" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OptimizationDraft" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "draft_number" INTEGER NOT NULL,
    "name" TEXT,
    "summary" JSONB NOT NULL,
    "assignments" JSONB NOT NULL,
    "score" DECIMAL(10,2),
    "risk_analysis" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Shift" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "shift_date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "shift_type" TEXT,
    "location" TEXT,
    "min_staffing" INTEGER NOT NULL DEFAULT 1,
    "target_staffing" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShiftAssignment" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "employee_profile_id" TEXT NOT NULL,
    "status" "public"."AssignmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GeneralPreference" (
    "id" TEXT NOT NULL,
    "employee_profile_id" TEXT NOT NULL,
    "constraint_type" "public"."ConstraintType" NOT NULL,
    "description" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneralPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SchedulePreference" (
    "id" TEXT NOT NULL,
    "employee_profile_id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "constraint_type" "public"."ConstraintType" NOT NULL,
    "description" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulePreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employee_number_key" ON "public"."User"("employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_id_account_id_key" ON "public"."Account"("provider_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "public"."Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_identifier_value_key" ON "public"."Verification"("identifier", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "public"."Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_user_id_organization_id_key" ON "public"."OrganizationMember"("user_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_user_id_key" ON "public"."EmployeeProfile"("user_id");

-- CreateIndex
CREATE INDEX "EmployeeProfile_organization_id_idx" ON "public"."EmployeeProfile"("organization_id");

-- CreateIndex
CREATE INDEX "Schedule_organization_id_idx" ON "public"."Schedule"("organization_id");

-- CreateIndex
CREATE INDEX "Schedule_status_idx" ON "public"."Schedule"("status");

-- CreateIndex
CREATE INDEX "OptimizationDraft_schedule_id_idx" ON "public"."OptimizationDraft"("schedule_id");

-- CreateIndex
CREATE UNIQUE INDEX "OptimizationDraft_schedule_id_draft_number_key" ON "public"."OptimizationDraft"("schedule_id", "draft_number");

-- CreateIndex
CREATE INDEX "Shift_schedule_id_idx" ON "public"."Shift"("schedule_id");

-- CreateIndex
CREATE INDEX "Shift_shift_date_idx" ON "public"."Shift"("shift_date");

-- CreateIndex
CREATE INDEX "ShiftAssignment_employee_profile_id_idx" ON "public"."ShiftAssignment"("employee_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftAssignment_shift_id_employee_profile_id_key" ON "public"."ShiftAssignment"("shift_id", "employee_profile_id");

-- CreateIndex
CREATE INDEX "GeneralPreference_employee_profile_id_idx" ON "public"."GeneralPreference"("employee_profile_id");

-- CreateIndex
CREATE INDEX "SchedulePreference_employee_profile_id_idx" ON "public"."SchedulePreference"("employee_profile_id");

-- CreateIndex
CREATE INDEX "SchedulePreference_schedule_id_idx" ON "public"."SchedulePreference"("schedule_id");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_current_organization_id_fkey" FOREIGN KEY ("current_organization_id") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationMember" ADD CONSTRAINT "OrganizationMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationMember" ADD CONSTRAINT "OrganizationMember_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Schedule" ADD CONSTRAINT "Schedule_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OptimizationDraft" ADD CONSTRAINT "OptimizationDraft_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Shift" ADD CONSTRAINT "Shift_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_employee_profile_id_fkey" FOREIGN KEY ("employee_profile_id") REFERENCES "public"."EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GeneralPreference" ADD CONSTRAINT "GeneralPreference_employee_profile_id_fkey" FOREIGN KEY ("employee_profile_id") REFERENCES "public"."EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SchedulePreference" ADD CONSTRAINT "SchedulePreference_employee_profile_id_fkey" FOREIGN KEY ("employee_profile_id") REFERENCES "public"."EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SchedulePreference" ADD CONSTRAINT "SchedulePreference_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
