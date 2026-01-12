import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { id?: string; role?: string; teamMemberId?: string }

    // Workers must have a teamMemberId
    if (!sessionUser.teamMemberId && sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const start = startOfDay(today)
    const end = endOfDay(today)

    // Build where clause - workers only see their assigned jobs
    const whereClause: Record<string, unknown> = {
      date: { gte: start, lte: end },
    }

    if (sessionUser.teamMemberId) {
      whereClause.assignments = {
        some: { teamMemberId: sessionUser.teamMemberId }
      }
    }

    const jobs = await prisma.job.findMany({
      where: whereClause,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            _count: {
              select: {
                notes: { where: { status: 'active' } }
              }
            }
          },
        },
      },
      orderBy: [{ time: 'asc' }, { date: 'asc' }],
    })

    // Transform to include active notes count (single query, no N+1)
    interface JobWithProperty {
      id: string
      date: Date
      time: string | null
      completed: boolean
      property: {
        id: string
        name: string
        address: string
        _count: { notes: number }
      }
    }
    const jobsWithNotes = jobs.map((job: JobWithProperty) => ({
      id: job.id,
      date: job.date,
      time: job.time,
      completed: job.completed,
      property: {
        id: job.property.id,
        name: job.property.name,
        address: job.property.address,
      },
      _activeNotes: job.property._count.notes,
    }))

    return NextResponse.json(jobsWithNotes)
  } catch (error) {
    console.error('Worker jobs today GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}
