# CBA Scheduling System

An intelligent workforce scheduling system designed for organizations with Collective Bargaining Agreements (CBAs). Features AI-powered chat agents that assist both staff and managers with scheduling, shift swaps, time-off requests, and CBA compliance.

## Tech Stack

- **Framework:** Next.js 15 (React 19)
- **Language:** TypeScript 5.9
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Better-auth
- **Styling:** Tailwind CSS 4 + shadcn/ui components
- **Calendar:** React Big Calendar
- **Package Manager:** pnpm 10.7.1
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js (see `.node-version` for exact version)
- pnpm 10.7.1 or higher
- PostgreSQL database

### Installation

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/scheduler"
   BETTER_AUTH_SECRET="your-secret-key-here"
   BETTER_AUTH_URL="http://localhost:3000"
   ```

3. **Set up the database:**
   ```bash
   pnpm exec prisma migrate dev
   pnpm exec prisma generate
   ```

4. **Run the development server:**
   ```bash
   pnpm dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm prisma:generate` - Generate Prisma client
- `pnpm prisma:studio` - Open Prisma Studio
- `pnpm exec prisma migrate dev` - Create and apply migrations

## Project Structure

```
scheduler/
├── app/                # Next.js app directory
│   ├── actions/        # Server actions
│   ├── api/           # API routes
│   ├── components/    # Shared components
│   ├── lib/           # Utilities and types
│   └── layout.tsx     # Root layout
├── components/        # UI components (shadcn/ui)
├── prisma/           # Database schema and migrations
├── public/           # Static assets
└── styles/           # Global styles
```

## Key Features

### For Staff
- **🤖 AI Chat Agent** - Conversational interface for all scheduling needs
- **📋 Availability Management** - Submit availability with intelligent validation against CBA requirements
- **🔄 Shift Swaps** - AI-suggested swap partners based on skills, availability, and CBA compliance
- **🏖️ Time Off Requests** - Smart bank selection suggestions to avoid expiry and maximize benefits
- **📊 Schedule Review** - View upcoming shifts, anomalies, and statistics
- **⚠️ Violation Documentation** - Document agreements to work rule violations at regular time

### For Managers
- **📈 Schedule Optimization** - AI-generated schedule drafts with multiple options
- **🎯 Staffing Analysis** - Real-time view of staffing levels, risks, and costs
- **✅ Approval Workflows** - Easy approval of shift swaps and time-off requests
- **📉 Risk Detection** - Identify potential OT triggers, rule violations, and understaffing
- **💡 Decision Support** - AI-powered recommendations for schedule improvements

### Core Capabilities
- **📜 CBA Compliance** - Rules engine enforces overtime, premiums, rest periods, and more
- **💰 Time Off Banks** - Track vacation, stat days, lieu time, sick time with expiry warnings
- **🎓 Skills Management** - Match shifts to staff skills and certifications
- **🏢 Multi-tenant** - Organization and department support
- **🔐 Secure Authentication** - Role-based access control (Admin, Manager, Staff, Viewer)

## Use Cases

### Staff Scenario: "I want Thursday off, who can I swap with?"
1. Staff asks the AI agent for time off
2. Agent verifies availability is up-to-date
3. Agent checks schedule and identifies swap candidates who:
   - Have matching shift patterns
   - Possess required skills
   - Haven't exceeded swap limits
   - Won't trigger OT or premium pay
4. Agent presents options with details
5. Staff selects preferred swap partner
6. Agent submits request for manager approval
7. Request is reflected in schedule upon approval

### Manager Scenario: Schedule Preparation
1. Agent reminds staff when availability submission period opens
2. Agent guides staff through:
   - Viewing current schedule and pre-approved time off
   - Checking availability meets CBA minimums (e.g., 20 hours/week, 2 weekends)
   - Suggesting additional availability slots
   - Optimizing bank usage to avoid expiry
   - Documenting weekend-before-vacation preferences
3. Agent collects preferences (min/max shifts, consecutive limits, preferred days)
4. All data feeds into optimization model
5. Model generates multiple schedule draft options
6. Manager reviews drafts with AI-provided risk analysis
7. Manager selects and publishes final schedule

## Database

The application uses PostgreSQL with Prisma ORM. Key models organized into domains:

### Staff Management
- **StaffProfile** - Employee info, seniority, manager relationships
- **Department** - Organizational units
- **Skill** - Certifications and capabilities
- **StaffSkill** - Many-to-many with proficiency levels

### Collective Agreements
- **CollectiveAgreement** - CBA documents with semantic search (RAG)
- **SchedulingRule** - Configurable rules (OT triggers, sequential weekends, etc.)
- **ViolationDocumentation** - Documented agreements to work rule violations

### Time Off
- **TimeOffBank** - Vacation, stat days, personal days with balances and expiry
- **TimeOffRequest** - Requests with AI bank suggestions

### Scheduling
- **Schedule** - Schedule periods with draft/published/finalized states
- **ScheduleDraft** - Multiple optimization results
- **Shift** - Individual work periods with staffing requirements
- **ShiftAssignment** - Staff-to-shift assignments with OT/premium flags
- **ShiftSkillRequirement** - Required skills for shifts

### Availability & Preferences
- **StaffAvailability** - Date-specific availability with preference levels
- **SchedulePreference** - Min/max shifts, preferred days, work-with preferences
- **ShiftSwapRequest** - Swap requests with AI suggestions

### AI Agent
- **ChatConversation** - Conversation threads by type
- **ChatMessage** - Message history with metadata

### Migrations

Always use migrations to track database changes:

```bash
# Create a new migration
pnpm exec prisma migrate dev --name description_of_change

# Deploy migrations to production
pnpm exec prisma migrate deploy

# Check migration status
pnpm exec prisma migrate status
```

**NEVER** use `prisma db push` - it bypasses migration files!

## Deployment

This project is configured for deployment on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

The build command includes automatic database migrations.

## Development Guidelines

- Use **pnpm** exclusively (npm and yarn are disabled)
- Follow the service layer pattern in `app/lib/definitions.ts`
- Use TypeScript strictly - no implicit `any` types
- Test builds locally before pushing: `pnpm build`
- Use custom date formatters from `@/lib/utils`

## License

MIT

