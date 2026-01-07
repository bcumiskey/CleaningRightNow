import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Find team member by user ID or email
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        OR: [
          { email: session.user.email },
          { name: session.user.name },
        ],
        isActive: true,
      },
    })

    // Build where clause
    const whereClause: Record<string, unknown> = {}

    if (startDate) {
      whereClause.date = { ...whereClause.date as object, gte: new Date(startDate) }
    }
    if (endDate) {
      whereClause.date = { ...whereClause.date as object, lte: new Date(endDate) }
    }

    // Filter by team member assignments
    if (teamMember) {
      whereClause.assignments = { some: { teamMemberId: teamMember.id } }
    }

    const jobs = await prisma.job.findMany({
      where: whereClause,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        assignments: {
          include: {
            teamMember: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    })

    // Remove financial data
    const sanitizedJobs = jobs.map((job: typeof jobs[number]) => ({
      id: job.id,
      date: job.date,
      time: job.time,
      completed: job.completed,
      property: job.property,
      assignments: job.assignments,
    }))

    return NextResponse.json(sanitizedJobs)
  } catch (error) {
    console.error('Worker jobs GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}
