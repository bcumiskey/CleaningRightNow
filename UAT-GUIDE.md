# Cleaning Right Now - Testing Guide

**Welcome!** This guide will walk you through testing the app step by step. No technical knowledge needed - just follow along and check the boxes as you go.

**Before you start:**
- Open the app in your web browser (Chrome, Safari, or Firefox work best)
- Have a pen ready to check boxes and write notes
- Take your time - there's no rush!

**Tester Name:** _________________________ **Date:** _____________

---

## PART 1: LOGGING IN

### Test 1.1: Admin Login
1. Go to the app's login page
2. Type in the admin username and password
3. Click the "Sign In" button

**What should happen:** You should see the main dashboard with stats and menu options on the left side.

- [ ] ✓ I can see the dashboard after logging in

### Test 1.2: Try the Worker Login
1. Click "Logout" (usually at the bottom of the left menu)
2. Go to the worker login page (add `/worker/login` to the website address)
3. Enter a worker's PIN number
4. Click "Sign In"

**What should happen:** You should see the worker's view with today's jobs.

- [ ] ✓ Worker login works and shows today's jobs

### Test 1.3: Check That Logout Works
1. Find and click "Logout"
2. Try to go back to the dashboard by typing the address

**What should happen:** You should be sent back to the login page, not the dashboard.

- [ ] ✓ After logout, I can't access the dashboard without logging in again

**🔄 Log back in as admin before continuing.**

---

## PART 2: THE DASHBOARD

### Test 2.1: Dashboard Overview
Look at the main dashboard after logging in.

**Check these things:**
- [ ] ✓ The page loads without any error messages
- [ ] ✓ I can see a count of "Today's Jobs"
- [ ] ✓ I can see upcoming jobs listed
- [ ] ✓ The numbers look reasonable (not showing weird numbers like -5 or 999999)

---

## PART 3: PROPERTIES (The Places You Clean)

### Test 3.1: View the Property List
1. Click "Properties" in the left menu

**What should happen:** You should see a list of all properties (houses, rentals, etc.)

- [ ] ✓ Properties list appears
- [ ] ✓ Each property shows its name and address

### Test 3.2: Search for a Property
1. Find the search box at the top
2. Type part of a property name
3. Watch the list filter

- [ ] ✓ The list shows only matching properties
- [ ] ✓ Clearing the search shows all properties again

### Test 3.3: Add a New Property
1. Click the "Add Property" button
2. Fill in:
   - Property name (example: "Test Beach House")
   - Address (example: "123 Test Street")
3. Click "Save" or "Create"

- [ ] ✓ The new property appears in the list
- [ ] ✓ No error messages appeared

### Test 3.4: Edit a Property's Basic Info
1. Click on the property you just created
2. Try changing:
   - [ ] ✓ The property name
   - [ ] ✓ The address
   - [ ] ✓ The cleaning rate (price)
   - [ ] ✓ The billing type (try selecting "Per Job", "Bi-Weekly", and "Monthly")
   - [ ] ✓ Access code (door code/lockbox)
   - [ ] ✓ Access notes
3. Click "Save" after each change

**Check:** Does each change save correctly? Go back out and in to verify.

### Test 3.5: Set a Calendar Color
1. While editing a property, look for the "Calendar Color" section
2. Try:
   - [ ] ✓ Clicking a preset color button
   - [ ] ✓ Picking a custom color
   - [ ] ✓ Clearing the color (if there's a clear button)
3. Save and check that the color appears on the calendar later

### Test 3.6: Upload a Property Photo
1. Find the property photo section
2. Click to upload or drag a photo
3. Wait for it to upload

- [ ] ✓ Photo uploads successfully
- [ ] ✓ Photo displays on the property

### Test 3.7: Work with Rooms
1. Click the "Rooms" tab in the property
2. Click "Add Room"
3. Enter a room name (example: "Master Bedroom")
4. Select a room type
5. Save the room

- [ ] ✓ New room appears in the list

### Test 3.8: Expand a Room Card
1. Click on a room card to expand it
2. You should see THREE sections side by side:

**Left section - PHOTOS:**
- [ ] ✓ I can see existing photos (or empty state)
- [ ] ✓ I can upload a new photo
- [ ] ✓ I can add a caption to a photo
- [ ] ✓ I can delete a photo (hover over it to see delete button)

**Middle section - INVENTORY:**
- [ ] ✓ I can see linens/supplies for this room
- [ ] ✓ There's an "Add Linen/Supply" button
- [ ] ✓ Clicking it opens a selection popup
- [ ] ✓ I can choose between Linens and Supplies tabs
- [ ] ✓ I can select an item and set quantity
- [ ] ✓ Items show "L" badge for linens, "S" badge for supplies
- [ ] ✓ I can delete items (hover to see delete)

**Right section - INSTRUCTIONS:**
- [ ] ✓ I can see existing instructions (numbered list)
- [ ] ✓ I can type a new instruction and add it
- [ ] ✓ I can delete instructions

### Test 3.9: Delete a Room
1. Find the trash/delete icon on a room
2. Click it
3. Confirm deletion if asked

- [ ] ✓ Room is removed from the list

### Test 3.10: Property Photos Tab
1. Click the "Photos" tab
2. Try uploading a general property photo
3. Add a caption
4. Delete a test photo

- [ ] ✓ Upload works
- [ ] ✓ Caption saves
- [ ] ✓ Delete works

### Test 3.11: Property Instructions Tab
1. Click the "Instructions" tab
2. Add a general instruction
3. Edit it
4. Delete it

- [ ] ✓ All instruction actions work

### Test 3.12: Delete a Property
1. Find the delete button for your test property
2. Click it and confirm

- [ ] ✓ Property is removed from the list

---

## PART 4: PROPERTY OWNERS

### Test 4.1: View Owners
1. Click "Owners" in the left menu

- [ ] ✓ Owner list loads

### Test 4.2: Add an Owner
1. Click "Add Owner"
2. Fill in name, email, phone
3. **Important:** Check the billing options - you should see:
   - Per Job
   - Bi-Weekly ← Make sure this option exists!
   - Monthly
4. Save

- [ ] ✓ Owner created successfully
- [ ] ✓ Bi-Weekly billing option is available

### Test 4.3: Edit and Delete an Owner
1. Edit the owner you just created
2. Change some information and save
3. Delete the owner

- [ ] ✓ Edit works
- [ ] ✓ Delete works

---

## PART 5: TEAM MEMBERS (Your Cleaning Staff)

### Test 5.1: View Team List
1. Click "Team" in the left menu

- [ ] ✓ Team member list appears
- [ ] ✓ Can filter by role (cleaner, supervisor, etc.)

### Test 5.2: Add a Team Member
1. Click "Add Team Member"
2. Fill in name, phone, email
3. Set their role
4. Set their PIN (for worker login)
5. Save

- [ ] ✓ Team member added successfully

### Test 5.3: Edit and Deactivate
1. Edit the team member
2. Try deactivating them (if available)
3. Delete them

- [ ] ✓ All actions work correctly

---

## PART 6: JOBS (Cleaning Appointments)

### Test 6.1: View Jobs
1. Click "Jobs" in the left menu

- [ ] ✓ Jobs list appears
- [ ] ✓ Can filter by date
- [ ] ✓ Can filter by status (completed, paid, etc.)

### Test 6.2: Create a Job
1. Click "Schedule Job" or "Add Job"
2. Fill in:
   - Select a property from the dropdown
   - Pick a date
   - **Priority:** Try the priority selector (1 = most urgent, 10 = least urgent)
   - Time (optional)
   - Rate (should auto-fill from property)
   - **Expense %:** This should be editable per job
   - Assign team members
3. Save

- [ ] ✓ Job created successfully
- [ ] ✓ Priority selector works (shows options 1-10)
- [ ] ✓ Expense % can be changed for this specific job

### Test 6.3: Check How Jobs Display
Look at the job cards in the list:

- [ ] ✓ Property name shows
- [ ] ✓ **Priority badge shows** (P1, P2, P3... P10)
  - P1-P2 should be RED (urgent)
  - P3-P4 should be AMBER/YELLOW
  - P5-P6 should be GRAY
  - P7-P10 should be BLUE
- [ ] ✓ Time shows (if you set one)
- [ ] ✓ Assigned team members show
- [ ] ✓ Rate/price shows

### Test 6.4: Edit a Job
1. Click to edit a job
2. Try changing:
   - [ ] ✓ The date
   - [ ] ✓ The priority
   - [ ] ✓ The expense %
   - [ ] ✓ The team assignment
3. Save each change

### Test 6.5: Job Status Buttons
Try these actions on a job:
- [ ] ✓ Mark as "Completed" - does it save?
- [ ] ✓ Mark as "Client Paid" - does it save?
- [ ] ✓ Mark as "Team Paid" - does it save?

### Test 6.6: Delete a Job
1. Find delete option on a job
2. Delete it

- [ ] ✓ Job is removed

---

## PART 7: RECURRING SCHEDULES

### Test 7.1: View Schedules
1. Click "Schedules" in the left menu

- [ ] ✓ Schedules list appears

### Test 7.2: Create a Schedule
1. Add a new schedule
2. Set:
   - Name (example: "Weekly Beach House Clean")
   - Property
   - How often (weekly, monthly, etc.)
   - Day of week
3. Save

- [ ] ✓ Schedule created

### Test 7.3: Generate Jobs from Schedule
1. Find the "Generate Jobs" button
2. Click it

- [ ] ✓ Jobs are created based on the schedule
- [ ] ✓ No duplicate jobs (if you click again, it shouldn't create doubles)

### Test 7.4: Pause and Delete
- [ ] ✓ Can pause a schedule
- [ ] ✓ Can resume a schedule
- [ ] ✓ Can delete a schedule

---

## PART 8: THE CALENDAR

### Test 8.1: View the Calendar
1. Click "Calendar" in the left menu

- [ ] ✓ Calendar loads showing the current month
- [ ] ✓ Can click arrows to see previous/next month

### Test 8.2: Jobs on the Calendar
Look at the calendar:

- [ ] ✓ Jobs appear on their correct dates
- [ ] ✓ **Properties with colors:** Jobs show the property's color
- [ ] ✓ **Completed jobs:** Show a checkmark (✓)
- [ ] ✓ Days with many jobs show "+X more" link
- [ ] ✓ Clicking a job takes you to the jobs page

### Test 8.3: Sync Calendars
1. Find the "Sync Calendars" button
2. Click it

- [ ] ✓ Sync runs without error
- [ ] ✓ Any external calendar events appear as jobs (if you have calendar sources set up)

---

## PART 9: CALENDAR SOURCES (External Calendar Connections)

### Test 9.1: View Sources
1. Click "Settings" or "Calendar Sources" in the menu

- [ ] ✓ List of calendar sources appears

### Test 9.2: Add a Source
1. Click to add a new source
2. Enter a name and iCal URL
3. Save

- [ ] ✓ Source is added

### Test 9.3: Sync and Delete
- [ ] ✓ Can manually sync an individual source
- [ ] ✓ Last sync time shows/updates
- [ ] ✓ Can delete a source

---

## PART 10: LINENS & SUPPLIES

### Test 10.1: View the Catalog
1. Click "Linens & Supplies" in the menu
2. Make sure you're on the "Catalog" tab

- [ ] ✓ Categories display

### Test 10.2: Add Categories and Items
1. Add a new category (example: "Bedding")
2. Add an item to that category

**For LINENS:**
- [ ] ✓ Has a "Code" field (like "QS" for Queen Sheet)

**For SUPPLIES:**
- [ ] ✓ Has a "Use/Purpose" field (NOT "Code")
- [ ] ✓ Has a "Brand" field

### Test 10.3: Property Inventory Tab
1. Click the "Property" tab
2. Select a property from the dropdown

- [ ] ✓ Shows items grouped by room
- [ ] ✓ Shows quantity per flip (per cleaning)
- [ ] ✓ Can edit quantities

### Test 10.4: Shopping List
1. Click the "Shopping List" tab

- [ ] ✓ List generates based on what's needed
- [ ] ✓ Can filter by property

---

## PART 11: INVOICES

### Test 11.1: View Invoices
1. Click "Invoices" in the menu

- [ ] ✓ Invoice list loads
- [ ] ✓ Can filter by status (draft, sent, paid)

### Test 11.2: Create an Invoice
1. Click "Create Invoice"
2. Select a property
3. Add line items
4. Check that totals calculate correctly

- [ ] ✓ Invoice creates successfully
- [ ] ✓ Math is correct (subtotal, discount, total)

### Test 11.3: Invoice Actions
- [ ] ✓ Can edit a draft invoice
- [ ] ✓ Can mark as sent
- [ ] ✓ Can mark as paid
- [ ] ✓ Can download PDF

### Test 11.4: Auto-Invoice Test
1. Find a job for a property with "Per Job" billing
2. Mark that job as "Client Paid"
3. Check the invoices

- [ ] ✓ A draft invoice was automatically created for that job

---

## PART 12: NOTES (Issues, Damage Reports, etc.)

### Test 12.1: View Notes
1. Click "Notes" in the menu

- [ ] ✓ Notes list loads
- [ ] ✓ Can filter by status, property, or type

### Test 12.2: Create a Note
1. Click to add a note
2. Fill in all fields
3. Upload a photo
4. Save

- [ ] ✓ Note created with photo

### Test 12.3: Note Actions
- [ ] ✓ Can mark as resolved
- [ ] ✓ Can report to owner
- [ ] ✓ Can edit and delete

---

## PART 13: WORKER PORTAL (What Your Cleaners See)

**For this section, you'll test what cleaners see when they log in.**

### Test 13.1: Access Worker Portal from Admin
1. While logged in as admin, look in the left menu
2. Find "Worker Portal" link
3. Click it

- [ ] ✓ Worker portal loads
- [ ] ✓ **"Return to Admin" button appears** at the top

### Test 13.2: Navigate Around as Worker
1. Click through different pages in worker portal
2. Check if "Return to Admin" button stays visible

- [ ] ✓ **Button stays visible on all worker pages**

### Test 13.3: Return to Admin
1. Click the "Return to Admin" button

- [ ] ✓ Takes you back to the admin dashboard

### Test 13.4: Direct Worker Login (No Return Button)
1. Log out completely
2. Go directly to `/worker/login`
3. Log in with a worker PIN
4. Look for the "Return to Admin" button

- [ ] ✓ **NO "Return to Admin" button** (since they came directly to worker, not from admin)

### Test 13.5: Worker Home Page
Look at the worker's main page:

- [ ] ✓ Today's jobs display
- [ ] ✓ Jobs show property name
- [ ] ✓ Jobs show time (if set)
- [ ] ✓ Jobs show if there are active notes (warning indicator)

### Test 13.6: Job Detail Page
1. Click on a job

- [ ] ✓ **Property photo shows as big header image** at the top
- [ ] ✓ Property name displays on the image
- [ ] ✓ Job date and time show
- [ ] ✓ Assigned team members show
- [ ] ✓ Instructions by room are visible
- [ ] ✓ Reference photos are visible

### Test 13.7: View Property Reference
1. Find the "View Property" or "Property Reference" button
2. Click it

- [ ] ✓ **Property photo shows as big header image**
- [ ] ✓ Access code shows
- [ ] ✓ Access notes show
- [ ] ✓ Room-by-room instructions show

### Test 13.8: Complete a Job
1. Go to a job detail
2. Click "Complete Job" or similar
3. Add completion notes
4. Submit

- [ ] ✓ Job marked as complete

### Test 13.9: Report an Issue (Very Important!)
1. Find "Report Issue" in worker portal
2. Select a property
3. Choose issue type (Issue, Damage, Reminder, etc.)
4. For Issue or Damage: set severity (Low, Medium, High)
5. Type a title and description
6. Upload a photo
7. **Click Submit**

- [ ] ✓ **Submit button works** (doesn't show error)
- [ ] ✓ Success message appears
- [ ] ✓ Redirected back to worker home
- [ ] ✓ The note appears in admin Notes page

---

## PART 14: REPORTS

### Test 14.1: View Reports
1. Click "Reports" in the menu

- [ ] ✓ Reports page loads

### Test 14.2: Generate Reports
- [ ] ✓ Can select date range
- [ ] ✓ Can filter by property or team
- [ ] ✓ Report generates with data
- [ ] ✓ Can export to CSV or PDF

---

## PART 15: MOBILE / PHONE TESTING

**Do these tests on your phone or make your browser window very narrow:**

### Test 15.1: Admin on Mobile
- [ ] ✓ Left menu becomes a hamburger menu (≡) you can tap
- [ ] ✓ Tables scroll sideways if needed
- [ ] ✓ Popup forms fit on screen
- [ ] ✓ All buttons are big enough to tap

### Test 15.2: Worker on Mobile
- [ ] ✓ Job list is readable
- [ ] ✓ Job detail scrolls smoothly
- [ ] ✓ Can take/upload photos with phone camera
- [ ] ✓ All buttons work with finger taps

---

## PART 16: ERROR HANDLING

### Test 16.1: Required Fields
1. Try to save a form with required fields empty

- [ ] ✓ Error message tells you what's missing
- [ ] ✓ The error goes away when you fill it in

### Test 16.2: Loading Indicators
1. When pages are loading or saving:

- [ ] ✓ You see a loading spinner or "Loading..." text
- [ ] ✓ Buttons are disabled while saving (can't double-click)

---

## PART 17: DOES THE MATH WORK?

### Test 17.1: Job Payment Math
1. Look at a job with:
   - A rate (example: $150)
   - An expense % (example: 12%)
   - Team members assigned

- [ ] ✓ The payment split looks correct
- [ ] ✓ Expense amount matches the percentage

### Test 17.2: Invoice Math
1. Look at an invoice with multiple line items

- [ ] ✓ Subtotal is correct (add up the items)
- [ ] ✓ Total after discount is correct

---

# ISSUES FOUND

**Write down any problems you find:**

| # | Where in the app? | What went wrong? | How bad is it? |
|---|-------------------|------------------|----------------|
| 1 | | | ☐ Can't use app ☐ Annoying ☐ Minor ☐ Just looks wrong |
| 2 | | | ☐ Can't use app ☐ Annoying ☐ Minor ☐ Just looks wrong |
| 3 | | | ☐ Can't use app ☐ Annoying ☐ Minor ☐ Just looks wrong |
| 4 | | | ☐ Can't use app ☐ Annoying ☐ Minor ☐ Just looks wrong |
| 5 | | | ☐ Can't use app ☐ Annoying ☐ Minor ☐ Just looks wrong |
| 6 | | | ☐ Can't use app ☐ Annoying ☐ Minor ☐ Just looks wrong |
| 7 | | | ☐ Can't use app ☐ Annoying ☐ Minor ☐ Just looks wrong |
| 8 | | | ☐ Can't use app ☐ Annoying ☐ Minor ☐ Just looks wrong |
| 9 | | | ☐ Can't use app ☐ Annoying ☐ Minor ☐ Just looks wrong |
| 10 | | | ☐ Can't use app ☐ Annoying ☐ Minor ☐ Just looks wrong |

---

# FINAL SUMMARY

**Count your checkmarks:**

| Section | Checkmarks Done | Total in Section |
|---------|-----------------|------------------|
| Part 1: Logging In | | 3 |
| Part 2: Dashboard | | 4 |
| Part 3: Properties | | 25+ |
| Part 4: Owners | | 5 |
| Part 5: Team Members | | 6 |
| Part 6: Jobs | | 18 |
| Part 7: Recurring Schedules | | 7 |
| Part 8: Calendar | | 7 |
| Part 9: Calendar Sources | | 5 |
| Part 10: Linens & Supplies | | 8 |
| Part 11: Invoices | | 8 |
| Part 12: Notes | | 6 |
| Part 13: Worker Portal | | 20 |
| Part 14: Reports | | 5 |
| Part 15: Mobile | | 8 |
| Part 16: Errors | | 3 |
| Part 17: Math | | 3 |
| **TOTAL** | | ~141 |

---

## YOUR VERDICT

**Check one:**

- [ ] ✅ **Ready to go!** Everything works great
- [ ] ⚠️ **Almost ready** - A few small things to fix, but usable
- [ ] 🔧 **Needs work** - Several things broken, needs fixes before using
- [ ] ❌ **Not ready** - Major problems, can't use yet

---

**Your notes / comments:**

_________________________________________________________________________

_________________________________________________________________________

_________________________________________________________________________

_________________________________________________________________________

---

**Tested by:** _________________________

**Date:** _____________

**Thank you for testing! Your feedback helps make the app better!** 🙏
