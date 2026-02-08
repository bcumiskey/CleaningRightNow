import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { format } from 'date-fns'

// Helper to format date as YYYY-MM-DD in local timezone (not UTC)
function toLocalDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

// Helper to get next occurrence dates for a schedule
function getNextOccurrences(
  schedule: {
    frequency: string
    dayOfWeek: number | null
    dayOfMonth: number | null
    lastGeneratedDate: Date | null
    generateAheadDays: number
  },
  startFrom: Date,
  endDate: Date
): Date[] {
  const dates: Date[] = []
  const current = new Date(startFrom)
  current.setHours(0, 0, 0, 0)

  while (current <= endDate) {
    let isMatch = false

    switch (schedule.frequency) {
      case 'daily':
        isMatch = true
        break
      case 'weekly':
        isMatch = schedule.dayOfWeek !== null && current.getDay() === schedule.dayOfWeek
        break
      case 'biweekly':
        // For biweekly, we need to track which week we're in
        // Start from a reference point and check if it's an even/odd week
        if (schedule.dayOfWeek !== null && current.getDay() === schedule.dayOfWeek) {
          const referenceDate = new Date('2024-01-07') // A known Sunday
          const diffTime = current.getTime() - referenceDate.getTime()
          const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000))
          isMatch = diffWeeks % 2 === 0
        }
        break
      case 'monthly':
        if (schedule.dayOfMonth !== null) {
          // Handle end of month (if dayOfMonth is 31 but month has 30 days, use last day)
          const lastDayOfMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()
          const targetDay = Math.min(schedule.dayOfMonth, lastDayOfMonth)
          isMatch = current.getDate() === targetDay
        }
        break
    }

    if (isMatch) {
      dates.push(new Date(current))
    }

    current.setDate(current.getDate() + 1)
  }

  return dates
}

// POST: Generate jobs from a single schedule
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

    const data = await request.json()
    const { scheduleId } = data

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    const schedule = await prisma.recurringSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        property: true,
      },
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    if (!schedule.isActive) {
      return NextResponse.json({ error: 'Schedule is not active' }, { status: 400 })
    }

    // Calculate date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startFrom = schedule.lastGeneratedDate
      ? new Date(Math.max(schedule.lastGeneratedDate.getTime(), today.getTime()))
      : today
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + schedule.generateAheadDays)

    // Get dates that need jobs
    const dates = getNextOccurrences(schedule, startFrom, endDate)

    // Get existing jobs for this property in the date range to avoid duplicates
    const existingJobs = await prisma.job.findMany({
      where: {
        propertyId: schedule.propertyId,
        date: {
          gte: startFrom,
          lte: endDate,
        },
      },
      select: { date: true },
    })

    const existingDates = new Set(
      existingJobs.map((j: { date: Date }) => toLocalDateString(j.date))
    )

    // Create jobs for new dates only
    const newJobs = []
    for (const date of dates) {
      const dateStr = toLocalDateString(date)
      if (!existingDates.has(dateStr)) {
        const job = await prisma.job.create({
          data: {
            date,
            time: schedule.time,
            propertyId: schedule.propertyId,
            rate: schedule.rate || schedule.property.baseRate,
            expensePercent: schedule.expensePercent,
            source: 'recurring',
          },
        })
        newJobs.push(job)
      }
    }

    // Update last generated date
    await prisma.recurringSchedule.update({
      where: { id: scheduleId },
      data: { lastGeneratedDate: endDate },
    })

    return NextResponse.json({
      success: true,
      message: `Generated ${newJobs.length} new jobs`,
      jobsCreated: newJobs.length,
      jobs: newJobs,
    })
  } catch (error) {
    console.error('Generate jobs POST error:', error)
    return NextResponse.json({ error: 'Failed to generate jobs' }, { status: 500 })
  }
}

// PUT: Generate jobs from all active schedules
export async function PUT() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all active schedules
    const schedules = await prisma.recurringSchedule.findMany({
      where: { isActive: true },
      include: {
        property: true,
      },
    })

    const results = []
    let totalCreated = 0

    for (const schedule of schedules) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startFrom = schedule.lastGeneratedDate
        ? new Date(Math.max(schedule.lastGeneratedDate.getTime(), today.getTime()))
        : today
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + schedule.generateAheadDays)

      const dates = getNextOccurrences(schedule, startFrom, endDate)

      // Get existing jobs to avoid duplicates
      const existingJobs = await prisma.job.findMany({
        where: {
          propertyId: schedule.propertyId,
          date: {
            gte: startFrom,
            lte: endDate,
          },
        },
        select: { date: true },
      })

      const existingDates = new Set(
        existingJobs.map((j: { date: Date }) => toLocalDateString(j.date))
      )

      // Create jobs for new dates
      let created = 0
      for (const date of dates) {
        const dateStr = toLocalDateString(date)
        if (!existingDates.has(dateStr)) {
          await prisma.job.create({
            data: {
              date,
              time: schedule.time,
              propertyId: schedule.propertyId,
              rate: schedule.rate || schedule.property.baseRate,
              expensePercent: schedule.expensePercent,
              source: 'recurring',
            },
          })
          created++
        }
      }

      if (created > 0) {
        await prisma.recurringSchedule.update({
          where: { id: schedule.id },
          data: { lastGeneratedDate: endDate },
        })
      }

      results.push({
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        propertyName: schedule.property.name,
        jobsCreated: created,
      })
      totalCreated += created
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${totalCreated} new jobs from ${schedules.length} schedules`,
      totalJobsCreated: totalCreated,
      results,
    })
  } catch (error) {
    console.error('Generate all jobs PUT error:', error)
    return NextResponse.json({ error: 'Failed to generate jobs' }, { status: 500 })
  }
}
