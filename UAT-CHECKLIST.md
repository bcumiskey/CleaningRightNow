# Cleaning Right Now - Complete UAT Checklist

## Test Date: ___________
## Tester: _______________
## Build/Version: _______________

---

# 1. AUTHENTICATION & ACCESS

## 1.1 Admin Login
- [ ] Navigate to login page
- [ ] Enter valid admin credentials
- [ ] Verify redirect to admin dashboard
- [ ] Verify admin sidebar is visible with all menu items

## 1.2 Worker Login
- [ ] Navigate to worker login (/worker/login)
- [ ] Enter valid worker PIN
- [ ] Verify redirect to worker portal
- [ ] Verify worker navigation is visible

## 1.3 Session Management
- [ ] Verify session persists on page refresh
- [ ] Verify logout works correctly
- [ ] Verify protected routes redirect to login when not authenticated

## 1.4 Role-Based Access
- [ ] Admin can access all admin pages
- [ ] Workers cannot access admin pages
- [ ] Supervisors have appropriate elevated access

---

# 2. DASHBOARD

## 2.1 Admin Dashboard
- [ ] Dashboard loads without errors
- [ ] Today's jobs count is accurate
- [ ] Upcoming jobs list shows correct jobs
- [ ] Quick stats display correctly
- [ ] Recent activity shows latest updates

---

# 3. PROPERTIES

## 3.1 Property List
- [ ] Properties page loads all properties
- [ ] Search/filter works correctly
- [ ] Active/inactive filter works
- [ ] Property cards show correct information

## 3.2 Create Property
- [ ] Click "Add Property" opens modal/form
- [ ] All required fields are validated
- [ ] Property saves successfully
- [ ] New property appears in list

## 3.3 Edit Property - Details Tab
- [ ] Property name editable
- [ ] Address editable
- [ ] Owner assignment works (dropdown)
- [ ] Owner name/email/phone editable
- [ ] Base rate editable
- [ ] Expense percent editable
- [ ] Billing type dropdown works (Per Job, Bi-Weekly, Monthly)
- [ ] Invoice frequency dropdown works
- [ ] Access code editable
- [ ] Access notes editable
- [ ] Bed configuration editable
- [ ] Property photo upload works
- [ ] Calendar keywords editable
- [ ] **Calendar color picker works**
  - [ ] Custom color selection
  - [ ] Preset color buttons
  - [ ] Clear color button
- [ ] Save changes persists all data

## 3.4 Edit Property - Rooms Tab
- [ ] Room list displays correctly
- [ ] Add room button works
- [ ] Room modal has name, type, bed config
- [ ] Room card shows photo/instruction counts
- [ ] **Expand room card** (click to expand)
  - [ ] **3-column layout: Photos | Inventory | Instructions**
  - [ ] **Photos section:**
    - [ ] View existing photos
    - [ ] Upload new photo
    - [ ] Add caption to photo
    - [ ] Delete photo (hover to reveal)
  - [ ] **Inventory section:**
    - [ ] View existing linens/supplies
    - [ ] "Add Linen/Supply" button opens modal
    - [ ] Toggle between Linens and Supplies tabs
    - [ ] Select item from dropdown
    - [ ] Set quantity per flip
    - [ ] Add item to room
    - [ ] Delete item (hover to reveal)
    - [ ] "L" badge for linens, "S" badge for supplies
  - [ ] **Instructions section:**
    - [ ] View existing instructions (numbered)
    - [ ] Add new instruction (type + Enter or click +)
    - [ ] Delete instruction (hover to reveal)
- [ ] Edit room (pencil icon)
- [ ] Delete room (trash icon)

## 3.5 Edit Property - Photos Tab
- [ ] Reference photos display
- [ ] Upload new photo with room assignment
- [ ] Edit photo caption/notes
- [ ] Delete photo
- [ ] Photo lightbox/modal view

## 3.6 Edit Property - Instructions Tab
- [ ] Instructions list by room
- [ ] Add instruction with room assignment
- [ ] Edit instruction
- [ ] Delete instruction
- [ ] Link instruction to photo

## 3.7 Delete Property
- [ ] Delete button shows confirmation
- [ ] Property is removed from list
- [ ] Related jobs/data handled appropriately

---

# 4. OWNERS

## 4.1 Owner List
- [ ] Owners page loads
- [ ] Owner cards show correct info
- [ ] Property count per owner is accurate

## 4.2 Create Owner
- [ ] Add owner button works
- [ ] Name, email, phone fields work
- [ ] **Default billing type has Bi-Weekly option**
- [ ] Save creates owner

## 4.3 Edit Owner
- [ ] Edit modal opens with existing data
- [ ] All fields editable
- [ ] Changes save correctly

## 4.4 Delete Owner
- [ ] Delete confirmation appears
- [ ] Owner removed from list
- [ ] Associated properties handled

---

# 5. TEAM MEMBERS

## 5.1 Team List
- [ ] Team page loads all members
- [ ] Filter by role works
- [ ] Active/inactive filter works

## 5.2 Create Team Member
- [ ] Add member form works
- [ ] Name, email, phone, role fields
- [ ] PIN generation/entry
- [ ] Rank/supervisor settings
- [ ] Save creates member

## 5.3 Edit Team Member
- [ ] Edit loads existing data
- [ ] All fields editable
- [ ] Role change works
- [ ] Save updates member

## 5.4 Deactivate/Delete Team Member
- [ ] Deactivate toggle works
- [ ] Delete removes member

---

# 6. JOBS

## 6.1 Job List
- [ ] Jobs page loads
- [ ] Date filter works
- [ ] Status filters work (completed, paid, etc.)
- [ ] Property filter works
- [ ] Jobs display in correct order

## 6.2 Create Job
- [ ] "Schedule Job" button opens modal
- [ ] Property dropdown populated
- [ ] Date picker works
- [ ] **Priority selector works (1-10 scale)**
- [ ] Time field (optional) works
- [ ] Rate field (auto-fills from property)
- [ ] **Expense % field editable**
- [ ] Team member assignment (multi-select)
- [ ] Save creates job

## 6.3 Job Card Display
- [ ] Property name shows
- [ ] **Priority badge shows (P1, P2, etc.)**
  - [ ] Red badge for priority 1-2
  - [ ] Amber badge for priority 3-4
  - [ ] Gray badge for priority 5-6
  - [ ] Blue badge for priority 7+
- [ ] Time shows if set
- [ ] Source indicator (manual/turno/google)
- [ ] Assigned team shows
- [ ] Rate and payment breakdown shows
- [ ] Status badges correct

## 6.4 Edit Job
- [ ] Edit button opens modal
- [ ] All fields editable
- [ ] **Priority editable**
- [ ] **Expense % editable**
- [ ] Team reassignment works
- [ ] Save updates job

## 6.5 Job Status Actions
- [ ] Mark as completed
- [ ] Mark client paid
- [ ] Mark team paid
- [ ] Status timestamps recorded

## 6.6 Delete Job
- [ ] Delete confirmation
- [ ] Job removed from list

---

# 7. RECURRING SCHEDULES

## 7.1 Schedule List
- [ ] Schedules tab shows all schedules
- [ ] Active/paused indicator

## 7.2 Create Schedule
- [ ] Add schedule button works
- [ ] Name field
- [ ] Property selection
- [ ] Frequency (daily, weekly, biweekly, monthly)
- [ ] Day of week (for weekly)
- [ ] Day of month (for monthly)
- [ ] Time field
- [ ] Rate override
- [ ] Expense percent
- [ ] Generate ahead days

## 7.3 Edit Schedule
- [ ] Edit loads existing data
- [ ] All fields editable
- [ ] Save updates schedule

## 7.4 Pause/Resume Schedule
- [ ] Pause button works
- [ ] Resume button works
- [ ] Visual indicator changes

## 7.5 Generate Jobs
- [ ] Generate jobs button works
- [ ] Jobs created according to schedule
- [ ] No duplicate jobs created

## 7.6 Delete Schedule
- [ ] Delete confirmation
- [ ] Schedule removed

---

# 8. CALENDAR

## 8.1 Calendar View
- [ ] Calendar page loads
- [ ] Current month displays
- [ ] Navigate to previous/next month
- [ ] Jobs display on correct dates

## 8.2 Job Display on Calendar
- [ ] **Property color applied to job**
  - [ ] Properties with color show colored background
  - [ ] Properties without color show default blue
- [ ] **Completed jobs show checkmark (✓)**
- [ ] Time shows if set
- [ ] Property name shows
- [ ] Click job navigates to jobs page

## 8.3 Multiple Jobs Per Day
- [ ] Multiple jobs display
- [ ] "+X more" indicator for overflow
- [ ] Click day to see all jobs

## 8.4 Calendar Sync
- [ ] "Sync Calendars" button works
- [ ] Sync status indicator
- [ ] New jobs from external calendars appear
- [ ] **Keywords matching works** (property keywords match calendar events)

---

# 9. CALENDAR SOURCES / SETTINGS

## 9.1 Calendar Sources List
- [ ] Settings page loads
- [ ] Existing sources display
- [ ] Source type (Turno, Google) shows

## 9.2 Add Calendar Source
- [ ] Add source button works
- [ ] Name field
- [ ] iCal URL field
- [ ] Type selection
- [ ] Save creates source

## 9.3 Edit Calendar Source
- [ ] Edit button works
- [ ] Fields editable
- [ ] Save updates source

## 9.4 Delete Calendar Source
- [ ] Delete confirmation
- [ ] Source removed

## 9.5 Manual Sync
- [ ] Sync button per source works
- [ ] Sync all button works
- [ ] Last sync time updates

---

# 10. LINENS & SUPPLIES

## 10.1 Catalog Tab - Categories
- [ ] Categories display
- [ ] Add category button works
- [ ] Edit category name
- [ ] Delete category (with items check)
- [ ] Drag to reorder categories

## 10.2 Catalog Tab - Linens Items
- [ ] Linens sub-tab selected
- [ ] Items display under categories
- [ ] Add item button works
  - [ ] Category selection
  - [ ] Item name
  - [ ] **Item code field**
  - [ ] Unit cost
- [ ] Edit item inline
- [ ] Delete item

## 10.3 Catalog Tab - Supplies Items
- [ ] Supplies sub-tab works
- [ ] Items display
- [ ] Add item button works
  - [ ] **"Use/Purpose" field (not "Code")**
  - [ ] Brand field available
- [ ] Edit/delete items

## 10.4 Property Tab
- [ ] Property selector dropdown
- [ ] Linens/Supplies for selected property
- [ ] Items grouped by room
- [ ] Add item to room
- [ ] Edit quantity per flip
- [ ] Edit on-hand inventory
- [ ] Delete item from room

## 10.5 Shopping List Tab
- [ ] Shopping list generates
- [ ] Filter by property
- [ ] Items needed calculated correctly
- [ ] Print/export options

---

# 11. INVOICES

## 11.1 Invoice List
- [ ] Invoices page loads
- [ ] Filter by status (draft, sent, paid)
- [ ] Filter by property
- [ ] Search works

## 11.2 Create Invoice
- [ ] Create invoice button works
- [ ] Property selection
- [ ] Invoice date
- [ ] Payment terms
- [ ] Line items add/edit
- [ ] Add job to invoice
- [ ] Subtotal/discount/total calculate

## 11.3 View Invoice
- [ ] Invoice detail page loads
- [ ] All fields display correctly
- [ ] Line items show
- [ ] Totals accurate

## 11.4 Edit Invoice
- [ ] Edit draft invoice
- [ ] Add/remove line items
- [ ] Save changes

## 11.5 Invoice Actions
- [ ] Send invoice
- [ ] Mark as paid
- [ ] Download PDF
- [ ] Email invoice

## 11.6 Auto-Invoice Creation
- [ ] When job marked "client paid" with per_job billing, draft invoice created

---

# 12. NOTES

## 12.1 Notes List
- [ ] Notes page loads
- [ ] Filter by status (active, resolved)
- [ ] Filter by property
- [ ] Filter by type

## 12.2 Note Display
- [ ] Type indicator (issue, damage, reminder, etc.)
- [ ] Severity badge (for issues/damage)
- [ ] Property name
- [ ] Content displays
- [ ] Photos display
- [ ] Added by / date shows

## 12.3 Note Actions
- [ ] Mark as resolved
- [ ] Report to owner
- [ ] Edit note
- [ ] Delete note

## 12.4 Create Note (Admin)
- [ ] Add note from notes page
- [ ] Property selection
- [ ] Type selection
- [ ] Severity (for issues/damage)
- [ ] Title and content
- [ ] Photo upload
- [ ] Estimated cost (for damage)

---

# 13. WORKER PORTAL

## 13.1 Worker Home
- [ ] Worker portal loads (/worker)
- [ ] Today's assigned jobs display
- [ ] Job cards show property, time, status
- [ ] Active notes indicator on jobs

## 13.2 Job Detail (Worker)
- [ ] Click job opens detail page
- [ ] **Property photo hero header displays**
  - [ ] Photo shows if property has image
  - [ ] Gradient fallback if no image
- [ ] Property name on hero
- [ ] Job date/time
- [ ] Assigned team members
- [ ] Instructions by room
- [ ] Reference photos

## 13.3 Job Actions (Worker)
- [ ] Check-in button (if implemented)
- [ ] Complete job button
- [ ] Completion notes field
- [ ] Mark complete workflow

## 13.4 Property Reference (Worker)
- [ ] "View Property Reference" button
- [ ] **Property photo hero header**
- [ ] Property details (address, access code, notes)
- [ ] Room-by-room instructions
- [ ] Reference photos
- [ ] Photo lightbox view

## 13.5 Report Issue (Worker)
- [ ] "Report Issue" button accessible
- [ ] Property selector (or pre-selected)
- [ ] Report type selection (issue, damage, reminder, etc.)
- [ ] Severity selection (for issues/damage)
- [ ] Title field
- [ ] Description field
- [ ] Photo upload (camera capture)
- [ ] Estimated cost (for damage)
- [ ] **Submit creates note successfully** (fixed API call)
- [ ] Success message and redirect

## 13.6 Worker Navigation
- [ ] Jobs list accessible
- [ ] Reference list accessible
- [ ] Report issue accessible
- [ ] Profile/settings accessible

## 13.7 Return to Admin
- [ ] **Navigate to worker portal from admin sidebar (Worker Portal link)**
- [ ] **"Return to Admin" button appears in header**
- [ ] **Click returns to admin dashboard**
- [ ] **Button persists when navigating within worker portal**
- [ ] **Direct /worker access does NOT show Return button**

---

# 14. REPORTS

## 14.1 Reports Page
- [ ] Reports page loads
- [ ] Available report types listed

## 14.2 Job Reports
- [ ] Date range selection
- [ ] Property filter
- [ ] Team filter
- [ ] Report generates
- [ ] Export to CSV/PDF

## 14.3 Payment Reports
- [ ] Revenue report
- [ ] Team payments report
- [ ] Expense tracking
- [ ] Profit margins

## 14.4 Property Reports
- [ ] Jobs per property
- [ ] Revenue per property
- [ ] Frequency analysis

---

# 15. MOBILE RESPONSIVENESS

## 15.1 Admin Pages (Mobile)
- [ ] Dashboard responsive
- [ ] Sidebar collapses to hamburger menu
- [ ] Tables scroll horizontally
- [ ] Forms usable on mobile
- [ ] Modals fit screen

## 15.2 Worker Portal (Mobile)
- [ ] Job list readable
- [ ] Job detail scrollable
- [ ] Photo upload with camera works
- [ ] All buttons tappable
- [ ] Forms have appropriate input types

---

# 16. ERROR HANDLING

## 16.1 Form Validation
- [ ] Required fields show errors
- [ ] Invalid data shows messages
- [ ] Errors clear on correction

## 16.2 API Errors
- [ ] Network errors show toast
- [ ] 401 redirects to login
- [ ] 403 shows permission error
- [ ] 404 shows not found
- [ ] 500 shows generic error

## 16.3 Loading States
- [ ] Loading indicators show during fetches
- [ ] Buttons disabled during saves
- [ ] Skeleton loaders where appropriate

---

# 17. DATA INTEGRITY

## 17.1 Cascading Deletes
- [ ] Delete property removes jobs
- [ ] Delete job removes assignments
- [ ] Delete team member handled

## 17.2 Calculations
- [ ] Job payment splits calculate correctly
- [ ] Invoice totals accurate
- [ ] Expense percentages apply correctly

---

# ISSUES FOUND

| # | Page | Feature | Description | Severity | Steps to Reproduce | Screenshot |
|---|------|---------|-------------|----------|-------------------|------------|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |
| 8 | | | | | | |
| 9 | | | | | | |
| 10 | | | | | | |

---

# SIGN-OFF

## Testing Summary
- Total test cases: _____
- Passed: _____
- Failed: _____
- Blocked: _____

## Critical Issues Found: _____
## High Priority Issues: _____
## Medium Priority Issues: _____
## Low Priority Issues: _____

## Recommendation
- [ ] Ready for production
- [ ] Ready with minor fixes
- [ ] Needs significant fixes before release
- [ ] Not ready - major issues

---

**Tester Signature:** _______________
**Date:** _______________

**Reviewer Signature:** _______________
**Date:** _______________

---

## Notes / Comments
