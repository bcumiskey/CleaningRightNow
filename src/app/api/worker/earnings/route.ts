import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { id?: string; role?: string }

    // Get query params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const workerId = searchParams.get('workerId')

    // Determine which worker to fetch earnings for
    let targetWorkerId: string

    if (sessionUser.role === 'admin' && workerId) {
      // Admin can view any worker's earnings
      targetWorkerId = workerId
    } else if (sessionUser.role === 'worker') {
      // Workers can only view their own earnings
      targetWorkerId = sessionUser.id!
    } else if (sessionUser.role === 'admin') {
      return NextResponse.json({ error: 'Worker ID required for admin' }, { status: 400 })
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Default to current month if no dates provided
    const now = new Date()
    const start = startDate ? new Date(startDate) : startOfMonth(now)
    const end = endDate ? new Date(endDate) : endOfMonth(now)

    // Get the worker
    const worker = await prisma.teamMember.findUnique({
      where: { id: targetWorkerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    })

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
    }

    // Get job assignments for this worker in the date range
    const assignments = await prisma.jobAssignment.findMany({
      where: {
        teamMemberId: targetWorkerId,
        job: {
          completed: true,
          date: {
            gte: start,
            lte: end,
          },
        },
      },
      include: {
        job: {
          include: {
            property: {
              select: {
                name: true,
              },
            },
            assignments: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: {
        job: {
          date: 'desc',
        },
      },
    })

    // Calculate earnings for each job
    interface Assignment {
      id: string
      paidAt: Date | null
      job: {
        id: string
        date: Date
        rate: number
        expensePercent: number
        property: { name: string }
        assignments: { id: string }[]
      }
    }
    const earnings = assignments.map((assignment: Assignment) => {
      const job = assignment.job
      const workerCount = job.assignments.length
      const netAfterExpenses = job.rate * (1 - job.expensePercent / 100)
      const workerShare = netAfterExpenses / workerCount

      return {
        id: assignment.id,
        jobId: job.id,
        date: job.date,
        propertyName: job.property.name,
        jobRate: job.rate,
        expensePercent: job.expensePercent,
        workerCount,
        workerShare: Math.round(workerShare * 100) / 100, // Round to 2 decimals
        status: assignment.paidAt ? 'paid' : 'pending',
        paidAt: assignment.paidAt,
      }
    })

    // Calculate summary
    interface EarningRecord { workerShare: number; status: string }
    const totalGrossEarnings = earnings.reduce((sum: number, e: EarningRecord) => sum + e.workerShare, 0)
    const totalPaid = earnings
      .filter((e: EarningRecord) => e.status === 'paid')
      .reduce((sum: number, e: EarningRecord) => sum + e.workerShare, 0)
    const totalPending = earnings
      .filter((e: EarningRecord) => e.status === 'pending')
      .reduce((sum: number, e: EarningRecord) => sum + e.workerShare, 0)

    return NextResponse.json({
      worker,
      payPeriod: {
        start,
        end,
      },
      earnings,
      summary: {
        totalJobs: earnings.length,
        totalGrossEarnings: Math.round(totalGrossEarnings * 100) / 100,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalPending: Math.round(totalPending * 100) / 100,
      },
    })
  } catch (error) {
    console.error('Worker earnings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch earnings' }, { status: 500 })
  }
}
