import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { startOfDay, endOfDay, parseISO } from 'date-fns'

// GET - List job sessions (with filters)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const teamMemberId = searchParams.get('teamMemberId')
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (jobId) {
      where.jobId = jobId
    }

    if (teamMemberId) {
      where.teamMemberId = teamMemberId
    }

    if (status) {
      where.status = status
    }

    // If date provided, get sessions for jobs on that date
    if (date) {
      const targetDate = parseISO(date)
      const jobs = await prisma.job.findMany({
        where: {
          date: {
            gte: startOfDay(targetDate),
            lte: endOfDay(targetDate),
          },
        },
        select: { id: true },
      })
      where.jobId = { in: jobs.map((j: { id: string }) => j.id) }
    }

    const sessions = await prisma.jobSession.findMany({
      where,
      include: {
        job: {
          include: {
            property: { select: { id: true, name: true, address: true } },
          },
        },
        teamMember: { select: { id: true, name: true, rank: true, canSupervise: true } },
        supervisor: { select: { id: true, name: true } },
        rating: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Job sessions GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

// POST - Create job sessions for a job (when assigning team)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { jobId, teamMemberIds } = body

    if (!jobId || !teamMemberIds || !Array.isArray(teamMemberIds)) {
      return NextResponse.json(
        { error: 'Job ID and team member IDs array required' },
        { status: 400 }
      )
    }

    // Verify job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Create sessions for each team member
    const sessions = await Promise.all(
      teamMemberIds.map(teamMemberId =>
        prisma.jobSession.upsert({
          where: {
            jobId_teamMemberId: { jobId, teamMemberId },
          },
          create: {
            jobId,
            teamMemberId,
            status: 'assigned',
          },
          update: {},
        })
      )
    )

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Job sessions POST error:', error)
    return NextResponse.json({ error: 'Failed to create sessions' }, { status: 500 })
  }
}
