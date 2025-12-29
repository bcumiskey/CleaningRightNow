import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncAllJobsToGoogleCalendar } from '@/lib/google-calendar'

// POST /api/calendar/google/sync - Sync all jobs to Google Calendar
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await syncAllJobsToGoogleCalendar(session.user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Not connected to Google Calendar' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
      message: `Synced ${result.synced} jobs to Google Calendar${result.errors > 0 ? ` (${result.errors} errors)` : ''}`,
    })
  } catch (error) {
    console.error('Google Calendar sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync with Google Calendar' },
      { status: 500 }
    )
  }
}
