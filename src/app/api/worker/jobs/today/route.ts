import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find team member by user ID or email
    const orConditions = []
    if (session.user.email) {
      orConditions.push({ email: session.user.email })
    }
    if (session.user.name) {
      orConditions.push({ name: session.user.name })
    }

    const teamMember = orConditions.length > 0
      ? await prisma.teamMember.findFirst({
          where: {
            OR: orConditions,
            isActive: true,
          },
        })
      : null

    const today = new Date()
    const start = startOfDay(today)
    const end = endOfDay(today)

    // Get jobs assigned to this worker (or all if admin)
    const whereClause = teamMember
      ? {
          date: { gte: start, lte: end },
          assignments: { some: { teamMemberId: teamMember.id } },
        }
      : {
          date: { gte: start, lte: end },
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
      orderBy: [{ time: 'asc' }, { date: 'asc' }],
    })

    // Add active notes count for each job's property
    const jobsWithNotes = await Promise.all(
      jobs.map(async (job: typeof jobs[number]) => {
        const activeNotes = await prisma.propertyNote.count({
          where: {
            propertyId: job.property.id,
            status: 'active',
          },
        })

        // Remove financial data from response
        return {
          id: job.id,
          date: job.date,
          time: job.time,
          completed: job.completed,
          property: job.property,
          assignments: job.assignments,
          _activeNotes: activeNotes,
        }
      })
    )

    return NextResponse.json(jobsWithNotes)
  } catch (error) {
    console.error('Worker jobs today GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}
