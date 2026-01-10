# Cleaning Right Now - UAT Checklist

**Tester:** _______________ **Date:** _______________ **Build:** _______________

---

## PAGE 1

### 1. AUTHENTICATION
| # | Test | ✓ |
|---|------|---|
| 1.1 | Admin login → dashboard redirect | ☐ |
| 1.2 | Worker PIN login → worker portal | ☐ |
| 1.3 | Session persists on refresh | ☐ |
| 1.4 | Logout clears session | ☐ |
| 1.5 | Protected routes redirect when logged out | ☐ |
| 1.6 | Role-based access (admin/supervisor/worker) | ☐ |

### 2. DASHBOARD
| # | Test | ✓ |
|---|------|---|
| 2.1 | Dashboard loads, stats accurate | ☐ |
| 2.2 | Today's jobs count correct | ☐ |
| 2.3 | Upcoming jobs list accurate | ☐ |

### 3. PROPERTIES
| # | Test | ✓ |
|---|------|---|
| 3.1 | Property list loads, search/filter works | ☐ |
| 3.2 | Create property with required fields | ☐ |
| 3.3 | Edit: name, address, owner, rates | ☐ |
| 3.4 | Edit: billing type (Per Job/Bi-Weekly/Monthly) | ☐ |
| 3.5 | Edit: access code, notes, bed config | ☐ |
| 3.6 | Edit: property photo upload | ☐ |
| 3.7 | Edit: calendar keywords | ☐ |
| 3.8 | **Calendar color picker (custom + presets)** | ☐ |
| 3.9 | Rooms tab: add/edit/delete rooms | ☐ |
| 3.10 | **Room expand: 3-col (Photos/Inventory/Instructions)** | ☐ |
| 3.11 | Room: upload photos, add captions | ☐ |
| 3.12 | **Room: add linens/supplies to inventory** | ☐ |
| 3.13 | Room: add/delete instructions | ☐ |
| 3.14 | Photos tab: upload, caption, notes, delete | ☐ |
| 3.15 | Instructions tab: add/edit/delete, link photos | ☐ |
| 3.16 | Delete property (cascades) | ☐ |

### 4. OWNERS
| # | Test | ✓ |
|---|------|---|
| 4.1 | Owner list loads | ☐ |
| 4.2 | Create owner (name, email, phone) | ☐ |
| 4.3 | **Default billing has Bi-Weekly option** | ☐ |
| 4.4 | Edit/delete owner | ☐ |

### 5. TEAM MEMBERS
| # | Test | ✓ |
|---|------|---|
| 5.1 | Team list loads, filter by role | ☐ |
| 5.2 | Create member (name, PIN, role, rank) | ☐ |
| 5.3 | Edit member details | ☐ |
| 5.4 | Deactivate/delete member | ☐ |

### 6. JOBS
| # | Test | ✓ |
|---|------|---|
| 6.1 | Jobs list loads, filters work | ☐ |
| 6.2 | Create job: property, date, rate | ☐ |
| 6.3 | **Create job: priority selector (1-10)** | ☐ |
| 6.4 | Create job: time (optional) | ☐ |
| 6.5 | **Create job: expense % editable** | ☐ |
| 6.6 | Create job: team assignment | ☐ |
| 6.7 | **Job card: priority badge (P1-P10, color coded)** | ☐ |
| 6.8 | Job card: time, source, team, rate display | ☐ |
| 6.9 | Edit job: all fields including priority/expense% | ☐ |
| 6.10 | Mark completed / client paid / team paid | ☐ |
| 6.11 | Delete job | ☐ |

### 7. RECURRING SCHEDULES
| # | Test | ✓ |
|---|------|---|
| 7.1 | Schedule list loads | ☐ |
| 7.2 | Create schedule (name, property, frequency) | ☐ |
| 7.3 | Day of week/month selection | ☐ |
| 7.4 | Edit schedule | ☐ |
| 7.5 | Pause/resume schedule | ☐ |
| 7.6 | Generate jobs (no duplicates) | ☐ |
| 7.7 | Delete schedule | ☐ |

### 8. CALENDAR
| # | Test | ✓ |
|---|------|---|
| 8.1 | Calendar loads, month navigation | ☐ |
| 8.2 | Jobs display on correct dates | ☐ |
| 8.3 | **Property color applied to jobs** | ☐ |
| 8.4 | **Completed jobs show ✓ checkmark** | ☐ |
| 8.5 | Click job → jobs page | ☐ |
| 8.6 | "+X more" for overflow | ☐ |
| 8.7 | Sync calendars button works | ☐ |
| 8.8 | **Keywords matching for calendar events** | ☐ |

### 9. CALENDAR SOURCES
| # | Test | ✓ |
|---|------|---|
| 9.1 | Sources list loads | ☐ |
| 9.2 | Add source (name, iCal URL, type) | ☐ |
| 9.3 | Edit/delete source | ☐ |
| 9.4 | Manual sync per source | ☐ |
| 9.5 | Last sync time updates | ☐ |

### 10. LINENS & SUPPLIES
| # | Test | ✓ |
|---|------|---|
| 10.1 | Catalog: categories display | ☐ |
| 10.2 | Catalog: add/edit/delete categories | ☐ |
| 10.3 | Linens: add item (name, code, cost) | ☐ |
| 10.4 | **Supplies: "Use/Purpose" field (not Code)** | ☐ |
| 10.5 | Supplies: brand field available | ☐ |
| 10.6 | Property tab: select property | ☐ |
| 10.7 | Property: items by room, qty per flip | ☐ |
| 10.8 | Property: on-hand inventory | ☐ |
| 10.9 | Shopping list generates correctly | ☐ |

---

## PAGE 2

### 11. INVOICES
| # | Test | ✓ |
|---|------|---|
| 11.1 | Invoice list loads, filters work | ☐ |
| 11.2 | Create invoice (property, date, line items) | ☐ |
| 11.3 | Add job to invoice | ☐ |
| 11.4 | Subtotal/discount/total calculate | ☐ |
| 11.5 | Edit draft invoice | ☐ |
| 11.6 | Send invoice / mark paid | ☐ |
| 11.7 | Download PDF | ☐ |
| 11.8 | Auto-invoice on "client paid" (per_job billing) | ☐ |

### 12. NOTES
| # | Test | ✓ |
|---|------|---|
| 12.1 | Notes list loads, filters (status/property/type) | ☐ |
| 12.2 | Note display (type, severity, content, photos) | ☐ |
| 12.3 | Mark resolved / report to owner | ☐ |
| 12.4 | Create note (admin): all fields + photos | ☐ |
| 12.5 | Edit/delete note | ☐ |

### 13. WORKER PORTAL
| # | Test | ✓ |
|---|------|---|
| 13.1 | Worker home: today's jobs display | ☐ |
| 13.2 | Job cards: property, time, active notes indicator | ☐ |
| 13.3 | **Job detail: property photo hero header** | ☐ |
| 13.4 | Job detail: instructions by room | ☐ |
| 13.5 | Job detail: reference photos | ☐ |
| 13.6 | Complete job with notes | ☐ |
| 13.7 | **Property reference: photo hero header** | ☐ |
| 13.8 | Property reference: access code, notes | ☐ |
| 13.9 | Property reference: room instructions | ☐ |
| 13.10 | **Report issue: submit works (fixed API)** | ☐ |
| 13.11 | Report: type, severity, photos, est. cost | ☐ |
| 13.12 | **Return to Admin button (from admin sidebar)** | ☐ |
| 13.13 | **Return button persists in worker portal** | ☐ |
| 13.14 | **Direct /worker access: NO return button** | ☐ |

### 14. REPORTS
| # | Test | ✓ |
|---|------|---|
| 14.1 | Reports page loads | ☐ |
| 14.2 | Job reports: date range, filters | ☐ |
| 14.3 | Payment reports: revenue, team pay | ☐ |
| 14.4 | Export to CSV/PDF | ☐ |

### 15. MOBILE / RESPONSIVE
| # | Test | ✓ |
|---|------|---|
| 15.1 | Admin: sidebar → hamburger menu | ☐ |
| 15.2 | Admin: tables scroll, modals fit | ☐ |
| 15.3 | Worker: job list readable | ☐ |
| 15.4 | Worker: photo upload with camera | ☐ |
| 15.5 | All buttons tappable on mobile | ☐ |

### 16. ERROR HANDLING
| # | Test | ✓ |
|---|------|---|
| 16.1 | Required fields show validation errors | ☐ |
| 16.2 | Network errors show toast | ☐ |
| 16.3 | 401 → login redirect | ☐ |
| 16.4 | 403/404/500 errors display properly | ☐ |
| 16.5 | Loading indicators during fetches | ☐ |
| 16.6 | Buttons disabled during saves | ☐ |

### 17. DATA INTEGRITY
| # | Test | ✓ |
|---|------|---|
| 17.1 | Delete property cascades to jobs | ☐ |
| 17.2 | Job payment splits calculate correctly | ☐ |
| 17.3 | Invoice totals accurate | ☐ |
| 17.4 | Expense percentages apply correctly | ☐ |

---

## ISSUES FOUND

| # | Area | Description | Severity |
|---|------|-------------|----------|
| 1 | | | ☐Crit ☐High ☐Med ☐Low |
| 2 | | | ☐Crit ☐High ☐Med ☐Low |
| 3 | | | ☐Crit ☐High ☐Med ☐Low |
| 4 | | | ☐Crit ☐High ☐Med ☐Low |
| 5 | | | ☐Crit ☐High ☐Med ☐Low |
| 6 | | | ☐Crit ☐High ☐Med ☐Low |

---

## SUMMARY

| Metric | Count |
|--------|-------|
| Total Tests | 107 |
| Passed | |
| Failed | |
| Blocked | |

**Recommendation:** ☐ Ready ☐ Ready w/minor fixes ☐ Needs fixes ☐ Not ready

**Tester:** _______________ **Date:** _______________

**Reviewer:** _______________ **Date:** _______________
