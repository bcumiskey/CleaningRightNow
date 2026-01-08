import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Void functionality is temporarily disabled pending database migration
    return NextResponse.json({
      error: 'Invoice voiding is temporarily unavailable. Please delete the invoice and create a new one instead.'
    }, { status: 503 })

  } catch (error) {
    console.error('Invoice void error:', error)
    const message = error instanceof Error ? error.message : 'Failed to void invoice'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
