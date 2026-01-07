import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            ownerName: true,
            ownerPhone: true,
            accessCode: true,
          },
        },
        assignments: {
          include: {
            teamMember: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Get active notes for the property
    const activeNotes = await prisma.propertyNote.findMany({
      where: {
        propertyId: job.property.id,
        status: 'active',
      },
      select: {
        id: true,
        type: true,
        content: true,
      },
    })

    // Return sanitized job data (no financial info)
    return NextResponse.json({
      id: job.id,
      date: job.date,
      time: job.time,
      completed: job.completed,
      property: job.property,
      assignments: job.assignments,
      activeNotes,
    })
  } catch (error) {
    console.error('Worker job GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
  }
}
