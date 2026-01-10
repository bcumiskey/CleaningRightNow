# Accounting Features Specification

## Overview

This document specifies accounting enhancements for the Clean Right Now application. These features are designed to give a cleaning business owner complete financial visibility while maintaining flexibility in how billing and payments are handled.

**Business Context:**
- ~40 properties across multiple owners
- <10 workers (seasonal turnover expected)
- Payment collection: Venmo, Zelle, check (no payment processor needed)
- Annual accountant relationship (need good records/exports)
- Replacing spreadsheet-based tracking

**Design Principles:**
1. **Flexibility over rigidity** - Support multiple billing/payment methods, not just one workflow
2. **Record-keeping focus** - Track what happened, don't force how it happens
3. **Accountant-friendly** - Easy exports for tax time
4. **Time-saving automation** - But always with manual override options

---

## Feature 1: Payment Recording with Method Tracking

### Purpose
Track how payments are received (Venmo, Zelle, check, etc.) for better record-keeping and reconciliation.

### Current State
- `Invoice.status` changes to "paid" with `paidAt` timestamp
- `Job.clientPaid` boolean with `clientPaidAt` timestamp
- No record of HOW payment was received

### Proposed Changes

#### Schema Updates
```prisma
model Invoice {
  // ... existing fields ...

  // Payment tracking (new fields)
  paymentMethod    String?    // "venmo" | "zelle" | "check" | "cash" | "bank_transfer" | "other"
  paymentReference String?    // Check #, Venmo confirmation, transaction ID, etc.
  paymentNotes     String?    // Any additional notes about the payment
}

model Payment {
  id              String   @id @default(cuid())
  invoiceId       String
  invoice         Invoice  @relation(fields: [invoiceId], references: [id])
  amount          Float
  paymentDate     DateTime
  paymentMethod   String   // "venmo" | "zelle" | "check" | "cash" | "bank_transfer" | "other"
  reference       String?  // Check #, confirmation code, etc.
  notes           String?
  createdAt       DateTime @default(now())
  createdById     String?
  createdBy       User?    @relation(fields: [createdById], references: [id])
}
```

**Note:** The `Payment` model allows for partial payments and payment history. An invoice can have multiple payments.

#### UI Changes

**Mark Invoice Paid Dialog:**
```
┌─────────────────────────────────────────────────┐
│ Record Payment                                   │
├─────────────────────────────────────────────────┤
│ Invoice: INV-2026-001                           │
│ Amount Due: $150.00                             │
│                                                 │
│ Payment Amount: [$150.00        ]               │
│   ☐ Partial payment                             │
│                                                 │
│ Payment Method:                                 │
│   ○ Venmo    ○ Zelle    ○ Check                │
│   ○ Cash     ○ Bank Transfer    ○ Other        │
│                                                 │
│ Reference (optional):                           │
│   [Check #1234 / Venmo @username / etc.    ]   │
│                                                 │
│ Payment Date: [01/10/2026]                      │
│                                                 │
│ Notes (optional):                               │
│   [_______________________________________]    │
│                                                 │
│              [Cancel]  [Record Payment]         │
└─────────────────────────────────────────────────┘
```

#### API Changes

**POST /api/invoices/[id]/payment**
```typescript
interface RecordPaymentRequest {
  amount: number
  paymentMethod: 'venmo' | 'zelle' | 'check' | 'cash' | 'bank_transfer' | 'other'
  reference?: string
  paymentDate?: string // ISO date, defaults to now
  notes?: string
}

// Response
interface RecordPaymentResponse {
  payment: Payment
  invoice: Invoice // Updated invoice with new status
  remainingBalance: number
}
```

**Logic:**
- If `amount >= invoice.total - previousPayments`, mark invoice as "paid"
- If `amount < remaining`, mark invoice as "partial" (new status)
- Update `invoice.paidAt` when fully paid

#### Invoice Status Updates
Current: `draft` | `sent` | `paid`
New: `draft` | `sent` | `partial` | `paid`

---

## Feature 2: Accounts Receivable Dashboard

### Purpose
Show what money is owed, how long it's been outstanding, and who owes it.

### Current State
- Reports page shows "Outstanding Invoices" as a single number
- No aging breakdown
- No per-owner view

### Proposed Changes

#### New Page: `/reports/accounts-receivable`

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Accounts Receivable                              [Export CSV]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Current  │  │ 1-30 Days│  │ 31-60    │  │ 60+ Days │       │
│  │ $1,200   │  │ $450     │  │ $300     │  │ $150     │       │
│  │ 8 inv    │  │ 3 inv    │  │ 2 inv    │  │ 1 inv    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  Total Outstanding: $2,100 across 14 invoices                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ By Owner                                          [Expand All]  │
├─────────────────────────────────────────────────────────────────┤
│ ▼ Smith Family Properties                         $750 (3 inv) │
│   ├─ INV-2026-012  Beach House      $300   12 days   [View]    │
│   ├─ INV-2026-008  Downtown Condo   $250   25 days   [View]    │
│   └─ INV-2026-003  Lake Cabin       $200   45 days ⚠️ [View]   │
│                                                                 │
│ ▶ Johnson Rentals                                 $600 (4 inv) │
│ ▶ Coastal Properties LLC                          $450 (3 inv) │
│ ▶ Individual Owners (no company)                  $300 (4 inv) │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ All Outstanding Invoices                    Sort: [Days Out ▼] │
├─────────────────────────────────────────────────────────────────┤
│ Invoice      Property           Owner        Amount  Days  Stat│
│ INV-2026-003 Lake Cabin         Smith        $200    45   ⚠️   │
│ INV-2026-005 Beachfront Villa   Johnson      $175    38        │
│ INV-2026-008 Downtown Condo     Smith        $250    25        │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

#### API Endpoint

**GET /api/reports/accounts-receivable**
```typescript
interface ARResponse {
  summary: {
    totalOutstanding: number
    invoiceCount: number
    aging: {
      current: { amount: number; count: number }      // 0-7 days
      days1to30: { amount: number; count: number }
      days31to60: { amount: number; count: number }
      days60plus: { amount: number; count: number }
    }
  }
  byOwner: Array<{
    ownerId: string | null
    ownerName: string
    totalOutstanding: number
    invoiceCount: number
    invoices: Array<{
      id: string
      invoiceNumber: string
      propertyName: string
      amount: number
      daysOutstanding: number
      sentAt: string
    }>
  }>
  allInvoices: Array<{
    id: string
    invoiceNumber: string
    propertyId: string
    propertyName: string
    ownerId: string | null
    ownerName: string
    total: number
    amountPaid: number
    amountDue: number
    sentAt: string
    daysOutstanding: number
  }>
}
```

#### Calculation Logic
```typescript
// Days outstanding = today - invoice.sentAt
// Only include invoices where status = 'sent' or status = 'partial'

const aging = {
  current: invoices.filter(i => daysOut <= 7),
  days1to30: invoices.filter(i => daysOut > 7 && daysOut <= 30),
  days31to60: invoices.filter(i => daysOut > 30 && daysOut <= 60),
  days60plus: invoices.filter(i => daysOut > 60)
}
```

---

## Feature 3: Profit & Loss Statement

### Purpose
Answer the question: "How much money am I actually making?"

### Current State
- Dashboard shows Revenue and Team Earnings
- "Business Margin" = Revenue - Team Earnings (based on expensePercent)
- No actual expense tracking beyond the percentage

### Proposed Changes

#### Approach: Hybrid Model

Keep the simple `expensePercent` calculation as the primary method (it works well for this business), but add optional actual expense tracking for those who want more detail.

#### Schema Updates

```prisma
model Expense {
  id          String   @id @default(cuid())
  date        DateTime
  category    String   // "supplies" | "equipment" | "mileage" | "insurance" | "other"
  description String
  amount      Float
  vendor      String?  // Where purchased
  receipt     String?  // URL to receipt image (Vercel Blob)
  propertyId  String?  // Optional - if expense is property-specific
  property    Property? @relation(fields: [propertyId], references: [id])
  jobId       String?  // Optional - if expense is job-specific
  job         Job?     @relation(fields: [jobId], references: [id])
  notes       String?
  createdAt   DateTime @default(now())
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
}

// Predefined expense categories
enum ExpenseCategory {
  supplies      // Cleaning supplies, paper products
  equipment     // Vacuums, mops, tools
  mileage       // Travel costs (can auto-calculate at IRS rate)
  insurance     // Business insurance
  subscriptions // Software, services
  other         // Catch-all
}
```

#### New Page: `/expenses`

**Expense List View:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Expenses                                    [+ Add Expense]     │
├─────────────────────────────────────────────────────────────────┤
│ Period: [This Month ▼]                      Total: $342.50      │
├─────────────────────────────────────────────────────────────────┤
│ Date       Category     Description              Amount   Prop  │
│ 01/08/26   Supplies     Cleaning products        $45.00   -     │
│ 01/05/26   Mileage      Beach properties (32mi)  $22.40   -     │
│ 01/03/26   Equipment    Replacement mop heads    $28.00   -     │
│ 01/02/26   Supplies     Trash bags bulk          $35.00   -     │
│ ...                                                             │
├─────────────────────────────────────────────────────────────────┤
│ By Category This Month:                                         │
│   Supplies: $156.00  │  Equipment: $78.00  │  Mileage: $108.50 │
└─────────────────────────────────────────────────────────────────┘
```

**Add Expense Dialog:**
```
┌─────────────────────────────────────────────────┐
│ Add Expense                                      │
├─────────────────────────────────────────────────┤
│ Date: [01/10/2026]                              │
│                                                 │
│ Category:                                       │
│   ○ Supplies    ○ Equipment    ○ Mileage       │
│   ○ Insurance   ○ Subscriptions ○ Other        │
│                                                 │
│ Amount: [$45.00]                                │
│                                                 │
│ Description: [Cleaning products - Costco    ]   │
│                                                 │
│ Vendor (optional): [Costco                  ]   │
│                                                 │
│ Property (optional): [-- General Business --▼]  │
│                                                 │
│ Receipt: [Upload Image]                         │
│                                                 │
│              [Cancel]  [Save Expense]           │
└─────────────────────────────────────────────────┘
```

**Mileage Helper:**
When category is "Mileage", show:
```
│ Miles driven: [32]                              │
│ Rate: $0.70/mile (2026 IRS rate)               │
│ Calculated amount: $22.40                       │
```

#### P&L Report Page: `/reports/profit-loss`

```
┌─────────────────────────────────────────────────────────────────┐
│ Profit & Loss Statement                         [Export PDF]    │
├─────────────────────────────────────────────────────────────────┤
│ Period: [This Month ▼]  Jan 1, 2026 - Jan 31, 2026             │
│                                                                 │
│ ═══════════════════════════════════════════════════════════════│
│ REVENUE                                                         │
│ ───────────────────────────────────────────────────────────────│
│   Cleaning Services (42 jobs)                      $6,300.00   │
│   Additional Charges (supplies, etc.)                $125.00   │
│                                                    ──────────  │
│   TOTAL REVENUE                                    $6,425.00   │
│                                                                 │
│ ═══════════════════════════════════════════════════════════════│
│ COST OF SERVICES                                                │
│ ───────────────────────────────────────────────────────────────│
│   Team Payments (labor)                            $5,654.00   │
│                                                    ──────────  │
│   GROSS PROFIT                                       $771.00   │
│   Gross Margin                                         12.0%   │
│                                                                 │
│ ═══════════════════════════════════════════════════════════════│
│ OPERATING EXPENSES                                              │
│ ───────────────────────────────────────────────────────────────│
│   Supplies                                           $156.00   │
│   Equipment                                           $78.00   │
│   Mileage                                            $108.50   │
│   Insurance                                            $0.00   │
│   Other                                                $0.00   │
│                                                    ──────────  │
│   TOTAL EXPENSES                                     $342.50   │
│                                                                 │
│ ═══════════════════════════════════════════════════════════════│
│ NET PROFIT                                           $428.50   │
│ Net Margin                                             6.7%    │
│ ═══════════════════════════════════════════════════════════════│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 📊 Comparison to Last Month                                 ││
│ │    Revenue: +8.2%  │  Expenses: -12%  │  Net Profit: +22%  ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

#### API Endpoint

**GET /api/reports/profit-loss?period=this_month**
```typescript
interface PLResponse {
  period: {
    start: string
    end: string
    label: string
  }
  revenue: {
    services: number      // Sum of job rates
    additionalCharges: number  // Non-job invoice line items
    total: number
  }
  costOfServices: {
    teamPayments: number  // Sum of worker earnings
  }
  grossProfit: number     // revenue.total - costOfServices.teamPayments
  grossMargin: number     // grossProfit / revenue.total * 100
  expenses: {
    supplies: number
    equipment: number
    mileage: number
    insurance: number
    subscriptions: number
    other: number
    total: number
  }
  netProfit: number       // grossProfit - expenses.total
  netMargin: number       // netProfit / revenue.total * 100
  comparison?: {
    previousPeriod: string
    revenueChange: number     // Percentage
    expensesChange: number
    netProfitChange: number
  }
}
```

---

## Feature 4: Batch Worker Payment Processing

### Purpose
Pay multiple workers at once instead of clicking through each job assignment individually.

### Current State
- Admin goes to `/team/[id]/pay` for each worker
- Clicks individual jobs to mark as paid
- No bulk selection, no payment run concept

### Proposed Changes

#### New Page: `/team/payments`

**Payment Run View:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Team Payments                              [Start Payment Run]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Unpaid Earnings Summary                                         │
│ ┌──────────────────────────────────────────────────────────────┐
│ │ Total Unpaid: $1,245.00 across 8 workers, 23 jobs           │
│ └──────────────────────────────────────────────────────────────┘
│                                                                 │
│ ☑ Select All Unpaid                                            │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────────┐
│ │ ☑ Maria Garcia                                    $320.00   │
│ │   ├─ ☑ 01/08 Beach House           $88.00                   │
│ │   ├─ ☑ 01/07 Downtown Condo        $66.00                   │
│ │   ├─ ☑ 01/06 Lake Cabin            $88.00                   │
│ │   └─ ☑ 01/05 Beachfront Villa      $78.00                   │
│ │                                                              │
│ │ ☑ James Wilson                                    $245.00   │
│ │   ├─ ☑ 01/08 Beach House           $88.00                   │
│ │   ├─ ☑ 01/07 Mountain Retreat      $72.00                   │
│ │   └─ ☑ 01/04 Lakefront Property    $85.00                   │
│ │                                                              │
│ │ ☐ Sarah Johnson (on hold - see note)              $180.00   │
│ │   └─ Note: Waiting for damage assessment                    │
│ └──────────────────────────────────────────────────────────────┘
│                                                                 │
│ Selected: 7 workers, 19 jobs, $1,065.00                        │
│                                                                 │
│                    [Cancel]  [Process Payment Run]              │
└─────────────────────────────────────────────────────────────────┘
```

**Payment Run Confirmation:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Confirm Payment Run                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ You are about to mark the following as paid:                   │
│                                                                 │
│   Maria Garcia      $320.00   (4 jobs)                         │
│   James Wilson      $245.00   (3 jobs)                         │
│   ... (5 more)                                                  │
│   ────────────────────────────                                 │
│   TOTAL             $1,065.00 (19 jobs)                        │
│                                                                 │
│ Payment Date: [01/10/2026]                                     │
│                                                                 │
│ Payment Method:                                                 │
│   ○ Venmo    ○ Zelle    ○ Check    ○ Cash    ○ Mixed          │
│                                                                 │
│ Notes (optional):                                               │
│   [Pay period 01/01 - 01/10                              ]     │
│                                                                 │
│              [Cancel]  [Confirm & Mark Paid]                    │
└─────────────────────────────────────────────────────────────────┘
```

#### Schema Updates

```prisma
model PaymentRun {
  id            String   @id @default(cuid())
  runDate       DateTime
  totalAmount   Float
  workerCount   Int
  jobCount      Int
  paymentMethod String?  // "venmo" | "zelle" | "check" | "cash" | "mixed"
  notes         String?
  createdAt     DateTime @default(now())
  createdById   String
  createdBy     User     @relation(fields: [createdById], references: [id])

  // Individual payments in this run
  payments      WorkerPayment[]
}

model WorkerPayment {
  id            String     @id @default(cuid())
  paymentRunId  String
  paymentRun    PaymentRun @relation(fields: [paymentRunId], references: [id])
  teamMemberId  String
  teamMember    TeamMember @relation(fields: [teamMemberId], references: [id])
  amount        Float
  jobCount      Int

  // Links to the job assignments paid
  assignments   JobAssignment[] @relation("PaymentAssignments")
}
```

#### API Endpoints

**GET /api/team/unpaid-summary**
```typescript
interface UnpaidSummaryResponse {
  totalUnpaid: number
  workerCount: number
  jobCount: number
  workers: Array<{
    id: string
    name: string
    totalUnpaid: number
    assignments: Array<{
      id: string
      jobId: string
      jobDate: string
      propertyName: string
      amount: number
    }>
  }>
}
```

**POST /api/team/payment-run**
```typescript
interface PaymentRunRequest {
  assignmentIds: string[]  // All assignments to mark paid
  paymentDate?: string
  paymentMethod?: string
  notes?: string
}

interface PaymentRunResponse {
  paymentRun: PaymentRun
  summary: {
    totalPaid: number
    workerCount: number
    jobCount: number
  }
}
```

#### Export Feature

After a payment run, offer:
- **PDF Summary** - For records
- **CSV Export** - For accounting/payroll
  ```csv
  Worker Name,Worker Email,Amount,Job Count,Payment Date,Payment Method
  Maria Garcia,maria@email.com,320.00,4,2026-01-10,Venmo
  James Wilson,james@email.com,245.00,3,2026-01-10,Zelle
  ```

---

## Feature 5: Monthly Invoice Automation

### Purpose
Automatically generate invoices for properties on monthly billing.

### Current State
- Properties can be set to `billingType: "monthly"` and `monthlyBillingDay`
- No automation exists - invoices must be created manually

### Proposed Changes

#### Approach: Semi-Automated with Review

Full automation is risky (what if jobs are missing or disputed?). Instead:
1. System identifies properties due for monthly invoicing
2. Creates draft invoices automatically
3. Admin reviews and sends (one-click to send all, or review individually)

#### New Page: `/invoices/monthly-billing`

```
┌─────────────────────────────────────────────────────────────────┐
│ Monthly Billing                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ January 2026 Billing Cycle                                      │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Ready to Invoice (12 properties)              [Generate All]││
│ ├─────────────────────────────────────────────────────────────┤│
│ │ Property              Owner           Jobs    Amount   Act  ││
│ │ Beach House           Smith           4       $600    [Gen] ││
│ │ Downtown Condo        Smith           4       $520    [Gen] ││
│ │ Lake Cabin            Johnson         3       $450    [Gen] ││
│ │ ...                                                         ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Draft Invoices (5 waiting for review)          [Send All]   ││
│ ├─────────────────────────────────────────────────────────────┤│
│ │ Invoice         Property           Amount   Status    Act   ││
│ │ INV-2026-015   Beachfront Villa   $675    Draft    [Review]││
│ │ INV-2026-014   Mountain Retreat   $520    Draft    [Review]││
│ │ ...                                                         ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Already Invoiced This Month (8 properties)                  ││
│ │ Total: $4,250 across 8 invoices (6 sent, 2 paid)           ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Settings: `/settings/billing`

```
┌─────────────────────────────────────────────────────────────────┐
│ Billing Settings                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Monthly Billing Automation                                      │
│ ───────────────────────────────────────────────────────────────│
│                                                                 │
│ ☑ Enable monthly billing reminders                             │
│   Show notification when properties are due for invoicing      │
│                                                                 │
│ ☐ Auto-generate draft invoices                                 │
│   Automatically create draft invoices on billing day           │
│   (You'll still review before sending)                         │
│                                                                 │
│ ☐ Auto-send invoices (not recommended)                         │
│   Automatically send invoices without review                   │
│   ⚠️ Use with caution - no opportunity to catch errors         │
│                                                                 │
│ Default Payment Terms: [Net 15 ▼]                              │
│                                                                 │
│ Invoice Email Template: [Edit Template]                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### API Endpoints

**GET /api/invoices/monthly-billing-status**
```typescript
interface MonthlyBillingStatusResponse {
  currentMonth: string  // "January 2026"
  readyToInvoice: Array<{
    propertyId: string
    propertyName: string
    ownerName: string
    billingDay: number
    unbilledJobs: number
    unbilledAmount: number
    lastInvoiceDate: string | null
  }>
  draftInvoices: Array<{
    invoiceId: string
    invoiceNumber: string
    propertyName: string
    amount: number
    jobCount: number
    createdAt: string
  }>
  sentThisMonth: {
    count: number
    totalAmount: number
  }
  paidThisMonth: {
    count: number
    totalAmount: number
  }
}
```

**POST /api/invoices/generate-monthly**
```typescript
interface GenerateMonthlyRequest {
  propertyIds: string[]  // Properties to generate invoices for
  billingPeriod: string  // "January 2026"
}

interface GenerateMonthlyResponse {
  generated: Array<{
    invoiceId: string
    invoiceNumber: string
    propertyName: string
    amount: number
  }>
  skipped: Array<{
    propertyId: string
    propertyName: string
    reason: string  // "No unbilled jobs", "Already invoiced", etc.
  }>
}
```

---

## Feature 6: Year-End Export for Accountant

### Purpose
Generate clean exports for annual tax preparation.

### New Page: `/reports/year-end`

```
┌─────────────────────────────────────────────────────────────────┐
│ Year-End Reports                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Tax Year: [2025 ▼]                                             │
│                                                                 │
│ ═══════════════════════════════════════════════════════════════│
│ INCOME REPORTS                                                  │
│ ───────────────────────────────────────────────────────────────│
│                                                                 │
│ 📄 Annual Revenue Summary                          [Export PDF] │
│    Total invoiced, by month and by property                    │
│                                                                 │
│ 📊 Revenue by Property                             [Export CSV] │
│    Detailed breakdown for each property                        │
│                                                                 │
│ 📊 Revenue by Owner                                [Export CSV] │
│    Grouped by property owner                                   │
│                                                                 │
│ ═══════════════════════════════════════════════════════════════│
│ EXPENSE REPORTS                                                 │
│ ───────────────────────────────────────────────────────────────│
│                                                                 │
│ 📄 Annual Expense Summary                          [Export PDF] │
│    Total expenses by category                                  │
│                                                                 │
│ 📊 Expense Detail                                  [Export CSV] │
│    All expenses with dates, categories, vendors                │
│                                                                 │
│ 📊 Mileage Log                                     [Export CSV] │
│    All mileage entries for IRS deduction                       │
│                                                                 │
│ ═══════════════════════════════════════════════════════════════│
│ CONTRACTOR PAYMENTS (for 1099s)                                │
│ ───────────────────────────────────────────────────────────────│
│                                                                 │
│ 📊 Contractor Payment Summary                      [Export CSV] │
│    Total paid to each worker (needed for 1099-NEC if >$600)   │
│                                                                 │
│    Worker Name          Total Paid    Needs 1099?              │
│    Maria Garcia         $12,450.00    ✓ Yes                    │
│    James Wilson         $8,320.00     ✓ Yes                    │
│    Sarah Johnson        $4,180.00     ✓ Yes                    │
│    Tom Brown            $520.00       ✗ No (<$600)             │
│                                                                 │
│ ═══════════════════════════════════════════════════════════════│
│ COMPLETE PACKAGE                                                │
│ ───────────────────────────────────────────────────────────────│
│                                                                 │
│ 📦 Download All Reports (ZIP)                      [Download]   │
│    Everything your accountant needs in one file               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Contractor Payment Report Format (CSV)
```csv
Worker Name,Worker Email,Worker Phone,Total Jobs,Total Paid,Address,Tax ID
Maria Garcia,maria@email.com,555-0101,142,$12450.00,,
James Wilson,james@email.com,555-0102,98,$8320.00,,
```

**Note:** Tax ID and Address fields would require adding these to TeamMember model:
```prisma
model TeamMember {
  // ... existing fields ...

  // Tax information (for 1099)
  taxId           String?   // SSN or EIN (encrypted)
  taxAddress      String?   // Mailing address for 1099
  taxCity         String?
  taxState        String?
  taxZip          String?
}
```

---

## Feature 7: Dashboard Enhancements

### Current Dashboard Gaps
- No AR aging visibility
- No expense tracking
- No monthly trends at a glance

### Proposed Additions to Dashboard

**New Cards:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [Existing cards: Revenue, Pending Payments, Today's Jobs, etc.]│
│                                                                 │
│ ───────────────────────────────────────────────────────────────│
│ NEW: Accounts Receivable Snapshot                              │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│ │ Outstanding  │ │ Overdue      │ │ Avg Days to  │            │
│ │ $2,100       │ │ $450 (3 inv) │ │ Payment: 18  │            │
│ │ 14 invoices  │ │ >30 days     │ │              │            │
│ └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│ ───────────────────────────────────────────────────────────────│
│ NEW: This Month at a Glance                                    │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Revenue      $6,425    Team Costs    $5,654                 ││
│ │ Expenses       $343    Net Profit      $428                 ││
│ │                                                             ││
│ │ [============================--------] 67% of month done    ││
│ │ Projected month-end: $9,590 revenue                         ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ───────────────────────────────────────────────────────────────│
│ NEW: Action Items                                               │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ ⚠️ 3 invoices overdue (>30 days) - $450 total      [View]  ││
│ │ 📋 12 properties ready for monthly invoicing       [Review]││
│ │ 💰 $1,065 in unpaid worker earnings               [Pay]    ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

### Phase 1: Core Financial Visibility (Recommended First)
1. **Payment Recording with Method Tracking** - Quick win, immediate value
2. **Accounts Receivable Dashboard** - See who owes money
3. **Dashboard Enhancements** - Surface key metrics

### Phase 2: Operational Efficiency
4. **Batch Worker Payment Processing** - Save time paying workers
5. **Expense Tracking + P&L** - See actual profitability

### Phase 3: Automation & Reporting
6. **Monthly Invoice Automation** - Reduce monthly admin work
7. **Year-End Export** - Make tax time easy

---

## Technical Notes

### Database Migrations
Each feature requiring schema changes will need:
1. Prisma schema update
2. Migration file: `npx prisma migrate dev --name feature_name`
3. Type regeneration: `npx prisma generate`

### Existing Code to Modify
- `/src/app/(admin)/dashboard/page.tsx` - Add new cards
- `/src/app/(admin)/reports/page.tsx` - Add navigation to new reports
- `/src/app/api/invoices/[id]/route.ts` - Add payment recording
- `/src/app/api/team/mark-paid/route.ts` - Extend for batch payments

### New Files to Create
- `/src/app/(admin)/reports/accounts-receivable/page.tsx`
- `/src/app/(admin)/reports/profit-loss/page.tsx`
- `/src/app/(admin)/reports/year-end/page.tsx`
- `/src/app/(admin)/expenses/page.tsx`
- `/src/app/(admin)/team/payments/page.tsx`
- `/src/app/(admin)/invoices/monthly-billing/page.tsx`
- `/src/app/(admin)/settings/billing/page.tsx`
- Corresponding API routes for each

### UI Components Needed
- Payment method selector (reusable)
- Date range picker enhancement
- Expandable list component (for AR by owner)
- Export button component (PDF, CSV)
- Checkbox tree component (for batch selection)

---

## Questions for Business Owner

Before implementation, clarify:

1. **Payment terms** - What's the default? Net 15, Net 30, Due on Receipt?
2. **Overdue threshold** - When is an invoice considered "overdue"? 30 days after sent?
3. **Worker payment frequency** - Weekly? Bi-weekly? After each job?
4. **Expense categories** - Are the proposed categories sufficient? Any to add?
5. **Mileage tracking** - Is this needed? If so, IRS standard rate or actual costs?
6. **1099 preparation** - Do workers currently receive 1099s? Need tax ID collection?
