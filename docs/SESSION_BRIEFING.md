# Clean Right Now - Session Briefing

This document provides context for continuing development of the Clean Right Now cleaning business management application.

---

## Application Overview

**What is this?**
A full-stack web application for managing a vacation rental cleaning business. Built for a small operation (~40 properties, <10 workers).

**Tech Stack:**
- Next.js 14 (App Router) + TypeScript
- PostgreSQL + Prisma ORM (hosted on Neon)
- NextAuth for authentication (admin/worker roles)
- TailwindCSS + custom UI component library
- Deployed on Vercel

**Primary Users:**
- **Admin (owner)**: Full access - manages properties, jobs, invoices, team, reports
- **Workers**: Limited access - view assigned jobs, check in/out, see property details

---

## Current State (as of January 2026)

### What's Working
- Property management with owner relationships
- Job scheduling and team assignments
- Worker check-in/check-out with time tracking
- Invoicing with PDF generation and email sending
- Payment method tracking (Venmo, Zelle, check, cash, bank transfer)
- Linen inventory tracking
- Calendar sync from iCal sources (Turno, Google, Airbnb)
- Push notifications
- Worker mobile-friendly portal

### Recent Work (This Session)
A significant code review and feature addition session was completed:

**Cleanup Done:**
- Removed dead code (unused `formatTime()` function)
- Fixed N+1 query in properties API
- Removed debug mode and excessive console.logs from production
- Deprecated legacy calendar sync route
- Fixed PrismaClient type issues

**Features Added (on branch `claude/review-project-structure-9JHQy`):**
These features are NOT yet merged to main. They include:
1. **Expense Tracking** (`/expenses`) - Track business expenses with categories, mileage calculation
2. **Team Payments Dashboard** (`/team/payments`) - Batch payment processing for workers
3. **Monthly Billing Dashboard** (`/invoices/monthly-billing`) - Monthly billing workflow
4. **Year-End Export** (`/reports/year-end`) - CSV exports for accountant, 1099 tracking
5. **AR Aging Report** - Accounts receivable aging on reports page
6. **Payment Model** - Support for partial payments on invoices
7. **Enhanced Payment Dialog** - Payment method, reference, and notes tracking

**Documentation Created:**
- `docs/ACCOUNTING_FEATURES_SPEC.md` - Detailed spec for accounting features
- `docs/TESTING_PLAYBOOK.md` - Comprehensive testing checklist

### Branch Situation
| Branch | Purpose | Status |
|--------|---------|--------|
| `main` | Production | Currently deployed, has cuWZf work |
| `claude/cleaning-business-app-cuWZf` | Wife's complete feature work | **Source of truth for current features** |
| `claude/review-project-structure-9JHQy` | Accounting features session | Has new features, NOT merged |
| `claude/review-project-structure-O910O` | Earlier cleanup session | Can be ignored |

---

## Key Files & Architecture

### Database Schema (`prisma/schema.prisma`)
22+ models including:
- `Property`, `Owner` - Property and owner management
- `Job`, `JobAssignment`, `JobSession` - Job scheduling and tracking
- `Invoice`, `InvoiceLineItem`, `Payment` - Billing
- `TeamMember`, `PerformanceRating` - Team management
- `LinenCategory`, `LinenItem`, `PropertyLinenRequirement` - Inventory
- `CalendarSource` - External calendar sync
- `Expense` - Business expense tracking (new)

### API Routes (`src/app/api/`)
RESTful APIs for all entities. Key patterns:
- GET/POST on collection routes (`/api/properties`)
- GET/PUT/DELETE on item routes (`/api/properties/[id]`)
- Auth check via `getServerSession(authOptions)`

### UI Components (`src/components/`)
- `ui/` - Reusable components (Button, Card, Input, Badge, Modal, etc.)
- `layout/` - AdminHeader, AdminSidebar, WorkerHeader
- `documents/` - InvoiceTemplate, PayStatementTemplate

### Pages
- Admin pages: `src/app/(admin)/` - properties, jobs, invoices, team, reports, etc.
- Worker pages: `src/app/worker/` - dashboard, reference, check-in, pay-statement

---

## Business Logic Notes

### Payment Flow
1. Jobs are created (manual or calendar sync)
2. Jobs are assigned to team members
3. Jobs are completed (check-in/check-out or manual)
4. Invoices are created (per-job or monthly batches)
5. Invoices are sent to owners
6. Payments are recorded (Venmo, Zelle, check, etc.)
7. Team is paid separately (tracked per assignment)

### Rate Calculation
- `baseRate` on Property = what owner pays
- `expensePercent` (default 12%) = taken off top for business expenses
- Team share = `rate * (1 - expensePercent/100)`
- If multiple workers: split evenly

### Billing Types
- `per_job` - Invoice after each job
- `monthly` - Batch invoice at end of month
- `weekly`/`biweekly` - Also supported

---

## Claude Code Efficiency Guide

### When to Start a New Session
- **Start fresh when:** Changing major context (e.g., switching from backend to frontend overhaul)
- **Start fresh when:** The conversation exceeds ~50 back-and-forth exchanges
- **Start fresh when:** You're starting a completely new feature area
- **Start fresh when:** Context feels cluttered with irrelevant history

### When to Compact (Let Auto-Summarize Work)
- **Let it auto-compact when:** Staying in the same problem domain
- **Let it auto-compact when:** Building on recent work
- **Let it auto-compact when:** Debugging an issue from earlier in session

### Best Practices for Long Projects

1. **Create Briefing Documents** (like this one)
   - At the end of significant sessions, document what was done
   - Include branch names, key decisions, gotchas discovered

2. **Use Branches Strategically**
   - One branch per feature/session
   - Name clearly: `claude/feature-name-sessionId`
   - Don't merge until tested

3. **Commit Frequently**
   - Small, focused commits with clear messages
   - Makes it easy to roll back if needed

4. **Test Before Ending Session**
   - Run the build: `npm run build`
   - Check for TypeScript/ESLint errors
   - Verify the app loads locally: `npm run dev`

5. **Document Schema Changes**
   - Schema changes are high-risk
   - Always check for data loss warnings
   - Note any `--accept-data-loss` uses

6. **Keep Tasks Focused**
   - One major feature per session
   - Resist scope creep
   - "Let's also add X" is a new session

### Common Commands
```bash
# Local development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build (catches errors)
npm run lint             # ESLint check

# Database
npx prisma studio        # Visual database browser
npx prisma db push       # Push schema changes
npx prisma generate      # Regenerate Prisma client

# Git
git status               # Check current state
git log --oneline -10    # Recent commits
git branch -a            # All branches
```

---

## Known Issues / Technical Debt

1. **ESLint Warnings** - Many `useEffect` dependency warnings (not blocking)
2. **Image Optimization** - Using `<img>` instead of Next.js `<Image>` in some places
3. **Calendar Sync** - Legacy route deprecated but still exists
4. **Console.logs** - Some may still exist in codebase (reduced but not eliminated)

---

## Recommended Next Steps

### Immediate (Before Using in Production)
1. [ ] Merge any desired features from accounting branch
2. [ ] Full UAT testing using `docs/TESTING_PLAYBOOK.md`
3. [ ] Verify all payment flows work correctly
4. [ ] Test on mobile devices (worker portal especially)

### Short Term
1. [ ] Clean up ESLint warnings
2. [ ] Add missing alt text to images
3. [ ] Consider adding automated tests for critical paths

### Future Enhancements (From Accounting Spec)
- Recurring invoice automation
- Owner portal (self-service for property owners)
- Profit/loss dashboard
- Expense receipt photo uploads
- QuickBooks export

---

## Contact / Resources

- **Vercel Dashboard**: Check deployments and logs
- **Neon Dashboard**: Database access and metrics
- **GitHub**: Source code and PR management

---

*Last updated: January 10, 2026*
*Session: claude/review-project-structure-9JHQy*
