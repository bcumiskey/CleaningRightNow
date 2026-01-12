# Claude Instance Briefing - Cleaning Right Now

## Project Overview

**Cleaning Right Now** is a property management and cleaning service business application. It manages vacation rental properties, scheduling cleaning jobs, tracking team member work, invoicing property owners, and managing linens/supplies inventory.

**Live URL**: Deployed on Vercel
**Database**: PostgreSQL on Neon
**File Storage**: Vercel Blob

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14.2.33 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Neon) |
| ORM | Prisma 5.19.0 |
| Auth | NextAuth.js 4.24.7 (Credentials provider) |
| Styling | Tailwind CSS 3.4.1 |
| UI Components | Custom components in `/src/components/ui/` |
| Icons | Lucide React |
| Dates | date-fns 3.6.0 |
| Toasts | react-hot-toast |
| PDF Generation | @react-pdf/renderer |
| Email | Resend |
| Push Notifications | web-push |
| File Storage | @vercel/blob |
| Calendar Sync | node-ical |

---

## Directory Structure

```
src/
├── app/
│   ├── (admin)/           # Admin pages (dashboard, properties, team, jobs, etc.)
│   ├── (auth)/            # Login/register pages
│   ├── api/               # API routes (25+ directories)
│   └── worker/            # Team member portal (job details, check-in, etc.)
├── components/
│   ├── alerts/            # Alert components
│   ├── documents/         # PDF templates (invoices, pay statements)
│   ├── layout/            # AdminHeader, AdminSidebar, WorkerNav
│   └── ui/                # Reusable UI (Button, Card, Modal, Input, Select, etc.)
├── hooks/                 # Custom hooks (usePushNotifications)
└── lib/                   # Utilities (auth, prisma, email, pdf, utils)
```

---

## User Roles & Authentication

### Two Login Types (Single Login Page with Toggle)
1. **Admin** - Full access to dashboard, properties, team management, invoicing, reports
2. **Team Member** - Access to worker portal for viewing/completing jobs

### Login Features
- **Login Type Toggle**: Admin vs Team Member selection
- **Remember Device**: Saves email and login type preference to localStorage
- Redirects to appropriate portal after login (`/` for admin, `/worker` for team)

### Data Models for Auth
- `User` - Admin accounts (email/password)
- `TeamMember` - Workers with optional password for worker portal login
- Session uses NextAuth credentials provider

---

## Key Features by Module

### 1. Properties
- Property details with owner info, rates, billing preferences
- Room configuration with bed types
- Standing instructions and reference photos per room
- Property notes (issues, damage, reminders)
- Access codes for team members
- Calendar display color customization
- Keywords for matching calendar events

### 2. Jobs & Scheduling
- Manual job creation with property, date, rate, team assignments
- Recurring schedules (daily, weekly, biweekly, monthly)
- Calendar sync from external sources (Turno, Google, iCal)
- Job priority levels (1-10)
- **Date Handling**: Dates are parsed as local time at noon to avoid timezone issues:
  ```typescript
  new Date(year, month - 1, day, 12, 0, 0)
  ```

### 3. Team Portal (Worker View)
- View assigned jobs
- Check-in/check-out with location tracking
- **Job Start Restrictions**:
  - Can only start on scheduled day or up to 2 days late
  - Cannot start early (future jobs)
  - Late starts require double confirmation with playful messages
  - Must complete jobs in order (back-to-back blocking)
- Add completion notes and photos
- Performance ratings from supervisors

### 4. Invoicing
- **Billing Frequencies**: per_job, weekly, biweekly, monthly_1st, monthly_15th, monthly_end
- **Invoice Accumulation**: Jobs with accumulated billing (weekly/biweekly/monthly) are grouped into single draft invoices by billing period
- Per-job billing creates immediate individual invoices
- PDF generation and email sending via Resend
- Custom billing items

### 5. Team Management
- Team member profiles with rank (1-100) and supervision capability
- Pay tracking per job assignment
- Performance ratings and metrics
- Pay statements with monthly summaries

### 6. Linens & Supplies
- Category-based inventory management
- Per-property requirements (per-flip quantities)
- Vendor product tracking with pricing
- Shopping list generation

---

## Recent Changes (January 2026)

### UI/Terminology
- Changed "Worker" to "Team Member" throughout user-facing text
- "Worker Portal" renamed to "Team Portal" in sidebar
- Role dropdown in team page shows "Team Member" instead of "Worker"

### Login System
- Added Admin/Team Member toggle on login page
- Implemented "Remember this device" with localStorage persistence

### Job Management
- Fixed timezone bug causing incorrect date assignments (parsing dates as local time)
- Removed time field from job creation modal
- Added "Add Job" button to calendar page
- Made calendar dates clickable to create jobs with pre-selected date
- Added hover preview on calendar (2-second delay)

### Late Start Flow
- Playful two-step confirmation for late job starts
- First modal: "Why put off 'til tomorrow... what you can do today?"
- Second modal: "No judgement here - life happens!"

### Billing & Invoicing
- Enhanced billing frequency options (per_job, weekly, biweekly, monthly variants)
- Auto-send invoice toggle per property
- Invoice accumulation logic groups jobs by billing period

### Pay History
- Added "Pay History" button to Jobs page for admins

### Production Cleanup
- Removed debug console.log statements from properties API
- Added autoSendInvoice to Property interface

---

## Important Code Patterns

### Date Handling (Avoid Timezone Issues)
```typescript
// CORRECT: Parse as local time
const dateParts = data.date.split('-')
const jobDate = new Date(
  parseInt(dateParts[0]),     // year
  parseInt(dateParts[1]) - 1, // month (0-indexed)
  parseInt(dateParts[2]),     // day
  12, 0, 0                    // noon local time
)

// WRONG: Parses as UTC, causes date shift
const jobDate = new Date(data.date)
```

### Invoice Creation Logic
Located in `src/app/api/jobs/[id]/route.ts`:
- Per-job billing: Creates individual invoice immediately on job completion
- Accumulated billing: Looks for existing draft invoice for same property + billing period, adds line item or creates new draft

### API Route Handlers
All in `src/app/api/` with consistent patterns:
- Session check with `getServerSession(authOptions)`
- Role check for admin-only operations
- Prisma queries with appropriate includes
- Error handling with console.error for debugging

---

## Database Schema Highlights

### Core Entities
- **Owner** - Property owners (optional, can use legacy fields on Property)
- **Property** - Rental properties with billing preferences, access info
- **Room** - Structured rooms within properties
- **Job** - Individual cleaning jobs with status tracking
- **JobAssignment** - Links jobs to team members with payment tracking
- **TeamMember** - Workers with hierarchy (rank, canSupervise)
- **Invoice** - Accumulated billing with line items

### Status Fields
- Job: `completed`, `completedAt`, `teamPaid`, `teamPaidAt`, `clientPaid`, `clientPaidAt`
- Invoice: `status` (draft/sent/paid), `sentAt`, `paidAt`
- JobSession: `status` (assigned/checked_in/completed/absent/late)

---

## API Routes Overview

| Path | Purpose |
|------|---------|
| `/api/jobs` | CRUD for jobs |
| `/api/jobs/[id]` | Single job operations |
| `/api/jobs/[id]/team-payment` | Mark team as paid |
| `/api/properties` | CRUD for properties |
| `/api/properties/[id]/rooms` | Room management |
| `/api/team` | Team member management |
| `/api/team/[id]/pay` | Pay history |
| `/api/team/mark-paid` | Batch mark payments |
| `/api/invoices` | Invoice CRUD |
| `/api/invoices/[id]/send` | Email invoice |
| `/api/invoices/[id]/pdf` | Generate PDF |
| `/api/worker/jobs` | Worker's assigned jobs |
| `/api/worker/earnings` | Worker earnings history |
| `/api/job-sessions` | Check-in/out tracking |
| `/api/calendar-sources` | External calendar sync |
| `/api/settings` | Company settings |

---

## Known Considerations

1. **Legacy Owner Fields**: Properties have both `ownerId` (relation) and legacy `ownerName`/`ownerEmail`/`ownerPhone` fields for backwards compatibility

2. **Room Migration**: Rooms are first-class entities but legacy `room` string fields exist on instructions, photos, and requirements

3. **Billing Period Matching**: Invoice accumulation uses exact string matching for `billingPeriod` - ensure consistent formatting

4. **TypeScript Strictness**: Some type checking errors appear locally due to node_modules not being visible to tsc, but Vercel builds work correctly

---

## Environment Variables Required

```
DATABASE_URL=           # Neon PostgreSQL connection string
NEXTAUTH_SECRET=        # NextAuth secret key
NEXTAUTH_URL=           # Base URL for auth callbacks
BLOB_READ_WRITE_TOKEN=  # Vercel Blob storage token
RESEND_API_KEY=         # Email sending
NEXT_PUBLIC_VAPID_PUBLIC_KEY=  # Push notifications
VAPID_PRIVATE_KEY=      # Push notifications
```

---

## Running Locally

```bash
npm install
npm run dev
```

### Database Commands
```bash
npm run db:push    # Push schema changes
npm run db:seed    # Seed initial data
```

---

## Deployment

Deployed via Vercel. The build script handles Prisma generation:
```json
"build": "prisma generate && prisma db push --skip-generate --accept-data-loss && next build"
```

---

## Files to Review First

When starting a new session, these files provide the best context:

1. `prisma/schema.prisma` - Data model
2. `src/app/(admin)/jobs/page.tsx` - Job management UI
3. `src/app/api/jobs/[id]/route.ts` - Job update logic + invoice creation
4. `src/app/worker/job/[id]/page.tsx` - Worker job detail + start/stop flow
5. `src/app/(admin)/properties/[id]/edit/page.tsx` - Property editing with billing
6. `src/components/layout/AdminSidebar.tsx` - Navigation structure

---

*Last updated: January 12, 2026*
