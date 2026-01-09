import { NextResponse } from 'next/server'

// This endpoint is deprecated. Calendar sync functionality has been moved to /api/calendar-sources/sync
// Calendar sources are now managed in Settings > Calendar Integration

export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Please use /api/calendar-sources/sync instead.' },
    { status: 410 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Please use /api/calendar-sources/sync instead.' },
    { status: 410 }
  )
}
