import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import ical from 'node-ical'

interface ICalEvent {
  type: string
  uid: string
  start: Date
  end: Date
  summary?: string
  description?: string
}

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

    const { propertyId } = await request.json()

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 })
    }

    // Get property with iCal URL
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    if (!property.icalUrl) {
      return NextResponse.json({ error: 'No calendar URL configured for this property' }, { status: 400 })
    }

    // Fetch and parse iCal feed
    let events: ICalEvent[]
    try {
      const icalData = await ical.async.fromURL(property.icalUrl)
      events = Object.values(icalData)
        .filter((event): event is ICalEvent =>
          event.type === 'VEVENT' &&
          event.start instanceof Date
        )
    } catch (error) {
      console.error('Failed to fetch iCal:', error)
      return NextResponse.json({ error: 'Failed to fetch calendar feed' }, { status: 502 })
    }

    // Get existing jobs for this property to avoid duplicates
    const existingJobs = await prisma.job.findMany({
      where: {
        propertyId: property.id,
        source: { in: ['turno', 'google'] },
      },
      select: { externalId: true },
    })
    const existingIds = new Set(existingJobs.map((j) => j.externalId))

    // Filter to future events and checkout dates (typically when cleaning happens)
    const now = new Date()
    const futureEvents = events.filter((event) => {
      const eventDate = new Date(event.start)
      return eventDate >= now
    })

    // Create jobs for new events
    let created = 0
    let skipped = 0

    for (const event of futureEvents) {
      const externalId = event.uid

      if (existingIds.has(externalId)) {
        skipped++
        continue
      }

      // For vacation rentals, the checkout date is typically when cleaning happens
      // The event end date is checkout, start date is check-in
      const cleaningDate = event.end || event.start

      // Determine source based on URL pattern
      const source = property.icalUrl?.includes('turno') ? 'turno' :
                     property.icalUrl?.includes('google') ? 'google' : 'turno'

      await prisma.job.create({
        data: {
          date: cleaningDate,
          propertyId: property.id,
          rate: property.baseRate,
          expensePercent: 12,
          source,
          externalId,
          completed: false,
        },
      })
      created++
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${created} new jobs, ${skipped} already existed`,
      created,
      skipped,
      total: futureEvents.length,
    })
  } catch (error) {
    console.error('Calendar sync error:', error)
    return NextResponse.json({ error: 'Failed to sync calendar' }, { status: 500 })
  }
}

// Sync all properties with calendar URLs
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all properties with iCal URLs
    const properties = await prisma.property.findMany({
      where: {
        icalUrl: { not: null },
      },
    })

    const results = []

    for (const property of properties) {
      if (!property.icalUrl) continue

      try {
        const icalData = await ical.async.fromURL(property.icalUrl)
        const events = Object.values(icalData)
          .filter((event): event is ICalEvent =>
            event.type === 'VEVENT' &&
            event.start instanceof Date
          )

        const existingJobs = await prisma.job.findMany({
          where: {
            propertyId: property.id,
            source: { in: ['turno', 'google'] },
          },
          select: { externalId: true },
        })
        const existingIds = new Set(existingJobs.map((j) => j.externalId))

        const now = new Date()
        const futureEvents = events.filter((event) => new Date(event.start) >= now)

        let created = 0
        for (const event of futureEvents) {
          if (existingIds.has(event.uid)) continue

          const cleaningDate = event.end || event.start
          const source = property.icalUrl?.includes('turno') ? 'turno' :
                         property.icalUrl?.includes('google') ? 'google' : 'turno'

          await prisma.job.create({
            data: {
              date: cleaningDate,
              propertyId: property.id,
              rate: property.baseRate,
              expensePercent: 12,
              source,
              externalId: event.uid,
              completed: false,
            },
          })
          created++
        }

        results.push({
          property: property.name,
          created,
          total: futureEvents.length,
        })
      } catch (error) {
        results.push({
          property: property.name,
          error: 'Failed to sync',
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('Bulk calendar sync error:', error)
    return NextResponse.json({ error: 'Failed to sync calendars' }, { status: 500 })
  }
}
