-- CreateTable
CREATE TABLE "public"."ManagerGeneralPreference" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "constraint_type" "public"."ConstraintType" NOT NULL,
    "description" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerGeneralPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ManagerSchedulePreference" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "constraint_type" "public"."ConstraintType" NOT NULL,
    "description" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerSchedulePreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManagerGeneralPreference_organization_id_idx" ON "public"."ManagerGeneralPreference"("organization_id");

-- CreateIndex
CREATE INDEX "ManagerSchedulePreference_organization_id_idx" ON "public"."ManagerSchedulePreference"("organization_id");

-- CreateIndex
CREATE INDEX "ManagerSchedulePreference_schedule_id_idx" ON "public"."ManagerSchedulePreference"("schedule_id");

-- AddForeignKey
ALTER TABLE "public"."ManagerGeneralPreference" ADD CONSTRAINT "ManagerGeneralPreference_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ManagerSchedulePreference" ADD CONSTRAINT "ManagerSchedulePreference_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ManagerSchedulePreference" ADD CONSTRAINT "ManagerSchedulePreference_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
