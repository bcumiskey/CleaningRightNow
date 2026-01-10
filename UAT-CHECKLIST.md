# UAT Checklist - Cleaning Right Now

## Test Date: ___________
## Tester: Alex

---

## 1. Property Colors for Calendar

### Setup
- [ ] Go to Properties → Edit any property
- [ ] In the Details tab, find "Calendar Color" section

### Test Cases
- [ ] Click color picker and select a custom color
- [ ] Click preset color circles to select predefined colors
- [ ] Verify "Clear" button removes the selected color
- [ ] Save the property

### Calendar Verification
- [ ] Go to Calendar page
- [ ] Verify jobs for that property display with the selected color
- [ ] Verify completed jobs show with checkmark (✓) and lighter background
- [ ] Verify properties without colors still show default blue/green colors

---

## 2. Bi-Weekly Billing Option

### Property Setup
- [ ] Go to Properties → Edit any property
- [ ] In Billing section, click "Billing Type" dropdown
- [ ] Verify "Bi-Weekly" option is available (Per Job, Bi-Weekly, Monthly)
- [ ] Select "Bi-Weekly" and save

### Owner Setup
- [ ] Go to Owners → Edit any owner
- [ ] In "Default Billing" dropdown
- [ ] Verify "Bi-Weekly" option is available
- [ ] Select and save

---

## 3. Room Build-out Flow (Photos, Inventory, Instructions)

### Access
- [ ] Go to Properties → Edit a property → Rooms tab

### Expand Room Card
- [ ] Click on any room to expand it
- [ ] Verify 3-column layout appears: Photos | Inventory | Instructions

### Photos Column
- [ ] Add a new photo using the upload button
- [ ] Add caption and save
- [ ] Delete a photo (hover to see delete button)

### Inventory Column (NEW)
- [ ] Click "Add Linen/Supply" button
- [ ] Switch between Linens and Supplies tabs in modal
- [ ] Select an item from dropdown
- [ ] Set quantity per flip
- [ ] Click "Add Item"
- [ ] Verify item appears in the inventory list with "L" (linen) or "S" (supply) badge
- [ ] Delete an inventory item (hover to see delete button)

### Instructions Column
- [ ] Type an instruction and press Enter or click + button
- [ ] Verify instruction appears numbered
- [ ] Delete an instruction (hover to see delete button)

---

## 4. Return to Admin Button (Worker Portal)

### Setup
- [ ] Log in as Admin
- [ ] From Admin sidebar, click "Worker Portal" link

### Test Cases
- [ ] Verify "Return to Admin" button appears in top right
- [ ] Click the button
- [ ] Verify you return to admin dashboard
- [ ] Navigate directly to /worker (without ?from=admin)
- [ ] Verify "Return to Admin" button does NOT appear

---

## 5. Property Photo Hero Headers (Worker Portal)

### Setup
- [ ] Ensure a property has a photo uploaded (Property → Details → Property Photo)
- [ ] Create a job for that property

### Worker Job Detail
- [ ] Go to Worker Portal → Click on a job
- [ ] Verify hero header shows property photo (or emerald gradient if no photo)
- [ ] Verify property name overlays on the hero

### Worker Property Reference
- [ ] From job detail, click "View Property Reference"
- [ ] Verify hero header shows property photo
- [ ] Verify property details display correctly

---

## 6. Calendar Sync with Keywords

### Setup
- [ ] Go to Properties → Edit a property
- [ ] In "Calendar Keywords" field, enter comma-separated keywords
  - Example: "beach house, smith rental"
- [ ] Save the property

### Test
- [ ] Go to Settings → Calendar Sources
- [ ] Click "Sync Calendars"
- [ ] Verify jobs are created matching the keywords

---

## Issues Found

| Issue # | Page/Feature | Description | Severity | Screenshot |
|---------|--------------|-------------|----------|------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## Sign-off

- [ ] All critical features tested
- [ ] All issues documented

**Tester Signature:** _______________
**Date:** _______________

---

## Notes
