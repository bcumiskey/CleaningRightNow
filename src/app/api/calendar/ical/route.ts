import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { format } from 'date-fns'

// Generate iCal/ICS feed of jobs
// This URL can be subscribed to by Google Calendar, Apple Calendar, Outlook, Turno, etc.
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')
    const propertyId = searchParams.get('propertyId')

    // Validate token (simple token-based auth for calendar feeds)
    const user = await prisma.user.findFirst({
      where: {
        calendarToken: token,
      },
    })

    if (!token || !user) {
      return new NextResponse('Unauthorized - Invalid calendar token', { status: 401 })
    }

    // Build query
    const where: Record<string, unknown> = {
      status: {
        in: ['SCHEDULED', 'IN_PROGRESS'],
      },
    }

    if (propertyId) {
      where.propertyId = propertyId
    }

    // Get jobs for the next 90 days and past 30 days
    const jobs = await prisma.job.findMany({
      where: {
        ...where,
        scheduledDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        },
      },
      include: {
        property: true,
        teamAssignments: {
          include: {
            teamMember: true,
          },
        },
        services: {
          include: {
            service: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    })

    // Generate iCal content
    const icalContent = generateICalContent(jobs, user.businessName || 'Cleaning Right Now')

    return new NextResponse(icalContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="cleaning-schedule.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('iCal feed error:', error)
    return new NextResponse('Failed to generate calendar feed', { status: 500 })
  }
}

interface Job {
  id: string
  scheduledDate: Date
  scheduledTime: string | null
  status: string
  totalAmount: number
  notes: string | null
  property: {
    name: string
    address: string
  }
  teamAssignments: Array<{
    teamMember: {
      name: string
    }
  }>
  services: Array<{
    service: {
      name: string
    }
  }>
}

function generateICalContent(jobs: Job[], calendarName: string): string {
  const now = new Date()
  const timestamp = format(now, "yyyyMMdd'T'HHmmss'Z'")

  let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Cleaning Right Now//Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${calendarName} - Cleaning Schedule
X-WR-TIMEZONE:UTC
`

  for (const job of jobs) {
    const uid = `job-${job.id}@cleaningrightnow.com`
    const dateStr = format(job.scheduledDate, 'yyyyMMdd')

    // Parse time or default to 9 AM
    let startTime = '090000'
    let endTime = '120000' // Default 3 hour duration

    if (job.scheduledTime) {
      const [hours, minutes] = job.scheduledTime.split(':')
      startTime = `${hours.padStart(2, '0')}${minutes.padStart(2, '0')}00`
      // Add 3 hours for end time
      const endHour = (parseInt(hours) + 3) % 24
      endTime = `${endHour.toString().padStart(2, '0')}${minutes.padStart(2, '0')}00`
    }

    const dtStart = `${dateStr}T${startTime}`
    const dtEnd = `${dateStr}T${endTime}`

    // Build description
    const teamMembers = job.teamAssignments.map(a => a.teamMember.name).join(', ')
    const services = job.services.map(s => s.service.name).join(', ')

    let description = `Property: ${job.property.name}\\n`
    description += `Address: ${job.property.address}\\n`
    description += `Amount: $${job.totalAmount.toFixed(2)}\\n`
    if (services) description += `Services: ${services}\\n`
    if (teamMembers) description += `Team: ${teamMembers}\\n`
    if (job.notes) description += `Notes: ${job.notes.replace(/\n/g, '\\n')}\\n`

    const summary = `🧹 ${job.property.name}${job.status === 'IN_PROGRESS' ? ' [IN PROGRESS]' : ''}`
    const location = job.property.address

    ical += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${timestamp}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${escapeICalText(summary)}
DESCRIPTION:${escapeICalText(description)}
LOCATION:${escapeICalText(location)}
STATUS:${job.status === 'COMPLETED' ? 'COMPLETED' : 'CONFIRMED'}
END:VEVENT
`
  }

  ical += 'END:VCALENDAR'
  return ical
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}
