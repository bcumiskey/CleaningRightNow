import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { z } from 'zod'

const importSchema = z.object({
  url: z.string().url('Invalid URL'),
  propertyId: z.string().optional(), // If specified, all events go to this property
  defaultServiceId: z.string().optional(), // Default service to apply
  dryRun: z.boolean().optional().default(false), // Preview without creating jobs
})

interface ParsedEvent {
  uid: string
  summary: string
  description?: string
  location?: string
  dtstart: Date
  dtend?: Date
  status?: string
}

// Import iCal feed and create jobs from events
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = importSchema.parse(body)

    // Fetch the iCal feed
    const icalResponse = await fetch(validatedData.url, {
      headers: {
        'User-Agent': 'CleaningRightNow/1.0',
      },
    })

    if (!icalResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch calendar feed: ${icalResponse.statusText}` },
        { status: 400 }
      )
    }

    const icalContent = await icalResponse.text()

    // Parse iCal content
    const events = parseICalContent(icalContent)

    if (events.length === 0) {
      return NextResponse.json(
        { message: 'No events found in the calendar feed', imported: 0 },
        { status: 200 }
      )
    }

    // Get properties to match location
    const properties = await prisma.property.findMany({
      where: { active: true },
      select: { id: true, name: true, address: true },
    })

    // Get existing jobs to avoid duplicates (check by external UID)
    const existingJobs = await prisma.job.findMany({
      where: {
        notes: {
          contains: 'ImportUID:',
        },
      },
      select: { notes: true },
    })

    const existingUids = new Set(
      existingJobs
        .map((job) => {
          const match = job.notes?.match(/ImportUID:([^\s]+)/)
          return match ? match[1] : null
        })
        .filter(Boolean)
    )

    // Get default service for imported jobs
    let defaultService = null
    if (validatedData.defaultServiceId) {
      defaultService = await prisma.service.findUnique({
        where: { id: validatedData.defaultServiceId },
      })
    }
    if (!defaultService) {
      defaultService = await prisma.service.findFirst({
        where: { active: true },
        orderBy: { basePrice: 'desc' },
      })
    }

    // Process events
    const results = {
      total: events.length,
      imported: 0,
      skipped: 0,
      duplicates: 0,
      noPropertyMatch: 0,
      events: [] as Array<{
        summary: string
        date: string
        status: 'imported' | 'skipped' | 'duplicate' | 'no_property'
        propertyName?: string
        jobId?: string
      }>,
    }

    for (const event of events) {
      // Check for duplicates
      if (existingUids.has(event.uid)) {
        results.duplicates++
        results.events.push({
          summary: event.summary,
          date: event.dtstart.toISOString(),
          status: 'duplicate',
        })
        continue
      }

      // Skip events in the past
      if (event.dtstart < new Date()) {
        results.skipped++
        results.events.push({
          summary: event.summary,
          date: event.dtstart.toISOString(),
          status: 'skipped',
        })
        continue
      }

      // Match property by location or summary
      let matchedProperty = null

      if (validatedData.propertyId) {
        matchedProperty = properties.find((p) => p.id === validatedData.propertyId)
      } else if (event.location) {
        // Try to match by address
        matchedProperty = properties.find(
          (p) =>
            p.address.toLowerCase().includes(event.location!.toLowerCase()) ||
            event.location!.toLowerCase().includes(p.address.toLowerCase())
        )
      }

      if (!matchedProperty && event.summary) {
        // Try to match by name in summary
        matchedProperty = properties.find(
          (p) =>
            event.summary.toLowerCase().includes(p.name.toLowerCase()) ||
            p.name.toLowerCase().includes(event.summary.toLowerCase())
        )
      }

      if (!matchedProperty) {
        results.noPropertyMatch++
        results.events.push({
          summary: event.summary,
          date: event.dtstart.toISOString(),
          status: 'no_property',
        })
        continue
      }

      // Skip if dry run
      if (validatedData.dryRun) {
        results.imported++
        results.events.push({
          summary: event.summary,
          date: event.dtstart.toISOString(),
          status: 'imported',
          propertyName: matchedProperty.name,
        })
        continue
      }

      // Extract time from the event
      const scheduledTime = `${event.dtstart.getHours().toString().padStart(2, '0')}:${event.dtstart.getMinutes().toString().padStart(2, '0')}`

      // Create the job
      const job = await prisma.job.create({
        data: {
          propertyId: matchedProperty.id,
          scheduledDate: event.dtstart,
          scheduledTime: scheduledTime !== '00:00' ? scheduledTime : null,
          status: 'SCHEDULED',
          totalAmount: defaultService?.basePrice || 0,
          notes: `Imported from Turno\nImportUID:${event.uid}\n${event.description || ''}`.trim(),
          ...(defaultService && {
            services: {
              create: {
                serviceId: defaultService.id,
                price: defaultService.basePrice,
              },
            },
          }),
        },
      })

      await createAuditLog({
        userId: session.user.id,
        action: 'CREATE',
        entityType: 'Job',
        entityId: job.id,
        newValues: job,
        description: generateDescription(
          'CREATE',
          'Job',
          `Imported from Turno for ${matchedProperty.name}`
        ),
      })

      results.imported++
      results.events.push({
        summary: event.summary,
        date: event.dtstart.toISOString(),
        status: 'imported',
        propertyName: matchedProperty.name,
        jobId: job.id,
      })
    }

    return NextResponse.json({
      message: validatedData.dryRun
        ? 'Dry run completed - no jobs created'
        : `Successfully imported ${results.imported} jobs`,
      ...results,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Calendar import error:', error)
    return NextResponse.json(
      { error: 'Failed to import calendar feed' },
      { status: 500 }
    )
  }
}

// Parse iCal content into events
function parseICalContent(content: string): ParsedEvent[] {
  const events: ParsedEvent[] = []
  const lines = content.replace(/\r\n/g, '\n').replace(/\n /g, '').split('\n')

  let currentEvent: Partial<ParsedEvent> | null = null

  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.substring(0, colonIndex).split(';')[0]
    const value = line.substring(colonIndex + 1)

    switch (key) {
      case 'BEGIN':
        if (value === 'VEVENT') {
          currentEvent = {}
        }
        break

      case 'END':
        if (value === 'VEVENT' && currentEvent && currentEvent.uid && currentEvent.dtstart) {
          events.push(currentEvent as ParsedEvent)
          currentEvent = null
        }
        break

      case 'UID':
        if (currentEvent) {
          currentEvent.uid = value
        }
        break

      case 'SUMMARY':
        if (currentEvent) {
          currentEvent.summary = unescapeICalText(value)
        }
        break

      case 'DESCRIPTION':
        if (currentEvent) {
          currentEvent.description = unescapeICalText(value)
        }
        break

      case 'LOCATION':
        if (currentEvent) {
          currentEvent.location = unescapeICalText(value)
        }
        break

      case 'DTSTART':
        if (currentEvent) {
          currentEvent.dtstart = parseICalDate(value)
        }
        break

      case 'DTEND':
        if (currentEvent) {
          currentEvent.dtend = parseICalDate(value)
        }
        break

      case 'STATUS':
        if (currentEvent) {
          currentEvent.status = value
        }
        break
    }
  }

  return events
}

function parseICalDate(value: string): Date {
  // Handle formats: 20250115T090000Z, 20250115T090000, 20250115
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/)
  if (!match) {
    return new Date(value)
  }

  const [, year, month, day, hour, minute, second] = match
  const dateStr = `${year}-${month}-${day}T${hour || '00'}:${minute || '00'}:${second || '00'}`

  if (value.endsWith('Z')) {
    return new Date(dateStr + 'Z')
  }

  return new Date(dateStr)
}

function unescapeICalText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}
