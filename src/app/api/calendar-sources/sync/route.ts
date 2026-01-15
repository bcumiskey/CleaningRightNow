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
  jobsSkipped: number
  unmatchedEvents: string[]
  error?: string
}

interface ParsedEvent {
  uid: string
  summary: string
  start: Date
  end: Date
  description?: string
}

// Helper to extract property name from event summary
function extractPropertyName(summary: string): string | null {
  if (!summary) return null

  // Common patterns in vacation rental calendars:
  // "Property Name - Check-out"
  // "Check-out: Property Name"
  // "Checkout Property Name"
  // "Property Name (Guest Name)"
  // Just "Property Name"

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

      events.push({
        uid: event.uid,
        summary: event.summary || '',
        start: new Date(event.start),
        end: new Date(event.end),
        description: event.description || '',
      })
    }
  } catch (error) {
    console.error('Failed to parse iCal:', error)
    throw error
  }

  return events
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
        jobsSkipped: 0,
        unmatchedEvents: [],
      }

      try {
        // Parse the iCal feed
        const events = await parseICalFeed(source.icalUrl)
        result.eventsFound = events.length

        // Process each event
        for (const event of events) {
          // Use checkout (end) date for cleaning jobs
          // IMPORTANT: iCal all-day events use EXCLUSIVE end dates
          // e.g., a stay ending May 31st has DTEND = June 1st
          // We need to subtract one day to get the actual checkout date
          const jobDate = new Date(event.end)

          // Check if this is an all-day event (both start and end at midnight)
          // All-day events in iCal have dates without time components, which
          // node-ical parses as midnight (00:00:00)
          const startHours = event.start.getHours() + event.start.getMinutes() + event.start.getSeconds()
          const endHours = event.end.getHours() + event.end.getMinutes() + event.end.getSeconds()
          const isAllDayEvent = startHours === 0 && endHours === 0

          if (isAllDayEvent) {
            // Subtract one day to get the actual checkout/cleaning date
            jobDate.setDate(jobDate.getDate() - 1)
          }

          jobDate.setHours(0, 0, 0, 0)

          // Skip past events
          if (jobDate < today) continue

          // Find matching property
          const matchedProperty = await findMatchingProperty(event.summary, properties)

          if (!matchedProperty) {
            result.unmatchedEvents.push(event.summary)
            continue
          }

          // Check if job already exists (by externalId)
          const existingJob = await prisma.job.findFirst({
            where: {
              externalId: event.uid,
            },
          })

          if (existingJob) {
            // Check if date needs updating (fixes off-by-one errors from previous syncs)
            const existingDate = new Date(existingJob.date)
            existingDate.setHours(0, 0, 0, 0)

            if (existingDate.getTime() !== jobDate.getTime()) {
              // Update job date
              await prisma.job.update({
                where: { id: existingJob.id },
                data: { date: jobDate },
              })

              // Also update any invoice line items that reference this job
              await prisma.invoiceLineItem.updateMany({
                where: { jobId: existingJob.id },
                data: { date: jobDate },
              })

              result.jobsUpdated++
            } else {
              result.jobsSkipped++
            }
            continue
          }

          // Get property rate
          const property = properties.find((p: { id: string; name: string; baseRate: number; keywords: string | null }) => p.id === matchedProperty.id)
          const rate = property?.baseRate || 0

          // Create the job
          await prisma.job.create({
            data: {
              date: jobDate,
              propertyId: matchedProperty.id,
              rate,
              expensePercent: 12,
              source: source.type,
              externalId: event.uid,
            },
          })

          result.jobsCreated++
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
    const totalSkipped = results.reduce((sum, r) => sum + r.jobsSkipped, 0)
    const totalUnmatched = results.reduce((sum, r) => sum + r.unmatchedEvents.length, 0)

    return NextResponse.json({
      message: `Synced ${sources.length} calendar source(s)`,
      summary: {
        sourcesSynced: sources.length,
        jobsCreated: totalCreated,
        jobsUpdated: totalUpdated,
        jobsSkipped: totalSkipped,
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
