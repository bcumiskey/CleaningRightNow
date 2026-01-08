import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Fetch all calendar sources
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sources = await prisma.calendarSource.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(sources)
  } catch (error) {
    console.error('Calendar sources GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch calendar sources' }, { status: 500 })
  }
}

// POST - Create new calendar source
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

    if (!data.name || !data.icalUrl) {
      return NextResponse.json(
        { error: 'Name and iCal URL are required' },
        { status: 400 }
      )
    }

    // Detect type from URL if not provided
    let type = data.type || 'other'
    if (!data.type) {
      const urlLower = data.icalUrl.toLowerCase()
      if (urlLower.includes('turno')) type = 'turno'
      else if (urlLower.includes('google')) type = 'google'
      else if (urlLower.includes('airbnb')) type = 'airbnb'
      else if (urlLower.includes('vrbo')) type = 'vrbo'
    }

    const source = await prisma.calendarSource.create({
      data: {
        name: data.name,
        type,
        icalUrl: data.icalUrl,
        isActive: data.isActive !== false,
        propertyPattern: data.propertyPattern || null,
      },
    })

    return NextResponse.json(source)
  } catch (error) {
    console.error('Calendar source POST error:', error)
    return NextResponse.json({ error: 'Failed to create calendar source' }, { status: 500 })
  }
}
