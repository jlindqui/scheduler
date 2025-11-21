# Development Instructions for Claude

## Project Information
- **Project Name**: Preference-Based Scheduling System
- **Description**: Intelligent workforce scheduling system based on employee preferences and AI optimization
- **Primary Users**: Employees who submit preferences, managers who review and publish schedules
- **Key Differentiator**: Employee preference collection + AI-powered schedule optimization + manager review workflow

## Domain Context

### Core Concept
This is a preference-based scheduling system where:
1. **Employees** submit their scheduling preferences (both general and schedule-specific)
2. **AI** generates multiple optimized schedule drafts based on all preferences
3. **Managers** review drafts with AI-provided risk analysis and publish final schedules

### Core Domain Concepts

**Employee** - Staff members who work shifts:
- Can set general preferences that apply to all schedules
- Can set specific preferences for each upcoming schedule
- View their upcoming shifts across 6 scheduling periods

**Schedule** - A 6-week scheduling period:
- Has a defined start and end date
- Goes through multiple stages: preference collection → optimization → manager review → published
- Contains shifts that need to be filled
- Employees can see the next 6 upcoming schedules

**General Preferences** - Constraints that apply to every schedule:
- Examples: "Can only work 1 of Tuesday or Wednesday", "Cannot work back-to-back weekends"
- Stored as structured data with constraint types
- Always active unless employee deactivates them

**Schedule-Specific Preferences** - Constraints for a particular schedule period:
- Examples: "Can work one of Christmas or New Year's but not both"
- Have priority levels (1-10) to indicate importance
- Override or supplement general preferences

**Shifts** - Work periods that need staffing:
- Have date, start/end times, location
- Require minimum and target staffing levels
- Get assigned to employees during optimization

### Constraint Types

The system supports these preference/constraint types:

1. **DAY_RESTRICTION** - Limit which days can be worked
   - Example: "Can only work 1 of Tuesday or Wednesday each week"
   - Parameters: `{ days: [2, 3], maxDays: 1 }`

2. **CONSECUTIVE_DAYS** - Limit consecutive work days
   - Example: "Cannot work more than 3 days in a row"
   - Parameters: `{ maxConsecutive: 3 }`

3. **WEEKEND_PATTERN** - Weekend working restrictions
   - Example: "Cannot work back-to-back weekends"
   - Parameters: `{ allowBackToBack: false }`

4. **DAY_PAIRING** - Conditional day restrictions
   - Example: "If working Monday, cannot work Friday"
   - Parameters: `{ ifDay: 1, thenNotDay: 5 }`

5. **MAX_SHIFTS_PER_WEEK** - Weekly shift limits
   - Example: "Maximum 4 shifts per week"
   - Parameters: `{ maxShifts: 4 }`

6. **PREFERRED_DAYS_OFF** - Preferred non-working days
   - Example: "Prefer Tuesdays off"
   - Parameters: `{ days: [2] }`

7. **TIME_OF_DAY** - Availability windows
   - Example: "Only available 9am-5pm"
   - Parameters: `{ availableStart: "09:00", availableEnd: "17:00" }`

8. **MINIMUM_DAYS_BETWEEN** - Required rest between shifts
   - Example: "At least 2 days between shifts"
   - Parameters: `{ minDays: 2 }`

### Workflow

#### 1. Employee Workflow
1. View/edit general preferences (applies to all schedules)
2. View next 6 upcoming schedules
3. For each schedule, add/edit specific preferences
4. After schedule published, view assigned shifts
5. Confirm shifts as they approach

#### 2. Manager Workflow
1. Create new schedule (define 6-week period)
2. Set preferences due date
3. Wait for employees to submit preferences
4. Trigger AI optimization
5. Review multiple optimization drafts with:
   - Preference satisfaction scores
   - Risk analysis (understaffing, conflicts, etc.)
   - Employee utilization stats
6. Select and publish final schedule
7. Monitor confirmations and make adjustments

#### 3. Optimization Phase
The AI optimization considers:
- All general preferences for each employee
- All schedule-specific preferences
- Shift staffing requirements
- Fairness across employees
- Cost optimization (minimize total shifts while meeting targets)

Outputs:
- Multiple draft schedules (different optimization strategies)
- Satisfaction scores (how well each draft respects preferences)
- Risk analysis (potential issues with each draft)
- Employee utilization metrics

## Package Manager
- **Always use `pnpm`** instead of `npm` or `yarn`
- This project is configured to only work with pnpm (engine-strict=true)
- Run `pnpm install` for dependencies
- Run `pnpm run build` for builds
- Run `pnpm run dev` for development

## Common Commands
- `pnpm install` - Install dependencies
- `pnpm run build` - Build the project (includes Prisma generate and Next.js build)
- `pnpm run dev` - Start development server with Turbo
- `pnpm run start` - Start production server
- `pnpm run prisma:generate` - Generate Prisma client
- `pnpm exec prisma migrate deploy` - Deploy migration files to database
- `pnpm exec prisma migrate dev` - Create and apply migrations in development
- `pnpm run prisma:studio` - Open Prisma Studio
- `pnpm run prisma:seed` - Seed the database

## Build Process
The build command runs steps in sequence:
1. `prisma migrate deploy` - Deploy database migrations
2. `prisma generate` - Generates Prisma client types
3. `next build` - Builds the Next.js application

## Why pnpm?
This project uses pnpm for:
- Faster installs and better disk usage
- Stricter dependency resolution (prevents phantom dependencies)
- Better monorepo support
- More deterministic builds

## TypeScript
- The project uses TypeScript 5.9 with strict type checking
- Always ensure proper type annotations to avoid implicit 'any' errors
- Run builds to verify TypeScript compliance before committing

## NextJS Version
- This project uses NextJS 15

## Database Migrations
- **NEVER use `prisma db push`** - This bypasses migration files
- Always use migration files to track database changes:
  - `pnpm exec prisma migrate dev` - Create new migrations during development
  - `pnpm exec prisma migrate deploy` - Deploy migrations to production
  - `pnpm exec prisma migrate status` - Check migration status
  - `pnpm exec prisma migrate resolve` - Resolve failed migrations

## Type Architecture and Service Layer Pattern
This project follows a traditional service layer architecture with explicit domain types:

### Domain Types (definitions.ts)
- **All domain types** are defined in `app/lib/definitions.ts` as the single source of truth
- Domain types represent the **business entities** and their structure
- Types should match the Prisma schema but be independent of Prisma implementation details
- **NEVER use** `Awaited<ReturnType<typeof someFunction>>` in component props
- **NEVER manually duplicate** Prisma-generated types in components

### Service Layer (actions/)
- Service functions in `app/actions/` return domain types from `definitions.ts`
- Internal Prisma queries may use Prisma-specific types, but **must transform** to domain types before returning
- Example pattern:
  ```typescript
  // ✅ Correct - Service returns domain type
  async function fetchScheduleById(id: string): Promise<Schedule> {
    const data = await prisma.schedule.findUnique({ ... });
    return data; // matches Schedule from definitions.ts
  }

  // Component uses clean domain type
  interface MyComponentProps {
    schedule: Schedule; // from definitions.ts
  }

  // ❌ Incorrect - Component coupled to Prisma implementation
  interface MyComponentProps {
    schedule: Awaited<ReturnType<typeof fetchScheduleById>>;
  }
  ```

### Type Definition Guidelines
- Domain types in `definitions.ts` **must accurately reflect** the Prisma schema
- Check `prisma/schema.prisma` to ensure:
  - Required fields are not marked as optional (`| null`)
  - Optional fields (with `?` in schema) are properly marked as nullable
  - Enum types match exactly
- When in doubt, verify against the actual database schema
- Run `npx tsc --noEmit` to verify type correctness after changes

### Benefits of This Pattern
- **Single source of truth**: Domain types defined once in `definitions.ts`
- **Loose coupling**: Components don't depend on Prisma implementation
- **Easy refactoring**: Service implementation can change without affecting components
- **Type safety**: Explicit types catch errors at compile time
- **Maintainability**: Traditional pattern familiar to developers from other frameworks

## Date Formatting Standards
- **ALWAYS use custom date formatting functions** from `@/lib/utils` instead of date-fns `format()`
- **For dates with time**: Use `formatSmartDateTime()` - shows "Today at 3:45pm", "Yesterday at 2:30pm", "Nov 15th", etc.
- **For dates only**: Use `formatSmartDate()` - shows "Nov 15th", "Dec 31st", etc.
- **NEVER use**: `formatDateToLocal()`, `format()` from date-fns, or other date formatters
- **Examples**:
  ```tsx
  // ✅ Correct
  import { formatSmartDateTime, formatSmartDate } from "@/lib/utils";
  {formatSmartDateTime(schedule.updatedAt)}  // For timestamps
  {formatSmartDate(schedule.startDate)}      // For dates only

  // ❌ Incorrect
  import { format } from "date-fns";
  {format(date, "MMM d, yyyy")}
  ```

## Important Notes
- The project has engine restrictions that prevent npm/yarn usage
- Always test builds locally before pushing changes
- The codebase uses Prisma ORM with PostgreSQL
- Preference parameters are stored as JSON for flexibility
- All date/time fields should account for timezone differences
- Schedule periods are 6 weeks long
- Employees should see next 6 upcoming schedules (36 weeks total)
