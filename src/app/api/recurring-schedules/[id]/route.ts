import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Get a single recurring schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const schedule = await prisma.recurringSchedule.findUnique({
      where: { id },
      include: {
        property: {
          select: { id: true, name: true, baseRate: true },
        },
      },
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    return NextResponse.json(schedule)
  } catch (error) {
    console.error('Recurring schedule GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch recurring schedule' }, { status: 500 })
  }
}

// Update a recurring schedule
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update schedules
    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const data = await request.json()

    interface UpdateData {
      name?: string
      isActive?: boolean
      frequency?: string
      dayOfWeek?: number | null
      dayOfMonth?: number | null
      time?: string | null
      rate?: number | null
      expensePercent?: number
      autoAssignTeam?: boolean
      generateAheadDays?: number
    }
    const updateData: UpdateData = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.frequency !== undefined) updateData.frequency = data.frequency
    if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek !== '' ? parseInt(data.dayOfWeek) : null
    if (data.dayOfMonth !== undefined) updateData.dayOfMonth = data.dayOfMonth ? parseInt(data.dayOfMonth) : null
    if (data.time !== undefined) updateData.time = data.time || null
    if (data.rate !== undefined) updateData.rate = data.rate ? parseFloat(data.rate) : null
    if (data.expensePercent !== undefined) updateData.expensePercent = parseFloat(data.expensePercent)
    if (data.autoAssignTeam !== undefined) updateData.autoAssignTeam = data.autoAssignTeam
    if (data.generateAheadDays !== undefined) updateData.generateAheadDays = parseInt(data.generateAheadDays)

    const schedule = await prisma.recurringSchedule.update({
      where: { id },
      data: updateData,
      include: {
        property: {
          select: { id: true, name: true, baseRate: true },
        },
      },
    })

    return NextResponse.json(schedule)
  } catch (error) {
    console.error('Recurring schedule PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update recurring schedule' }, { status: 500 })
  }
}

// Delete a recurring schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete schedules
    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    await prisma.recurringSchedule.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Schedule deleted' })
  } catch (error) {
    console.error('Recurring schedule DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete recurring schedule' }, { status: 500 })
  }
}
