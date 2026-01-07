# Cleaning Right Now - Complete Implementation Specification

## Overview

Business management application for short-term rental cleaning business. Desktop command center for administration, mobile-optimized views for field operations with role-based access.

---

## Database Schema (Prisma)

Schema models are defined in `prisma/schema.prisma`.

---

## Feature Specifications

### 1. Dashboard (Desktop)

**Summary Cards:**
- Monthly Revenue (completed jobs)
- Pending from Clients (sent invoices unpaid)
- Owed to Team (sum of unpaid worker earnings)
- Draft Invoices (count, clickable to invoices section)
- Low Stock Items (count of items below 2x target)

**Today's Jobs Panel:**
- List of jobs for current date
- Show: time, property, assigned workers, rate, per-person split
- Color-coded by source (Turno=purple, Google=green, Manual=gray)

**Team Balances Panel:**
- Each team member with total owed
- Quick "Pay" button per member
- "Pay All" action

**Property Alerts Panel:**
- Active notes grouped by property
- Show note type icon and content preview
- Click to navigate to property

---

### 2. Calendar (Desktop)

**Monthly View:**
- Grid layout showing jobs on each day
- Color-coded by calendar source
- Click job to edit
- Click day to add job

**Controls:**
- Month navigation (prev/next)
- "Sync Calendars" button (pulls from Turno iCal, Google)
- "Add Job" button
- Legend showing source colors

**Job Display:**
- Time, property name
- Worker initials
- Hover for full details

---

### 3. Jobs & Payments (Desktop)

**Summary Bar:**
- Month/year selector
- Total revenue
- Job count
- 12% expense total
- Team split total

**Jobs Table:**
| Column | Content |
|--------|---------|
| Date | Date + time |
| Property | Name with source indicator |
| Rate | Dollar amount |
| Team | Worker badges (checkboxes in edit mode) |
| Per Person | Calculated: (rate × 0.88) / worker count |
| Status | Pending / Completed |
| Client Paid | Checkbox |
| Team Paid | Checkbox |
| Actions | Edit, Delete, Create Invoice |

**Payment Calculation:**
```
expense = rate × 0.12
teamTotal = rate - expense
perPerson = teamTotal / workerCount
```

**Actions:**
- Add Job
- Export CSV
- Filter by date range, property, status

---

### 4. Properties (Desktop)

**Property Cards:**
- Name with calendar source badge
- Billing type badge (Per Job / Monthly)
- Address
- Base rate
- Owner name, phone, email
- Active notes preview (if any)
- Quick actions: View Linens, Job History, Edit

**Property Detail/Edit:**
- All property fields
- Billing configuration (type, day, auto-send)
- Standing instructions (add/edit/delete)
- Link to linen requirements
- Link to property notes
- Link to reference photos

---

### 5. Team (Desktop)

**Team Member Cards:**
- Avatar (initial)
- Name, phone, email
- Role badge (Admin/Worker)
- Total owed
- Pay Now button
- View History

**Add/Edit Member:**
- Name, email, phone
- Role selection
- Active/Inactive toggle

**Payment History:**
- Date paid
- Amount
- Jobs included

---

### 6. Linen Inventory (Desktop)

**Matrix View (default):**
- Rows: Linen items grouped by category
- Columns: Properties
- Cells: Target (2×perFlip) | On Hand | Status

**Status Indicators:**
- Green/OK: onHand >= target
- Red/deficit: Shows negative number (target - onHand)

**Actions:**
- Update counts (opens property selector, then item list)
- View shopping list
- Export

**Shopping List View:**
- Auto-calculated from deficits
- Grouped by property or by item
- Shows: Item, Property, Qty Needed, Unit Cost, Total
- Grand total at bottom

**Per-Flip Requirements View:**
- Edit mode for setting requirements per property
- Blue cells = editable inputs

---

### 7. Invoicing (Desktop)

**Invoice List:**
- Automation status banner (which properties bill how)
- Draft alert banner (if drafts pending review)
- Filter tabs: All, Draft, Sent, Paid
- Table with columns: Invoice#, Property/Owner, Type, Date, Amount, Status, Actions

**Invoice Editor (Review Screen):**

**Header Section:**
- "INVOICE" title with number
- Draft badge
- Business info (right side)

**Bill To Section:**
- Owner name, property, email
- Invoice date (editable)
- Billing period (if monthly)
- Payment terms dropdown:
  - Due upon receipt (default)
  - Net 7
  - Net 15
  - Net 30

**Line Items Section:**
- Table: Date | Description | Amount | Actions
- Job-linked items show "Job #X" badge
- Editable: date, description, amount
- Modified job amounts show sync warning
- Add Item button

**Add Item Modal:**
- Preset categories:
  - Services: Turnover Cleaning, Deep Clean, Laundry Service, Emergency/After-Hours
  - Supplies: Cleaning Supplies, Linen Replacement
  - Expenses: Mileage
  - Other: Miscellaneous
- Saved custom items (user-created)
- Create custom item (with option to save for reuse)

**Notes Section:**
- Textarea for client-visible notes
- Placeholder: "Add any notes for the client..."

**Footer:**
- "Thank you for your business!"
- Payment terms display

**Sidebar:**
- Invoice settings (terms, date)
- Auto-sync info box
- Saved custom items quick-add

**Actions:**
- Save Draft
- Download PDF
- Send Invoice

**Sync Behavior:**
When job-linked amounts are modified:
1. Show warning badge "X job amount(s) modified"
2. On Send, show confirmation modal
3. List what will sync: Job records, Team payments, Reports
4. "Sync & Send" confirms and updates all related records

---

### 8. Property Notes (Desktop)

**Summary Cards:**
- Active Notes count
- Open Issues count
- Properties with Notes count
- Resolved This Week count

**Filters:**
- Status: All / Active / Resolved
- Property dropdown
- Type dropdown (Issue, Reminder, Owner Request, Info)

**Add Note Button:**
- Modal with: Property selector, Type selector, Content textarea

**Notes Timeline:**
- Reverse chronological (newest first)
- Each note shows:
  - Type icon with color
  - Property name
  - Type badge
  - Resolved badge (if applicable)
  - Content
  - Date, time, added by
  - Resolve button (for active notes)
  - Edit button

**Note Types:**
| Type | Color | Icon | Use Case |
|------|-------|------|----------|
| issue | Red | AlertCircle | Problems needing attention |
| reminder | Amber | Bell | Things to remember |
| owner_request | Purple | User | Owner preferences |
| info | Blue | Info | General information |

---

### 9. Reports (Desktop)

**Report Cards (click to generate):**
- Monthly Summary: Revenue, expenses, team payments
- Team Earnings: Per-worker breakdown
- Property Report: Revenue by property
- Tax Export: CSV download for accountant
- Linen Costs: Replacement spending
- Invoice Aging: Outstanding payments

---

### 10. Settings (Desktop)

**Calendar Integrations:**
- Turno iCal URL input
- Google Calendar connection status
- Sync frequency

**Business Settings:**
- Expense percentage (default 12%)
- Default payment terms
- Linen target multiplier (default 2×)
- Business name/address for invoices

**Team Access:**
- Explanation of worker access limitations
- Invite team member button

---

## Mobile Specifications

### Admin Mobile

Full access, simplified layout. Same data as desktop.

**Bottom Navigation:**
- Home (dashboard summary)
- Jobs (today's jobs, quick complete)
- Team (balances, quick pay)
- More (linens, properties, invoices, reports, settings)

**Key Screens:**
- Dashboard with today's jobs and alerts
- Job list with complete/payment toggles
- Team list with pay buttons
- Menu for other features

---

### Worker Mobile

**Restricted access - NO financial data visible**

**Bottom Navigation:**
- Today (today's assigned jobs)
- Schedule (upcoming jobs)
- Reference (property reference guide)
- Account (profile, sign out)

**Today Screen:**
- Count of today's jobs
- Job cards showing: Property, Time, Teammates
- Tap for job detail

**Job Detail Screen:**
- Property name and address
- Date/time
- Navigate button (opens maps)
- Call button (owner phone)
- "Working With" - teammate list
- Property Reference button (quick link)
- Active notes warning (if any)
- Take Photos button
- Add Note button
- Mark Complete button

**Reference Screen:**
Property list → Property detail with tabs:

| Tab | Content |
|-----|---------|
| Stocking | Per-flip requirements grouped by category (Sheets, Bedding, Pillows, Towels) with quantities |
| Photos | Room-by-room photo gallery with captions showing how things should look |
| Notes | Active notes/issues for this property |
| Info | Address, owner contact, standing instructions, access codes |

**Workers CAN:**
- See their assigned jobs
- See property addresses and access codes
- See stocking requirements
- See reference photos
- See active notes
- Add new notes (reports issues)
- Add photos
- Mark jobs complete

**Workers CANNOT see:**
- Job rates or amounts
- Invoice information
- Team payment amounts
- Business financials
- Other workers' schedules
- Admin settings

---

## API Endpoints Needed

```
// Jobs
GET    /api/jobs
GET    /api/jobs/today
GET    /api/jobs/:id
POST   /api/jobs
PUT    /api/jobs/:id
DELETE /api/jobs/:id
POST   /api/jobs/:id/complete
POST   /api/jobs/:id/sync-calendars

// Invoices
GET    /api/invoices
GET    /api/invoices/:id
POST   /api/invoices
PUT    /api/invoices/:id
POST   /api/invoices/:id/send
POST   /api/invoices/:id/mark-paid
POST   /api/invoices/generate-monthly

// Properties
GET    /api/properties
GET    /api/properties/:id
POST   /api/properties
PUT    /api/properties/:id
DELETE /api/properties/:id

// Property Notes
GET    /api/properties/:id/notes
POST   /api/properties/:id/notes
PUT    /api/notes/:id
POST   /api/notes/:id/resolve

// Property Photos
GET    /api/properties/:id/photos
POST   /api/properties/:id/photos
DELETE /api/photos/:id

// Property Instructions
GET    /api/properties/:id/instructions
POST   /api/properties/:id/instructions
PUT    /api/instructions/:id
DELETE /api/instructions/:id

// Linen Inventory
GET    /api/linens
GET    /api/linens/categories
GET    /api/properties/:id/linens
PUT    /api/properties/:id/linens/:linenId
GET    /api/linens/shopping-list

// Team
GET    /api/team
GET    /api/team/:id
POST   /api/team
PUT    /api/team/:id
GET    /api/team/:id/payments
POST   /api/team/:id/pay

// Auth (Worker access)
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout

// Reports
GET    /api/reports/monthly-summary
GET    /api/reports/team-earnings
GET    /api/reports/property-revenue
GET    /api/reports/tax-export
```

---

## Implementation Priority

**Phase 1 - Core:**
1. Database schema + migrations
2. Properties CRUD
3. Jobs CRUD with calendar view
4. Team CRUD
5. Basic dashboard

**Phase 2 - Payments:**
6. Job payment calculations
7. Invoice generation (per-job)
8. Invoice editor with custom items
9. Invoice send/mark paid

**Phase 3 - Linens:**
10. Linen categories and items
11. Per-property requirements
12. Inventory tracking
13. Shopping list generation

**Phase 4 - Notes & Reference:**
14. Property notes timeline
15. Standing instructions
16. Photo uploads
17. Worker reference view

**Phase 5 - Mobile & Polish:**
18. Responsive mobile layouts
19. Worker role/auth
20. Calendar sync (Turno iCal)
21. Reports generation

---

## Notes for Implementation

- Use existing Next.js + Prisma + Tailwind stack
- Mobile views are responsive web, not separate app
- Role-based access via middleware checking teamMember.role
- Invoice numbers auto-increment: INV-{YEAR}-{SEQUENCE}
- All times stored in local timezone
- Photo storage: Use cloud storage (S3, Cloudinary, or Vercel Blob)
- Calendar sync: Parse iCal format, dedupe by externalId
- PDF generation: Use react-pdf or similar for invoice downloads
