import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/settings/google - Get Google Calendar connection status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        googleAccessToken: true,
        googleCalendarId: true,
        googleTokenExpiry: true,
      },
    })

    const isConnected = !!user?.googleAccessToken
    const isExpired = user?.googleTokenExpiry ? user.googleTokenExpiry < new Date() : false

    return NextResponse.json({
      connected: isConnected && !isExpired,
      calendarId: user?.googleCalendarId || null,
      needsReauth: isConnected && isExpired,
    })
  } catch (error) {
    console.error('Google settings GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Google settings' },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/google - Disconnect Google Calendar
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Clear Google tokens
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        googleCalendarId: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Google disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Google Calendar' },
      { status: 500 }
    )
  }
}
