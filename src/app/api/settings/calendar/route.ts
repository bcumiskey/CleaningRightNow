import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

// Get calendar settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        calendarToken: true,
        turnoApiKey: true,
        googleCalendarId: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      calendarToken: user.calendarToken,
      turnoApiKey: user.turnoApiKey ? '********' : null, // Mask API key
      googleCalendarId: user.googleCalendarId,
      hasToken: !!user.calendarToken,
      hasTurnoKey: !!user.turnoApiKey,
    })
  } catch (error) {
    console.error('Calendar settings GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar settings' },
      { status: 500 }
    )
  }
}

// Update calendar settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { turnoApiKey, googleCalendarId } = body

    const updateData: Record<string, string | null> = {}

    if (turnoApiKey !== undefined) {
      updateData.turnoApiKey = turnoApiKey || null
    }

    if (googleCalendarId !== undefined) {
      updateData.googleCalendarId = googleCalendarId || null
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        calendarToken: true,
        turnoApiKey: true,
        googleCalendarId: true,
      },
    })

    return NextResponse.json({
      calendarToken: user.calendarToken,
      turnoApiKey: user.turnoApiKey ? '********' : null,
      googleCalendarId: user.googleCalendarId,
      hasToken: !!user.calendarToken,
      hasTurnoKey: !!user.turnoApiKey,
    })
  } catch (error) {
    console.error('Calendar settings PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update calendar settings' },
      { status: 500 }
    )
  }
}

// Generate new calendar token
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate a secure random token
    const calendarToken = crypto.randomBytes(32).toString('hex')

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { calendarToken },
      select: {
        calendarToken: true,
      },
    })

    return NextResponse.json({
      calendarToken: user.calendarToken,
      message: 'Calendar token generated successfully',
    })
  } catch (error) {
    console.error('Calendar token POST error:', error)
    return NextResponse.json(
      { error: 'Failed to generate calendar token' },
      { status: 500 }
    )
  }
}

// Revoke calendar token
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { calendarToken: null },
    })

    return NextResponse.json({
      message: 'Calendar token revoked successfully',
    })
  } catch (error) {
    console.error('Calendar token DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to revoke calendar token' },
      { status: 500 }
    )
  }
}
