import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { calculateWorkerShare } from '@/lib/earnings'
import { startOfMonth, endOfMonth, startOfDay, endOfDay, addDays } from 'date-fns'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const twoWeeksFromNow = addDays(now, 14)

    // Monthly revenue (completed jobs this month)
    const completedJobs = await prisma.job.findMany({
      where: {
        completed: true,
        date: { gte: monthStart, lte: monthEnd },
      },
    })
    const monthlyRevenue = completedJobs.reduce((sum: number, job: { rate: number }) => sum + job.rate, 0)

    // Pending from clients (completed but not paid)
    const unpaidJobs = await prisma.job.findMany({
      where: {
        completed: true,
        clientPaid: false,
      },
    })
    const pendingFromClients = unpaidJobs.reduce((sum: number, job: { rate: number }) => sum + job.rate, 0)

    // Owed to team (completed jobs not paid to team)
    const teamUnpaidJobs = await prisma.job.findMany({
      where: {
        completed: true,
        teamPaid: false,
      },
      include: { assignments: true },
    })
    // Sum what each assigned worker is actually owed rather than the raw job pot,
    // so this matches the per-worker pending totals on the pay statements.
    interface UnpaidJob {
      rate: number
      expensePercent: number
      dogFee: number | null
      payOverride: number | null
      assignments: Array<{ amountEarned: number | null; payAdjustment: number | null; paidAt: Date | null }>
    }
    let owedToTeam = 0
    ;(teamUnpaidJobs as UnpaidJob[]).forEach((job) => {
      const workerCount = job.assignments.length
      job.assignments.forEach((assignment) => {
        if (assignment.paidAt) return
        owedToTeam += calculateWorkerShare(assignment, job, workerCount)
      })
    })

    // Draft invoices count
    const draftInvoices = await prisma.invoice.count({
      where: { status: 'draft' },
    })

    // Low stock items (placeholder - would need inventory check)
    const lowStockItems = 0

    // Today's jobs
    const todayJobs = await prisma.job.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd },
      },
      include: {
        property: { select: { id: true, name: true, address: true } },
        assignments: {
          include: { teamMember: { select: { name: true } } },
        },
      },
      orderBy: { time: 'asc' },
    })

    // Upcoming jobs (next 2 weeks, excluding today)
    const upcomingJobs = await prisma.job.findMany({
      where: {
        date: { gt: todayEnd, lte: twoWeeksFromNow },
      },
      include: {
        property: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
      take: 10,
    })

    return NextResponse.json({
      stats: {
        monthlyRevenue,
        pendingFromClients,
        owedToTeam,
        draftInvoices,
        lowStockItems,
      },
      todayJobs,
      upcomingJobs,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
