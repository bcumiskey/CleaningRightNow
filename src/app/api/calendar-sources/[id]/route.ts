import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET - Fetch single calendar source
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

    const source = await prisma.calendarSource.findUnique({
      where: { id },
    })

    if (!source) {
      return NextResponse.json({ error: 'Calendar source not found' }, { status: 404 })
    }

    return NextResponse.json(source)
  } catch (error) {
    console.error('Calendar source GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch calendar source' }, { status: 500 })
  }
}

// PATCH - Update calendar source
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const data = await request.json()

    const source = await prisma.calendarSource.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        icalUrl: data.icalUrl,
        isActive: data.isActive,
        propertyPattern: data.propertyPattern,
      },
    })

    return NextResponse.json(source)
  } catch (error) {
    console.error('Calendar source PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update calendar source' }, { status: 500 })
  }
}

// DELETE - Delete calendar source
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    await prisma.calendarSource.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Calendar source DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete calendar source' }, { status: 500 })
  }
}
