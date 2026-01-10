import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all unpaid job assignments with related data
    const unpaidAssignments = await prisma.jobAssignment.findMany({
      where: {
        paidAt: null,
        amountEarned: { not: null },
        job: {
          completed: true,
        },
      },
      include: {
        teamMember: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        job: {
          select: {
            id: true,
            date: true,
            rate: true,
            property: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { teamMember: { name: 'asc' } },
        { job: { date: 'desc' } },
      ],
    })

    // Group by team member
    const byWorker: Record<string, {
      id: string
      name: string
      email: string | null
      totalUnpaid: number
      assignments: Array<{
        id: string
        jobId: string
        jobDate: string
        propertyName: string
        amount: number
      }>
    }> = {}

    let totalUnpaid = 0
    let totalAssignments = 0

    unpaidAssignments.forEach((assignment) => {
      const workerId = assignment.teamMember.id
      const amount = assignment.amountEarned || 0

      if (!byWorker[workerId]) {
        byWorker[workerId] = {
          id: workerId,
          name: assignment.teamMember.name,
          email: assignment.teamMember.email,
          totalUnpaid: 0,
          assignments: [],
        }
      }

      byWorker[workerId].totalUnpaid += amount
      byWorker[workerId].assignments.push({
        id: assignment.id,
        jobId: assignment.job.id,
        jobDate: assignment.job.date.toISOString(),
        propertyName: assignment.job.property.name,
        amount,
      })

      totalUnpaid += amount
      totalAssignments += 1
    })

    // Convert to array and sort by total unpaid (descending)
    const workers = Object.values(byWorker).sort((a, b) => b.totalUnpaid - a.totalUnpaid)

    return NextResponse.json({
      summary: {
        totalUnpaid,
        workerCount: workers.length,
        assignmentCount: totalAssignments,
      },
      workers,
    })
  } catch (error) {
    console.error('Unpaid summary error:', error)
    return NextResponse.json({ error: 'Failed to fetch unpaid summary' }, { status: 500 })
  }
}
