# Clean Right Now - Testing Playbook

This document provides a comprehensive testing guide for evaluating the Clean Right Now cleaning business management application. Use this as a checklist to verify all features work correctly.

## Overview

**What is this app?**
A full-stack web application for managing a vacation rental cleaning business. It handles:
- Property management with owner relationships
- Job scheduling and team assignments
- Time tracking with check-in/check-out
- Invoicing and payment tracking
- Expense tracking
- Team payment management
- Linen inventory tracking
- Calendar sync from external sources (Turno, Google)

**Tech Stack:**
- Next.js 14 (App Router) + TypeScript
- PostgreSQL + Prisma ORM
- NextAuth for authentication
- TailwindCSS + custom UI components
- Vercel deployment

---

## Test Credentials

### Admin Account
- Email: `admin@cleaningrightnow.com`
- Password: Check environment or ask owner
- Role: Full access to all features

### Worker Account
- Login via team member email + password
- Role: Limited access (assigned jobs, check-in/out)

---

## Admin Role Testing

### 1. Dashboard (`/admin`)

- [ ] Dashboard loads without errors
- [ ] Shows today's jobs count
- [ ] Shows upcoming jobs
- [ ] Shows recent activity
- [ ] Quick action buttons work

### 2. Properties (`/properties`)

**Property List:**
- [ ] All properties display in list/grid view
- [ ] Toggle between list and grid views
- [ ] "Show inactive" toggle filters correctly
- [ ] Search/filter works
- [ ] Click property navigates to detail page

**Property Detail (`/properties/[id]`):**
- [ ] Property info displays correctly
- [ ] Owner information shows
- [ ] Base rate and expense percent displayed
- [ ] Billing type shown (per job / monthly)
- [ ] Access code visible

**Property Tabs:**
- [ ] Jobs tab shows property jobs
- [ ] Notes tab shows/adds notes
- [ ] Photos tab shows reference photos
- [ ] Instructions tab shows standing instructions
- [ ] Linens tab shows linen requirements

**Create Property (`/properties/new`):**
- [ ] Form validates required fields (name, address, owner name, rate)
- [ ] Owner dropdown works (select existing or enter new)
- [ ] Billing type selection works
- [ ] Submit creates property and redirects

**Edit Property (`/properties/[id]/edit`):**
- [ ] Pre-populates all fields
- [ ] Changes save correctly
- [ ] Can mark property inactive

### 3. Owners (`/owners`)

**Owner List:**
- [ ] Shows all owners with property count
- [ ] "Show inactive" toggle works
- [ ] Click owner shows detail

**Owner Detail (`/owners/[id]`):**
- [ ] Shows owner contact info
- [ ] Lists all properties for this owner
- [ ] Edit button works

**Create/Edit Owner:**
- [ ] Form validation works
- [ ] Can set default rate and billing type
- [ ] Can mark owner inactive

### 4. Team (`/team`)

**Team List:**
- [ ] Shows all team members
- [ ] Shows role badges (admin/worker)
- [ ] "Show inactive" toggle works
- [ ] Click member shows detail

**Team Member Detail (`/team/[id]`):**
- [ ] Shows contact info
- [ ] Shows performance stats (avg rating, jobs count)
- [ ] Shows recent job assignments
- [ ] Edit button works

**Create/Edit Team Member:**
- [ ] Form validates required fields
- [ ] Role selection works (admin/worker)
- [ ] Can set password for worker login
- [ ] Rank and supervision settings work

**Team Payments (`/team/payments`):**
- [ ] Shows all unpaid worker earnings
- [ ] Summary cards show totals
- [ ] Worker expandable sections work
- [ ] Select individual assignments
- [ ] Select all worker assignments (checkbox)
- [ ] Select All / Clear Selection buttons work
- [ ] Selected total calculates correctly
- [ ] Process Payment dialog opens
- [ ] Payment method selection works
- [ ] Mark as Paid updates assignments

### 5. Jobs (`/jobs`)

**Job List:**
- [ ] Shows all jobs (default: upcoming)
- [ ] Date filter works
- [ ] Property filter works
- [ ] Status filter works
- [ ] Click job shows detail

**Job Detail (`/jobs/[id]`):**
- [ ] Shows property info
- [ ] Shows date/time
- [ ] Shows rate and team share calculation
- [ ] Shows assigned team members
- [ ] Completion status displayed
- [ ] Payment status (client paid, team paid) shown

**Create Job (`/jobs/new`):**
- [ ] Property dropdown works
- [ ] Date picker works
- [ ] Time field works
- [ ] Rate pre-fills from property (can override)
- [ ] Team assignment multi-select works
- [ ] Submit creates job

**Quick Complete (from list):**
- [ ] Mark complete updates status
- [ ] Updates job completion timestamp

### 6. Invoices (`/invoices`)

**Invoice List:**
- [ ] Shows all invoices
- [ ] Status filter works (draft, sent, paid)
- [ ] Property filter works
- [ ] Overdue badge shows on late invoices
- [ ] Click invoice opens detail

**Invoice Detail (`/invoices/[id]`):**
- [ ] Header shows invoice number, property, status
- [ ] Line items display correctly
- [ ] Totals calculate (subtotal, discount, total)
- [ ] Status actions work:
  - [ ] Draft -> Send (updates to sent)
  - [ ] Sent -> Record Payment
  - [ ] Payment dialog shows amount due
  - [ ] Payment method selection works
  - [ ] Can enter reference number
  - [ ] Mark Paid updates invoice
- [ ] Paid invoices show payment info

**Create Invoice (`/invoices/new`):**
- [ ] Property selection works
- [ ] Auto-populates unbilled jobs as line items
- [ ] Can add custom line items
- [ ] Can adjust amounts
- [ ] Can add discount
- [ ] Submit creates invoice

**Monthly Billing (`/invoices/monthly-billing`):**
- [ ] Shows current month
- [ ] Summary cards display correctly
- [ ] Ready to Invoice section shows monthly properties with unbilled jobs
- [ ] Create Invoice button works
- [ ] Draft invoices section shows drafts
- [ ] Help text displays

### 7. Expenses (`/expenses`)

**Expense List:**
- [ ] Shows all expenses
- [ ] Category filter works
- [ ] Date filter works
- [ ] Total displays correctly
- [ ] Click expense shows detail/edit

**Expense Detail (`/expenses/[id]`):**
- [ ] Shows all expense info
- [ ] Edit button works
- [ ] Delete with confirmation

**Add Expense (`/expenses/new`):**
- [ ] Date picker works
- [ ] Category dropdown works (supplies, equipment, mileage, insurance, subscriptions, other)
- [ ] Amount field works
- [ ] Mileage mode:
  - [ ] Selecting mileage shows miles input
  - [ ] Auto-calculates amount (miles x $0.70)
- [ ] Vendor field works
- [ ] Property dropdown (optional) works
- [ ] Notes field works
- [ ] Submit creates expense

### 8. Reports (`/reports`)

**Reports Dashboard:**
- [ ] Financial summary cards display
- [ ] Accounts Receivable section shows aging buckets
- [ ] AR by owner list displays
- [ ] Links work (Team Payments, Year-End)

**Year-End Export (`/reports/year-end`):**
- [ ] Year selector works
- [ ] Summary stats display correctly
- [ ] Revenue by property table shows
- [ ] Revenue by owner table shows
- [ ] Expenses by category shows
- [ ] Contractor payments table shows
- [ ] 1099 threshold indicator (>$600) works
- [ ] Export buttons work:
  - [ ] Export Summary CSV
  - [ ] Export Expenses CSV
  - [ ] Export Contractor Payments CSV

### 9. Calendar/Sync (`/calendar`)

- [ ] Calendar view displays jobs
- [ ] Can navigate months
- [ ] Job details show on click
- [ ] Calendar sources list displays
- [ ] Can add calendar source (iCal URL)
- [ ] Sync now triggers refresh

### 10. Linens (`/linens`)

**Linen Items:**
- [ ] Categories display
- [ ] Items list by category
- [ ] Add/edit linen items
- [ ] Unit cost tracking

**Property Requirements:**
- [ ] Set per-flip requirements
- [ ] Property-specific pricing

### 11. Settings (`/settings`)

- [ ] Company settings form works
- [ ] Save updates settings
- [ ] Logo upload (if implemented)

---

## Worker Role Testing

Workers have limited access compared to admins.

### 1. Worker Login

- [ ] Can login with team member email + password
- [ ] Redirected to worker dashboard

### 2. Worker Dashboard (`/worker`)

- [ ] Shows assigned jobs for today
- [ ] Shows upcoming assigned jobs
- [ ] Quick access to check-in

### 3. Job Check-In/Out

**From Job Card:**
- [ ] Check In button appears on assigned jobs
- [ ] Check In records timestamp
- [ ] After check-in, Check Out button appears
- [ ] Check Out records completion

**From Property QR/NFC:**
- [ ] Scan property check-in token
- [ ] Auto-identifies property and job
- [ ] Check-in works

### 4. Property Access (`/worker/properties/[id]`)

- [ ] Can view property details
- [ ] Can see access code
- [ ] Can see instructions
- [ ] Can see reference photos
- [ ] Cannot edit property

### 5. Time Tracking

- [ ] Can see own job sessions
- [ ] Timestamps recorded correctly
- [ ] Duration calculated

### 6. Worker Cannot Access

Verify workers get redirected or see "Forbidden":
- [ ] Cannot access `/properties/new`
- [ ] Cannot access `/owners`
- [ ] Cannot access `/team` (except own profile)
- [ ] Cannot access `/invoices`
- [ ] Cannot access `/reports`
- [ ] Cannot access `/settings`

---

## API Testing (Optional)

For developers wanting to verify API endpoints directly:

### Authentication
- `POST /api/auth/signin` - Login
- `GET /api/auth/session` - Get current session

### Properties
- `GET /api/properties` - List properties
- `POST /api/properties` - Create property
- `GET /api/properties/[id]` - Get property
- `PATCH /api/properties/[id]` - Update property

### Jobs
- `GET /api/jobs` - List jobs
- `POST /api/jobs` - Create job
- `PATCH /api/jobs/[id]` - Update job
- `POST /api/jobs/[id]/complete` - Mark complete

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `PATCH /api/invoices/[id]` - Update invoice
- `POST /api/invoices/[id]/send` - Send invoice
- `POST /api/invoices/[id]/pay` - Record payment

### Team
- `GET /api/team` - List team members
- `POST /api/team` - Create team member
- `GET /api/team/unpaid-summary` - Get unpaid earnings
- `POST /api/team/mark-paid` - Mark assignments as paid

### Expenses
- `GET /api/expenses` - List expenses
- `POST /api/expenses` - Create expense
- `PATCH /api/expenses/[id]` - Update expense
- `DELETE /api/expenses/[id]` - Delete expense

### Reports
- `GET /api/reports/accounts-receivable` - AR aging report
- `GET /api/reports/year-end?year=2026` - Year-end data

---

## Edge Cases to Test

### Data Validation
- [ ] Empty required fields show validation errors
- [ ] Invalid email formats rejected
- [ ] Negative amounts rejected
- [ ] Future dates work for scheduling
- [ ] Past dates work for expenses

### Business Logic
- [ ] Team share calculation: `rate * (1 - expensePercent/100)`
- [ ] Per-worker amount: `teamShare / assignmentCount`
- [ ] Invoice totals: `subtotal - discount = total`
- [ ] AR aging buckets calculate correctly
- [ ] 1099 threshold at $600 per contractor

### Concurrent Operations
- [ ] Multiple users editing same job
- [ ] Payment marked while viewing
- [ ] Invoice sent while editing

### Mobile/Responsive
- [ ] App works on mobile viewport
- [ ] Navigation works on mobile
- [ ] Forms usable on mobile
- [ ] Tables scroll horizontally if needed

---

## Known Issues to Verify Fixed

1. **Badge variant** - Should use 'default' not 'secondary'
2. **Show/hide inactive toggles** - Should be consistent across app
3. **Console.log statements** - Should not appear in production console

---

## Performance Checks

- [ ] Dashboard loads under 2 seconds
- [ ] Property list with 40+ properties loads smoothly
- [ ] Job list scrolls smoothly
- [ ] No visible lag in navigation

---

## Suggested Test Data

For a meaningful test, ensure the database has:
- At least 5-10 properties
- 3-5 team members (1 admin, rest workers)
- Jobs in various states (pending, completed, paid)
- Invoices in various states (draft, sent, paid)
- Some expenses across categories
- At least one property with monthly billing

---

## After Testing

Report findings including:
1. Bugs found (with steps to reproduce)
2. UX issues or confusing workflows
3. Missing features for core business needs
4. Performance concerns
5. Mobile usability issues

This helps prioritize future development work.
