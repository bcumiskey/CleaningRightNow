import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, addDays } from 'date-fns'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const startOfToday = startOfDay(today)
    const endOfToday = endOfDay(today)
    const startOfThisMonth = startOfMonth(today)
    const endOfThisMonth = endOfMonth(today)
    const nextWeek = addDays(today, 7)

    // Get today's jobs
    const todayJobs = await prisma.job.findMany({
      where: {
        scheduledDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        property: true,
        teamAssignments: {
          include: {
            teamMember: true,
          },
        },
        services: {
          include: {
            service: true,
          },
        },
      },
      orderBy: {
        scheduledTime: 'asc',
      },
    })

    // Get upcoming jobs (next 7 days)
    const upcomingJobs = await prisma.job.findMany({
      where: {
        scheduledDate: {
          gt: endOfToday,
          lte: nextWeek,
        },
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS'],
        },
      },
      include: {
        property: true,
        teamAssignments: {
          include: {
            teamMember: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
      take: 10,
    })

    // Calculate financial metrics
    const completedJobsThisMonth = await prisma.job.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: startOfThisMonth,
          lte: endOfThisMonth,
        },
      },
    })

    const totalRevenue = completedJobsThisMonth.reduce(
      (sum, job) => sum + job.totalAmount,
      0
    )

    const totalExpenses = completedJobsThisMonth.reduce(
      (sum, job) => sum + job.expenseAmount,
      0
    )

    // Pending payments (completed but not paid by client)
    const pendingPayments = await prisma.job.aggregate({
      where: {
        status: 'COMPLETED',
        clientPaid: false,
      },
      _sum: {
        totalAmount: true,
      },
    })

    // Owed to team (completed but team not paid)
    const owedToTeam = await prisma.jobAssignment.aggregate({
      where: {
        paid: false,
        job: {
          status: 'COMPLETED',
        },
      },
      _sum: {
        payoutAmount: true,
      },
    })

    // Low stock supplies
    const lowStockItems = await prisma.supply.findMany({
      where: {
        quantity: {
          lte: prisma.supply.fields.lowStockThreshold,
        },
      },
    })

    // Linens needing attention (damaged or needs replacement)
    const linensNeedingAttention = await prisma.linen.findMany({
      where: {
        condition: {
          in: ['DAMAGED', 'NEEDS_REPLACEMENT'],
        },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Recent activity (audit logs)
    const recentActivity = await prisma.auditLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    return NextResponse.json({
      todayJobs,
      upcomingJobs,
      metrics: {
        totalRevenue,
        totalExpenses,
        pendingPayments: pendingPayments._sum.totalAmount || 0,
        owedToTeam: owedToTeam._sum.payoutAmount || 0,
        todayJobsCount: todayJobs.length,
        upcomingJobsCount: upcomingJobs.length,
        lowStockItemsCount: lowStockItems.length,
        completedJobsThisMonth: completedJobsThisMonth.length,
        linensNeedingAttentionCount: linensNeedingAttention.length,
      },
      lowStockItems,
      linensNeedingAttention,
      recentActivity,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
