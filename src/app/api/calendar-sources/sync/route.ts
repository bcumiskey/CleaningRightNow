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
  jobsRemoved: number
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
  summary = summary.replace(/^🧹\s*(Clean\s*)?/i, '').replace(/^Clean\s+/i, '').trim()
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
  // ALWAYS use parseEventTitle first — extract property name from "[Property Name] Cleaning [flags]"
  const parsed = parseEventTitle(eventSummary)
  const parsedName = parsed.propertyName.toLowerCase().trim()

  // Also try the legacy extraction as a fallback
  const extractedName = extractPropertyName(eventSummary)
  const normalizedExtracted = extractedName?.toLowerCase().trim() || parsedName

  // 1. Exact name match on parsed property name (highest priority)
  const exactMatch = properties.find(
    p => p.name.toLowerCase().trim() === parsedName
  )
  if (exactMatch) return exactMatch

  // 2. Exact match on legacy extracted name
  if (normalizedExtracted !== parsedName) {
    const exactLegacy = properties.find(
      p => p.name.toLowerCase().trim() === normalizedExtracted
    )
    if (exactLegacy) return exactLegacy
  }

  // 3. Keyword matching — keywords must match as WHOLE WORDS in the parsed property name
  // This prevents "deer" keyword matching "deer crossing" when it belongs to a different property
  for (const prop of properties) {
    if (prop.keywords) {
      const keywordList = prop.keywords.split(',').map(k => k.trim().toLowerCase())
      for (const keyword of keywordList) {
        if (keyword && keyword.length >= 3) {
          // Word boundary match — "deer" matches "deer crossing" but "dog" doesn't match "dogwood"
          const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const wordBoundary = new RegExp(`\\b${escaped}\\b`, 'i')
          if (wordBoundary.test(parsedName)) {
            return prop
          }
        }
      }
    }
  }

  // 4. Contains match — property name appears within the parsed name
  const containsMatch = properties.find(
    p => parsedName.includes(p.name.toLowerCase().trim())
  )
  if (containsMatch) return containsMatch

  // 5. Reverse contains — parsed name appears within property name
  const reverseMatch = properties.find(
    p => p.name.toLowerCase().trim().includes(parsedName)
  )
  if (reverseMatch) return reverseMatch

  // No fuzzy matching — too error-prone. If we can't match precisely, skip the event.
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

    // Collect ALL seen UIDs across ALL sources — stale cleanup happens once at end
    const allSeenExternalIds = new Set<string>()
    // Track all synced property IDs for B2B detection at end
    const allSyncedPropertyIds = new Set<string>()

    for (const source of sources) {
      const result: SyncResult = {
        sourceId: source.id,
        sourceName: source.name,
        status: 'success',
        eventsFound: 0,
        jobsCreated: 0,
        jobsUpdated: 0,
        jobsUnchanged: 0,
        jobsRemoved: 0,
        unmatchedEvents: [],
      }

      try {
        // Parse the iCal feed
        const events = await parseICalFeed(source.icalUrl)
        result.eventsFound = events.length

        // If this calendar source has a propertyPattern, use it as a direct property link.
        // This overrides per-event title matching — ALL events from this source go to that property.
        let sourceLinkedProperty: { id: string; name: string } | null = null
        if (source.propertyPattern) {
          const pattern = source.propertyPattern.trim().toLowerCase()
          sourceLinkedProperty = properties.find(
            (p: { id: string; name: string }) =>
              p.id === source.propertyPattern ||
              p.name.toLowerCase().trim() === pattern
          ) || null
        }

        // Process each event
        for (const event of events) {
          // Track every UID from every feed for stale cleanup
          if (event.uid) allSeenExternalIds.add(event.uid)

          const jobDate = new Date(event.end)

          if (event.isAllDay) {
            // DTEND is exclusive for all-day events, subtract 1 day
            jobDate.setDate(jobDate.getDate() - 1)
          }

          // Use noon to avoid timezone shift issues.
          // Midnight UTC shifts to previous day in EST/EDT (UTC-5/4).
          jobDate.setHours(12, 0, 0, 0)

          // Skip past events
          if (jobDate < today) continue

          // Find matching property — source-level link takes priority over event title matching
          const matchedProperty = sourceLinkedProperty
            || await findMatchingProperty(event.summary, properties)

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
            const dateChanged = existingJob.date.getTime() !== jobDate.getTime()
            const renterChanged = existingJob.renterName !== renterName
            const b2bChanged = existingJob.isBackToBack !== parsedEvent.isB2B
            const propertyChanged = existingJob.propertyId !== matchedProperty.id

            if (dateChanged || renterChanged || b2bChanged || propertyChanged) {
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

          allSyncedPropertyIds.add(matchedProperty.id)
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

    // Stale cleanup: AFTER processing ALL sources, delete future calendar-synced
    // jobs whose UIDs no longer appear in ANY feed (event was deleted from calendar).
    // Done once at end so source A doesn't accidentally delete source B's jobs.
    let totalStaleRemoved = 0
    if (allSeenExternalIds.size > 0) {
      const staleJobs = await prisma.job.findMany({
        where: {
          source: { not: 'manual' },
          externalId: { not: null },
          date: { gte: today },
          NOT: { externalId: { in: Array.from(allSeenExternalIds) } },
        },
        select: { id: true },
      })

      for (const staleJob of staleJobs) {
        const assignmentCount = await prisma.jobAssignment.count({
          where: { jobId: staleJob.id },
        })
        if (assignmentCount === 0) {
          await prisma.job.delete({ where: { id: staleJob.id } })
          totalStaleRemoved++
        }
      }
    }

    // Detect and flag B2B cleanings across all synced properties
    if (allSyncedPropertyIds.size > 0) {
      await detectAndFlagBackToBack(Array.from(allSyncedPropertyIds))
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
        jobsRemoved: totalStaleRemoved,
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
