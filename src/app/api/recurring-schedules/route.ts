import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Get all recurring schedules (optionally filtered by property)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    const schedules = await prisma.recurringSchedule.findMany({
      where: propertyId ? { propertyId } : undefined,
      include: {
        property: {
          select: { id: true, name: true, baseRate: true },
        },
      },
      orderBy: [
        { property: { name: 'asc' } },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(schedules)
  } catch (error) {
    console.error('Recurring schedules GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch recurring schedules' }, { status: 500 })
  }
}

// Create a new recurring schedule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can create schedules
    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await request.json()

    // Validate required fields
    if (!data.propertyId || !data.name || !data.frequency) {
      return NextResponse.json(
        { error: 'Property, name, and frequency are required' },
        { status: 400 }
      )
    }

    // Validate frequency
    const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly']
    if (!validFrequencies.includes(data.frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency. Must be daily, weekly, biweekly, or monthly' },
        { status: 400 }
      )
    }

    // Weekly/biweekly requires dayOfWeek
    if ((data.frequency === 'weekly' || data.frequency === 'biweekly') && data.dayOfWeek === undefined) {
      return NextResponse.json(
        { error: 'Day of week is required for weekly/biweekly schedules' },
        { status: 400 }
      )
    }

    // Monthly requires dayOfMonth
    if (data.frequency === 'monthly' && !data.dayOfMonth) {
      return NextResponse.json(
        { error: 'Day of month is required for monthly schedules' },
        { status: 400 }
      )
    }

    const schedule = await prisma.recurringSchedule.create({
      data: {
        propertyId: data.propertyId,
        name: data.name,
        isActive: data.isActive !== false,
        frequency: data.frequency,
        dayOfWeek: data.dayOfWeek !== undefined ? parseInt(data.dayOfWeek) : null,
        dayOfMonth: data.dayOfMonth ? parseInt(data.dayOfMonth) : null,
        time: data.time || null,
        rate: data.rate ? parseFloat(data.rate) : null,
        expensePercent: data.expensePercent ? parseFloat(data.expensePercent) : 12,
        autoAssignTeam: data.autoAssignTeam || false,
        generateAheadDays: data.generateAheadDays ? parseInt(data.generateAheadDays) : 30,
      },
      include: {
        property: {
          select: { id: true, name: true, baseRate: true },
        },
      },
    })

    return NextResponse.json(schedule)
  } catch (error) {
    console.error('Recurring schedules POST error:', error)
    return NextResponse.json({ error: 'Failed to create recurring schedule' }, { status: 500 })
  }
}
