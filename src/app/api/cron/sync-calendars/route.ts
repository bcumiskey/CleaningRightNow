import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import ical from 'node-ical'
import { format, differenceInDays } from 'date-fns'

// This endpoint is called by Vercel Cron to auto-sync calendar feeds
// Schedule: Daily at 6:00 AM UTC (0 6 * * *)

interface ParsedEvent {
  uid: string
  summary: string
  start: Date
  end: Date
  description?: string
  isAllDay: boolean
}

// Helper to detect if an iCal date value is an all-day event
function isAllDayEvent(startVal: unknown, endVal: unknown): boolean {
  if (typeof startVal === 'object' && startVal !== null) {
    const startObj = startVal as Record<string, unknown>
    if (startObj.dateOnly === true) return true
    if (startObj.type === 'date') return true
  }

  if (startVal instanceof Date && endVal instanceof Date) {
    const startMidnight = startVal.getHours() === 0 && startVal.getMinutes() === 0 && startVal.getSeconds() === 0
    const endMidnight = endVal.getHours() === 0 && endVal.getMinutes() === 0 && endVal.getSeconds() === 0
    if (startMidnight && endMidnight) {
      const durationMs = endVal.getTime() - startVal.getTime()
      const durationDays = durationMs / (1000 * 60 * 60 * 24)
      if (Number.isInteger(durationDays) && durationDays >= 1) {
        return true
      }
    }
  }

  return false
}

// Parse iCal feed
async function parseICalFeed(url: string): Promise<ParsedEvent[]> {
  const events: ParsedEvent[] = []

  try {
    const data = await ical.async.fromURL(url)

    for (const key in data) {
      const event = data[key]
      if (event.type !== 'VEVENT') continue
      if (!event.uid || !event.start || !event.end) continue

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

// Parse event title to extract property name, B2B status, and dog info
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

// Extract renter name from event summary
function extractRenterName(summary: string): string | null {
  if (!summary) return null

  const parenMatch = summary.match(/\(([^)]+)\)\s*$/)
  if (parenMatch) return parenMatch[1].trim()

  const dashParts = summary.split(/\s*[-–—]\s*/)
  if (dashParts.length >= 2) {
    const lastPart = dashParts[dashParts.length - 1].trim()
    if (!/^(check-?out|checkout|cleaning|turnover|reserved|blocked)$/i.test(lastPart)) {
      return lastPart
    }
  }

  if (!/property|house|home|cabin|cottage|villa|apartment|unit|room|check|clean|turnover|reserved|blocked/i.test(summary)) {
    return summary.trim()
  }

  return null
}

// Find matching property by keywords or name
async function findMatchingProperty(
  eventSummary: string,
  properties: { id: string; name: string; keywords: string | null }[]
): Promise<{ id: string; name: string } | null> {
  // First try parsing the cleaning event title format
  const parsed = parseEventTitle(eventSummary)
  const normalizedParsed = parsed.propertyName.toLowerCase().trim()
  const normalizedSummary = eventSummary.toLowerCase().trim()

  // Check keywords first
  for (const prop of properties) {
    if (prop.keywords) {
      const keywordList = prop.keywords.split(',').map(k => k.trim().toLowerCase())
      for (const keyword of keywordList) {
        if (keyword && (normalizedParsed.includes(keyword) || normalizedSummary.includes(keyword))) {
          return prop
        }
      }
    }
  }

  // Exact match on parsed property name
  const exactMatch = properties.find(
    p => p.name.toLowerCase().trim() === normalizedParsed
  )
  if (exactMatch) return exactMatch

  // Contains match — property name in parsed name or full summary
  for (const prop of properties) {
    const propName = prop.name.toLowerCase().trim()
    if (normalizedParsed.includes(propName) || normalizedSummary.includes(propName)) {
      return prop
    }
  }

  return null
}

// Detect and flag B2B cleanings
async function detectAndFlagBackToBack(propertyIds: string[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const jobs = await prisma.job.findMany({
    where: {
      propertyId: { in: propertyIds },
      date: { gte: today },
    },
    orderBy: [{ propertyId: 'asc' }, { date: 'asc' }],
  })

  const jobsByPropertyDate = new Map<string, string[]>()
  for (const job of jobs) {
    const dateStr = job.date.toISOString().split('T')[0]
    const key = `${job.propertyId}-${dateStr}`
    if (!jobsByPropertyDate.has(key)) {
      jobsByPropertyDate.set(key, [])
    }
    jobsByPropertyDate.get(key)!.push(job.id)
  }

  const b2bJobIds: string[] = []
  const nonB2bJobIds: string[] = []

  for (const [, jobIds] of jobsByPropertyDate) {
    if (jobIds.length > 1) {
      b2bJobIds.push(...jobIds)
    } else {
      nonB2bJobIds.push(...jobIds)
    }
  }

  if (b2bJobIds.length > 0) {
    await prisma.job.updateMany({
      where: { id: { in: b2bJobIds } },
      data: { isBackToBack: true },
    })
  }

  if (nonB2bJobIds.length > 0) {
    await prisma.job.updateMany({
      where: { id: { in: nonB2bJobIds }, isBackToBack: true },
      data: { isBackToBack: false },
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (Vercel adds this header)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // In production, verify the cron secret
    if (process.env.NODE_ENV === 'production' && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Get all active calendar sources
    const sources = await prisma.calendarSource.findMany({
      where: { isActive: true },
    })

    if (sources.length === 0) {
      return NextResponse.json({ message: 'No active calendar sources', synced: 0 })
    }

    // Get all properties for matching
    const properties = await prisma.property.findMany({
      select: { id: true, name: true, baseRate: true, keywords: true },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let totalCreated = 0
    let totalUpdated = 0
    const syncedPropertyIds = new Set<string>()
    const errors: string[] = []

    for (const source of sources) {
      try {
        const events = await parseICalFeed(source.icalUrl)

        for (const event of events) {
          const jobDate = new Date(event.end)

          if (event.isAllDay) {
            // DTEND is exclusive for all-day events, subtract 1 day
            jobDate.setDate(jobDate.getDate() - 1)
          }

          jobDate.setHours(0, 0, 0, 0)

          if (jobDate < today) continue

          const matchedProperty = await findMatchingProperty(event.summary, properties)
          if (!matchedProperty) continue

          const parsedEvent = parseEventTitle(event.summary)
          const renterName = extractRenterName(event.summary)
          const property = properties.find(p => p.id === matchedProperty.id)
          const rate = property?.baseRate || 0

          const existingJob = await prisma.job.findFirst({
            where: { externalId: event.uid },
          })

          if (existingJob) {
            const dateChanged = existingJob.date.getTime() !== jobDate.getTime()
            const renterChanged = existingJob.renterName !== renterName

            if (dateChanged || renterChanged) {
              const oldDate = existingJob.date
              await prisma.job.update({
                where: { id: existingJob.id },
                data: {
                  date: jobDate,
                  propertyId: matchedProperty.id,
                  renterName,
                  isBackToBack: parsedEvent.isB2B || existingJob.isBackToBack,
                },
              })
              totalUpdated++

              // Create alert for date change
              if (dateChanged) {
                const renterPart = renterName ? ` - ${renterName}` : ''
                await prisma.alert.create({
                  data: {
                    type: 'job_modified',
                    message: `${matchedProperty.name} cleaning moved from ${format(oldDate, 'MMM d')} to ${format(jobDate, 'MMM d')}${renterPart}`,
                    jobId: existingJob.id,
                    propertyId: matchedProperty.id,
                  },
                })
              }
            }
          } else {
            const newJob = await prisma.job.create({
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
            totalCreated++

            // Create alert for new job within 7 days
            const daysUntilJob = differenceInDays(jobDate, today)
            if (daysUntilJob <= 7) {
              const renterPart = renterName ? ` - ${renterName}` : ''
              await prisma.alert.create({
                data: {
                  type: 'new_job_soon',
                  message: `New cleaning at ${matchedProperty.name} on ${format(jobDate, 'MMM d')}${renterPart}`,
                  jobId: newJob.id,
                  propertyId: matchedProperty.id,
                },
              })
            }
          }

          syncedPropertyIds.add(matchedProperty.id)
        }

        // Update source sync status
        await prisma.calendarSource.update({
          where: { id: source.id },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: 'success',
            lastSyncError: null,
          },
        })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${source.name}: ${errorMsg}`)

        await prisma.calendarSource.update({
          where: { id: source.id },
          data: {
            lastSyncAt: new Date(),
            lastSyncStatus: 'error',
            lastSyncError: errorMsg,
          },
        })
      }
    }

    // Detect and flag B2B cleanings
    if (syncedPropertyIds.size > 0) {
      await detectAndFlagBackToBack(Array.from(syncedPropertyIds))
    }

    return NextResponse.json({
      success: true,
      message: `Cron sync completed`,
      sourcesSynced: sources.length,
      jobsCreated: totalCreated,
      jobsUpdated: totalUpdated,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Cron sync error:', error)
    return NextResponse.json(
      { error: 'Cron sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
