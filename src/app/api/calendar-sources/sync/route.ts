import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import ical from 'node-ical'

interface SyncResult {
  sourceId: string
  sourceName: string
  status: 'success' | 'error'
  eventsFound: number
  jobsCreated: number
  jobsUpdated: number
  jobsUnchanged: number
  unmatchedEvents: string[]
  error?: string
}

interface ParsedEvent {
  uid: string
  summary: string
  start: Date
  end: Date
  description?: string
  isAllDay: boolean  // Track if this is an all-day event
}

// Parse event title to extract property name, B2B status, and dog info
// Event title format: "[Property Name] Cleaning [optional flags]"
interface ParsedCalendarEvent {
  propertyName: string
  isB2B: boolean
  dogCount: number
  dogFee: number
}

function parseEventTitle(summary: string): ParsedCalendarEvent {
  const cleaningIndex = summary.indexOf(' Cleaning')
  const propertyName = cleaningIndex > -1
    ? summary.substring(0, cleaningIndex).trim()
    : summary.trim()

  const isB2B = summary.includes('⚡B2B')
  const dogCount = (summary.match(/🐕/g) || []).length
  const dogFee = dogCount * 50

  return { propertyName, isB2B, dogCount, dogFee }
}

// Helper to extract renter/guest name from event summary
function extractRenterName(summary: string): string | null {
  if (!summary) return null

  // Common patterns:
  // "Property Name - Guest Name"
  // "Guest Name @ Property"
  // "Reserved - Guest Name"
  // "Property (Guest Name)"

  // Try parenthetical pattern first: "Property (Guest Name)"
  const parenMatch = summary.match(/\(([^)]+)\)\s*$/)
  if (parenMatch) return parenMatch[1].trim()

  // Try "Reserved - Guest" or "Property - Guest"
  const dashParts = summary.split(/\s*[-–—]\s*/)
  if (dashParts.length >= 2) {
    // The last part is often the guest name
    const lastPart = dashParts[dashParts.length - 1].trim()
    // Skip if it's a common keyword
    if (!/^(check-?out|checkout|cleaning|turnover|reserved|blocked)$/i.test(lastPart)) {
      return lastPart
    }
  }

  // For simple summaries that are just a name
  // Skip if it looks like a property name or keyword
  if (!/property|house|home|cabin|cottage|villa|apartment|unit|room|check|clean|turnover|reserved|blocked/i.test(summary)) {
    return summary.trim()
  }

  return null
}

// Helper to extract property name from event summary
function extractPropertyName(summary: string): string | null {
  if (!summary) return null

  // First try the cleaning event format: "[Property Name] Cleaning [flags]"
  const parsed = parseEventTitle(summary)
  if (parsed.propertyName && summary.includes(' Cleaning')) {
    return parsed.propertyName
  }

  // Fallback: Common patterns in vacation rental calendars
  let propertyName = summary

  // Remove common prefixes/suffixes
  propertyName = propertyName
    .replace(/^(check-?out|checkout|cleaning|turnover|reserved|blocked)\s*[-:]\s*/i, '')
    .replace(/\s*[-:]\s*(check-?out|checkout|cleaning|turnover|reserved|blocked)$/i, '')
    .replace(/\s*\([^)]+\)\s*$/, '') // Remove trailing parenthetical (guest names)
    .trim()

  return propertyName || null
}

// Find best matching property by name and keywords
async function findMatchingProperty(
  eventSummary: string,
  properties: { id: string; name: string; keywords: string | null }[]
): Promise<{ id: string; name: string } | null> {
  const extractedName = extractPropertyName(eventSummary)
  if (!extractedName) return null

  const normalizedExtracted = extractedName.toLowerCase().trim()
  const originalSummaryLower = eventSummary.toLowerCase().trim()

  // First, check keywords - most reliable match
  for (const prop of properties) {
    if (prop.keywords) {
      const keywordList = prop.keywords.split(',').map(k => k.trim().toLowerCase())
      for (const keyword of keywordList) {
        if (keyword && (originalSummaryLower.includes(keyword) || normalizedExtracted.includes(keyword))) {
          return prop
        }
      }
    }
  }

  // Exact name match
  let match = properties.find(
    p => p.name.toLowerCase().trim() === normalizedExtracted
  )
  if (match) return match

  // Contains match (property name appears in event)
  match = properties.find(
    p => normalizedExtracted.includes(p.name.toLowerCase().trim())
  )
  if (match) return match

  // Reverse contains (event text appears in property name)
  match = properties.find(
    p => p.name.toLowerCase().trim().includes(normalizedExtracted)
  )
  if (match) return match

  // Fuzzy match - check if most words match
  const extractedWords = normalizedExtracted.split(/\s+/).filter(w => w.length > 2)
  for (const prop of properties) {
    const propWords = prop.name.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    const matchingWords = extractedWords.filter(w =>
      propWords.some(pw => pw.includes(w) || w.includes(pw))
    )
    if (matchingWords.length >= Math.min(2, extractedWords.length)) {
      return prop
    }
  }

  return null
}

// Helper to detect if an iCal date value is an all-day event (DATE vs DATETIME)
// All-day events use DATE format (YYYYMMDD) without time component
// Timed events use DATETIME format (YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ)
function isAllDayEvent(startVal: unknown, endVal: unknown): boolean {
  // Method 1: Check for dateOnly property (some node-ical versions)
  if (typeof startVal === 'object' && startVal !== null) {
    const startObj = startVal as Record<string, unknown>
    if (startObj.dateOnly === true) return true
    // Check for ical.js style type property
    if (startObj.type === 'date') return true
  }

  // Method 2: Check if the Date objects are at midnight (00:00:00)
  // This is a fallback - all-day events are typically parsed as midnight
  // BUT we need both start AND end to be at midnight to confirm
  if (startVal instanceof Date && endVal instanceof Date) {
    const startMidnight = startVal.getHours() === 0 && startVal.getMinutes() === 0 && startVal.getSeconds() === 0
    const endMidnight = endVal.getHours() === 0 && endVal.getMinutes() === 0 && endVal.getSeconds() === 0
    // If both are midnight AND the duration is whole days, it's likely all-day
    if (startMidnight && endMidnight) {
      const durationMs = endVal.getTime() - startVal.getTime()
      const durationDays = durationMs / (1000 * 60 * 60 * 24)
      // All-day events have whole-day durations
      if (Number.isInteger(durationDays) && durationDays >= 1) {
        return true
      }
    }
  }

  return false
}

// Parse iCal feed and extract events
async function parseICalFeed(url: string): Promise<ParsedEvent[]> {
  const events: ParsedEvent[] = []

  try {
    const data = await ical.async.fromURL(url)

    for (const key in data) {
      const event = data[key]
      if (event.type !== 'VEVENT') continue

      // Skip events without required data
      if (!event.uid || !event.start || !event.end) continue

      // Detect if this is an all-day event
      // node-ical preserves some metadata on the date objects
      const allDay = isAllDayEvent(event.start, event.end)

      events.push({
        uid: event.uid,
        summary: event.summary || '',
        start: new Date(event.start),
        end: new Date(event.end),
        description: event.description || '',
        isAllDay: allDay,
      })
    }
  } catch (error) {
    console.error('Failed to parse iCal:', error)
    throw error
  }

  return events
}

// Detect and flag back-to-back cleanings
// B2B = multiple bookings on the same property where one checkout = another check-in
async function detectAndFlagBackToBack(propertyIds: string[]) {
  // Get all future jobs for these properties
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const jobs = await prisma.job.findMany({
    where: {
      propertyId: { in: propertyIds },
      date: { gte: today },
    },
    orderBy: [{ propertyId: 'asc' }, { date: 'asc' }],
  })

  // Group jobs by property and date
  const jobsByPropertyDate = new Map<string, string[]>()
  for (const job of jobs) {
    const dateStr = job.date.toISOString().split('T')[0]
    const key = `${job.propertyId}-${dateStr}`
    if (!jobsByPropertyDate.has(key)) {
      jobsByPropertyDate.set(key, [])
    }
    jobsByPropertyDate.get(key)!.push(job.id)
  }

  // Find dates with multiple jobs (B2B situation)
  const b2bJobIds: string[] = []
  const nonB2bJobIds: string[] = []

  for (const [, jobIds] of jobsByPropertyDate) {
    if (jobIds.length > 1) {
      // Multiple jobs same day = B2B
      b2bJobIds.push(...jobIds)
    } else {
      nonB2bJobIds.push(...jobIds)
    }
  }

  // Update B2B flags
  if (b2bJobIds.length > 0) {
    await prisma.job.updateMany({
      where: { id: { in: b2bJobIds } },
      data: { isBackToBack: true },
    })
  }

  // Clear B2B flag for jobs that are no longer B2B
  if (nonB2bJobIds.length > 0) {
    await prisma.job.updateMany({
      where: { id: { in: nonB2bJobIds }, isBackToBack: true },
      data: { isBackToBack: false },
    })
  }
}

// POST - Sync all active calendar sources (or specific one)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const sourceId = body.sourceId // Optional: sync specific source

    // Get calendar sources to sync
    const sources = await prisma.calendarSource.findMany({
      where: sourceId
        ? { id: sourceId }
        : { isActive: true },
    })

    if (sources.length === 0) {
      return NextResponse.json({
        message: 'No calendar sources to sync',
        results: [],
      })
    }

    // Get all properties for matching (including keywords for better matching)
    const properties = await prisma.property.findMany({
      select: { id: true, name: true, baseRate: true, keywords: true },
    })

    const results: SyncResult[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const source of sources) {
      const result: SyncResult = {
        sourceId: source.id,
        sourceName: source.name,
        status: 'success',
        eventsFound: 0,
        jobsCreated: 0,
        jobsUpdated: 0,
        jobsUnchanged: 0,
        unmatchedEvents: [],
      }

      try {
        // Parse the iCal feed
        const events = await parseICalFeed(source.icalUrl)
        result.eventsFound = events.length

        // Track property IDs that had jobs synced for B2B detection
        const syncedPropertyIds = new Set<string>()

        // Process each event
        for (const event of events) {
          // Calculate the cleaning/checkout date from the iCal event
          // CRITICAL: iCal RFC 5545 specifies that DTEND for all-day events is EXCLUSIVE
          // This means a guest staying Jan 1-3 has DTEND=20250104 (Jan 4)
          // We must subtract 1 day to get the actual checkout date (Jan 3)
          //
          // THE RULE: Checkout date = cleaning date. No shifting. If guest checks
          // out Jan 3rd, cleaning happens Jan 3rd.

          const jobDate = new Date(event.end)

          if (event.isAllDay) {
            // For all-day events: DTEND is exclusive, subtract 1 day
            // Example: Stay Jan 1-3 → DTSTART=20250101, DTEND=20250104
            // Actual checkout = Jan 3 (DTEND minus 1 day)
            jobDate.setDate(jobDate.getDate() - 1)
          }
          // For timed events: DTEND is the actual end datetime, just use the date portion

          // Use noon (12:00) to avoid timezone shift issues.
          // Midnight UTC (00:00) shifts to the previous day in EST/EDT (UTC-5/4).
          // Noon UTC stays on the correct calendar day in all US timezones.
          jobDate.setHours(12, 0, 0, 0)

          // Skip past events
          if (jobDate < today) continue

          // Find matching property
          const matchedProperty = await findMatchingProperty(event.summary, properties)

          if (!matchedProperty) {
            result.unmatchedEvents.push(event.summary)
            continue
          }

          // Parse event title for property name, B2B, and dog info
          const parsedEvent = parseEventTitle(event.summary)

          // Extract renter name from event
          const renterName = extractRenterName(event.summary)

          // Get property rate
          const property = properties.find((p: { id: string; name: string; baseRate: number; keywords: string | null }) => p.id === matchedProperty.id)
          const rate = property?.baseRate || 0

          // Check if job already exists (by externalId/UID)
          const existingJob = await prisma.job.findFirst({
            where: {
              externalId: event.uid,
            },
          })

          if (existingJob) {
            // UPDATE existing job — only update calendar-sourced fields
            // NEVER overwrite: crew assignments, pay splits, manual adjustments, publish status
            const dateChanged = existingJob.date.getTime() !== jobDate.getTime()
            const renterChanged = existingJob.renterName !== renterName
            const b2bChanged = existingJob.isBackToBack !== parsedEvent.isB2B

            if (dateChanged || renterChanged || b2bChanged) {
              await prisma.job.update({
                where: { id: existingJob.id },
                data: {
                  date: jobDate,
                  propertyId: matchedProperty.id,
                  renterName,
                  isBackToBack: parsedEvent.isB2B || existingJob.isBackToBack,
                },
              })
              result.jobsUpdated++
            } else {
              result.jobsUnchanged++
            }
          } else {
            // Secondary dedup: check for existing job with same property + date
            const duplicateJob = await prisma.job.findFirst({
              where: {
                propertyId: matchedProperty.id,
                date: jobDate,
              },
            })

            if (duplicateJob) {
              const needsUpdate = !duplicateJob.externalId || duplicateJob.renterName !== renterName
              if (needsUpdate) {
                await prisma.job.update({
                  where: { id: duplicateJob.id },
                  data: {
                    externalId: event.uid,
                    ...(renterName && !duplicateJob.renterName ? { renterName } : {}),
                    isBackToBack: parsedEvent.isB2B || duplicateJob.isBackToBack,
                  },
                })
                result.jobsUpdated++
              } else {
                result.jobsUnchanged++
              }
            } else {
              // CREATE new job — no duplicate found
              await prisma.job.create({
                data: {
                  date: jobDate,
                  propertyId: matchedProperty.id,
                  rate,
                  expensePercent: 12,
                  source: source.type,
                  externalId: event.uid,
                  renterName,
                  isBackToBack: parsedEvent.isB2B,
                },
              })
              result.jobsCreated++
            }
          }

          syncedPropertyIds.add(matchedProperty.id)
        }

        // Detect and flag B2B (back-to-back) cleanings
        // B2B = same property has multiple jobs on same day (checkout and new check-in)
        if (syncedPropertyIds.size > 0) {
          await detectAndFlagBackToBack(Array.from(syncedPropertyIds))
        }

        // Update source sync status
        await prisma.calendarSource.update({
          where: { id: source.id },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: 'success',
            lastSyncError: null,
            lastSyncCount: result.eventsFound,
          },
        })
      } catch (error) {
        result.status = 'error'
        result.error = error instanceof Error ? error.message : 'Unknown error'

        // Update source with error status
        await prisma.calendarSource.update({
          where: { id: source.id },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: 'error',
            lastSyncError: result.error,
          },
        })
      }

      results.push(result)
    }

    // Summary
    const totalCreated = results.reduce((sum, r) => sum + r.jobsCreated, 0)
    const totalUpdated = results.reduce((sum, r) => sum + r.jobsUpdated, 0)
    const totalUnchanged = results.reduce((sum, r) => sum + r.jobsUnchanged, 0)
    const totalUnmatched = results.reduce((sum, r) => sum + r.unmatchedEvents.length, 0)

    return NextResponse.json({
      message: `Synced ${sources.length} calendar source(s)`,
      summary: {
        sourcesSynced: sources.length,
        jobsCreated: totalCreated,
        jobsUpdated: totalUpdated,
        jobsUnchanged: totalUnchanged,
        unmatchedEvents: totalUnmatched,
      },
      results,
    })
  } catch (error) {
    console.error('Calendar sync error:', error)
    return NextResponse.json({ error: 'Failed to sync calendars' }, { status: 500 })
  }
}

// GET - Get sync status for all sources
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sources = await prisma.calendarSource.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        lastSyncError: true,
        lastSyncCount: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(sources)
  } catch (error) {
    console.error('Sync status GET error:', error)
    return NextResponse.json({ error: 'Failed to get sync status' }, { status: 500 })
  }
}
