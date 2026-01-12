# Turno Integration Options

This document captures research on integrating Turno (cleaning scheduling platform) with the Clean Right Now app.

**Last Updated:** January 2026

---

## The Problem

Turno (formerly TurnoverBnB) is a cleaning scheduling platform for short-term rentals. It syncs with Airbnb, VRBO, etc. to automatically create cleaning jobs when guests check out.

**What Turno does NOT offer:**
- No public API access
- No iCal/calendar export for cleaning schedules
- No webhook notifications
- No data export functionality

**What Turno offers instead:**
- Email notifications (limited to 7 days in advance)
- Integration with Task-Bird (a third-party field service app)
- Web dashboard with calendar view (requires login)

This makes it unnecessarily difficult to get cleaning schedule data into our app.

---

## Integration Options

### Option 1: Task-Bird (Turno's Recommended Partner)

**What it is:** Field service management app with official Turno API integration.

**Cost:** FREE for up to 50 users

**How it works:**
```
Turno → Task-Bird (via API) → Task-Bird App
```

**Pros:**
- Official integration, reliable sync
- Free for small teams
- Mobile app for cleaners

**Cons:**
- Task-Bird does NOT export to Google Calendar or iCal
- Google Calendar sync is ONE-WAY (imports INTO Task-Bird only)
- No API for us to pull data from Task-Bird
- Data is trapped in another walled garden

**Verdict:** Can use for cleaner coordination, but won't help get data into our app.

**Links:**
- [Task-Bird Website](https://www.taskbird.com/)
- [Task-Bird Pricing](https://www.taskbird.com/pricing)
- [Turno + Task-Bird Setup Guide](https://help.turno.com/en/articles/6217111-how-can-i-connect-my-turno-account-to-taskbird)

---

### Option 2: Gmail Email Parsing

**What it is:** Parse Turno's email notifications and create calendar events automatically.

**Cost:** FREE

**How it works:**
```
Turno → Email alerts → Gmail → Google Apps Script → Google Calendar → Our App (via iCal sync)
```

**Pros:**
- Completely free
- No third-party services needed
- Can handle other email sources too (not just Turno)

**Cons:**
- Turno only sends alerts UP TO 7 DAYS in advance
- Limited visibility for longer-term planning
- Depends on email format not changing

**Implementation Options:**

1. **Google Apps Script** (FREE)
   - Runs on Google's servers
   - Can watch for labeled emails
   - Creates Google Calendar events
   - [Google Apps Script Calendar Docs](https://developers.google.com/apps-script/reference/calendar)
   - [AI-Powered Email Parser (GitHub)](https://github.com/NauneetPandey/AI-Calendar-Automator)

2. **Zapier** (LIMITED FREE)
   - 100 tasks/month on free tier
   - Easy setup, no coding
   - [Zapier Gmail → Calendar](https://zapier.com/apps/gmail/integrations/google-calendar)

3. **IFTTT** (VERY LIMITED)
   - Only 2 free applets
   - Not recommended
   - [IFTTT Free Tier Info](https://ifttt.com/explore/updates-to-free-tier-2023)

**Verdict:** Good for catching last-minute changes, but 7-day limit makes it insufficient for planning.

---

### Option 3: Web Scraping (Browser Automation)

**What it is:** Automated script that logs into Turno's web dashboard and scrapes the cleaning calendar.

**Cost:** FREE (with self-hosting)

**How it works:**
```
Scheduled script → Logs into Turno → Scrapes calendar view →
Parses cleaning events → Creates Google Calendar events → Our App syncs via iCal
```

**Pros:**
- Access to FULL schedule (not just 7 days)
- Can run on any schedule
- No dependency on Turno's limited email notifications

**Cons:**
- More complex setup
- Requires somewhere to run (local machine, server, or cloud)
- Could break if Turno changes their UI
- Need to handle login/authentication

**Implementation Options:**

1. **n8n (Self-Hosted Automation)** - RECOMMENDED
   - Free, open-source
   - Visual workflow builder
   - Has Puppeteer node for browser automation
   - Has Google Calendar integration built-in
   - Can self-host or use cloud version
   - Workflows export as JSON (can store in Git)
   - [n8n Website](https://n8n.io)
   - [n8n + Google Calendar](https://n8n.io/integrations/google-calendar/)

2. **Puppeteer / Playwright Script**
   - Free Node.js libraries
   - More control, more coding required
   - Can run locally or on free cloud tiers
   - [Playwright vs Puppeteer Comparison](https://www.scraperapi.com/blog/playwright-vs-puppeteer/)

3. **Browserless.io**
   - Cloud-hosted browser automation
   - Free tier available
   - Good if you don't want to manage infrastructure
   - [Browserless Website](https://www.browserless.io/)

**Verdict:** Best option for full schedule access, but most complex to set up.

---

### Option 4: Build Into Our App

**What it is:** Add the scraping logic directly to the Clean Right Now app.

**Cost:** FREE (but may need external service for browser automation)

**How it works:**
```
Our App → API route triggers scrape → Browserless.io runs Puppeteer →
Returns cleaning data → App creates jobs directly in database
```

**Pros:**
- Everything in one codebase
- No external automation tools to manage
- Direct database integration (skip Google Calendar middleman)

**Cons:**
- Puppeteer doesn't run on Vercel serverless
- Would need Browserless.io or similar service
- More maintenance burden in our codebase

**Implementation:**
```
/src/lib/turno-sync.ts           # Scraping logic
/src/app/api/sync/turno/route.ts # API endpoint to trigger sync
```

**Verdict:** Cleanest long-term solution if we commit to maintaining it.

---

## Comparison Matrix

| Option | Cost | Full Schedule | Complexity | Reliability |
|--------|------|---------------|------------|-------------|
| Task-Bird | Free | Yes | Low | High (but data trapped) |
| Email Parsing | Free | No (7 days) | Medium | Medium |
| n8n + Scraping | Free | Yes | Medium-High | Medium |
| Built into App | Free* | Yes | High | Medium |

*May need Browserless.io or similar for browser automation

---

## Recommended Approach

### Short Term (Now)
1. **Use Task-Bird** for cleaner coordination (it's free and works)
2. **Manual entry** of jobs into our app for now
3. **Set up Gmail parsing** for 7-day alerts as backup notification

### Medium Term (When Ready)
1. **Set up n8n** with Turno scraping workflow
2. Store workflow JSON in repo at `/n8n-workflows/`
3. Sync scraped data to Google Calendar
4. Our app pulls from Google Calendar via existing iCal sync

### Long Term (If Needed)
1. Build scraping directly into our app
2. Remove Google Calendar middleman
3. Direct Turno → Our Database pipeline

---

## Turno Email Format

*TODO: Add example of Turno notification email format here for reference when building parser*

```
Subject: [Example subject line]
From: notifications@turno.com

[Paste sanitized example email body here]
```

---

## n8n Workflow Outline

For when we're ready to implement the scraping solution:

```
1. Schedule Trigger (every 2-4 hours)
       ↓
2. Puppeteer: Navigate to turno.com, login
       ↓
3. Puppeteer: Go to calendar/schedule page
       ↓
4. HTML Extract: Parse cleaning events
       ↓
5. Loop through events:
   - Check if event exists in Google Calendar
   - If not, create new calendar event
       ↓
6. (Optional) Webhook to our app's /api/sync endpoint
```

---

## Related Links

- [Turno Help Center](https://help.turno.com/)
- [Turno iCal Import (not export)](https://help.turno.com/en/articles/2795682-syncing-a-rental-calendar-via-ical)
- [Our App's Calendar Settings](/settings/calendar) - existing iCal sync functionality

---

## Notes

- Turno's refusal to provide API/export is a business decision to lock users into their ecosystem
- Task-Bird partnership appears to be their answer to integration requests
- This situation may change if Turno faces enough customer pressure
- Consider periodically checking if Turno has added export features

---

*This document should be updated if any of these services change their offerings or if new integration options become available.*
