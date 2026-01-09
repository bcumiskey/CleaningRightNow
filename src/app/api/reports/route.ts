import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format, subDays, eachMonthOfInterval, subYears } from 'date-fns'

interface DateRange {
  start: Date
  end: Date
}

function getDateRange(period: string): DateRange {
  const now = new Date()

  switch (period) {
    case 'this_week':
      return { start: startOfWeek(now), end: endOfWeek(now) }
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'last_month':
      const lastMonth = subMonths(now, 1)
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
    case 'this_year':
      return { start: startOfYear(now), end: endOfYear(now) }
    case 'last_30_days':
      return { start: subDays(now, 30), end: now }
    case 'last_90_days':
      return { start: subDays(now, 90), end: now }
    case 'all_time':
    default:
      return { start: new Date(2020, 0, 1), end: now }
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all_time'
    const { start, end } = getDateRange(period)

    // Fetch all relevant data
    const [jobs, invoices, properties, teamMembers, owners] = await Promise.all([
      prisma.job.findMany({
        where: {
          date: { gte: start, lte: end },
        },
        include: {
          property: { select: { id: true, name: true, ownerId: true } },
          assignments: {
            include: { teamMember: { select: { id: true, name: true } } },
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.invoice.findMany({
        where: {
          invoiceDate: { gte: start, lte: end },
        },
        include: {
          property: { select: { id: true, name: true, ownerId: true } },
        },
      }),
      prisma.property.findMany({
        select: { id: true, name: true, ownerId: true, baseRate: true },
      }),
      prisma.teamMember.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
      prisma.owner.findMany({
        select: { id: true, name: true },
      }),
    ])

    // === OVERVIEW METRICS ===
    const completedJobs = jobs.filter(j => j.completed)
    const pendingJobs = jobs.filter(j => !j.completed)

    const totalRevenue = completedJobs.reduce((sum, job) => sum + job.rate, 0)
    const pendingRevenue = pendingJobs.reduce((sum, job) => sum + job.rate, 0)
    const avgJobValue = completedJobs.length > 0 ? totalRevenue / completedJobs.length : 0

    // Team payments (after expense deduction)
    let teamPayments = 0
    completedJobs.forEach(job => {
      const teamTotal = job.rate * (1 - job.expensePercent / 100)
      teamPayments += teamTotal
    })

    // Expense deductions (business keeps this)
    const expenseDeductions = totalRevenue - teamPayments

    // === INVOICE METRICS ===
    const paidInvoices = invoices.filter(i => i.status === 'paid')
    const sentInvoices = invoices.filter(i => i.status === 'sent')
    const draftInvoices = invoices.filter(i => i.status === 'draft')

    const invoicedRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0)
    const paidInvoiceRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0)
    const outstandingRevenue = sentInvoices.reduce((sum, inv) => sum + inv.total, 0)

    // === REVENUE BY PROPERTY ===
    const revenueByProperty: Record<string, { name: string; revenue: number; jobs: number; avgRate: number }> = {}
    completedJobs.forEach(job => {
      const propId = job.propertyId
      if (!revenueByProperty[propId]) {
        revenueByProperty[propId] = {
          name: job.property.name,
          revenue: 0,
          jobs: 0,
          avgRate: 0,
        }
      }
      revenueByProperty[propId].revenue += job.rate
      revenueByProperty[propId].jobs += 1
    })
    Object.values(revenueByProperty).forEach(prop => {
      prop.avgRate = prop.jobs > 0 ? prop.revenue / prop.jobs : 0
    })

    const topProperties = Object.entries(revenueByProperty)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // === REVENUE BY OWNER ===
    const revenueByOwner: Record<string, { name: string; revenue: number; jobs: number; properties: number }> = {}
    const ownerMap = Object.fromEntries(owners.map(o => [o.id, o.name]))

    completedJobs.forEach(job => {
      const ownerId = job.property.ownerId
      if (ownerId) {
        if (!revenueByOwner[ownerId]) {
          revenueByOwner[ownerId] = {
            name: ownerMap[ownerId] || 'Unknown',
            revenue: 0,
            jobs: 0,
            properties: 0,
          }
        }
        revenueByOwner[ownerId].revenue += job.rate
        revenueByOwner[ownerId].jobs += 1
      }
    })

    // Count properties per owner
    properties.forEach(prop => {
      if (prop.ownerId && revenueByOwner[prop.ownerId]) {
        // Count unique properties - we'll dedupe later
      }
    })

    const topOwners = Object.entries(revenueByOwner)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // === TEAM PERFORMANCE ===
    const teamPerformance: Record<string, { name: string; jobs: number; earnings: number }> = {}
    completedJobs.forEach(job => {
      const teamShare = job.rate * (1 - job.expensePercent / 100)
      const perWorker = job.assignments.length > 0 ? teamShare / job.assignments.length : 0

      job.assignments.forEach(assignment => {
        const memberId = assignment.teamMemberId
        if (!teamPerformance[memberId]) {
          teamPerformance[memberId] = {
            name: assignment.teamMember.name,
            jobs: 0,
            earnings: 0,
          }
        }
        teamPerformance[memberId].jobs += 1
        teamPerformance[memberId].earnings += perWorker
      })
    })

    const teamStats = Object.entries(teamPerformance)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.jobs - a.jobs)

    // === MONTHLY TRENDS (last 6 months) ===
    const sixMonthsAgo = subMonths(new Date(), 5)
    const months = eachMonthOfInterval({ start: startOfMonth(sixMonthsAgo), end: new Date() })

    const monthlyTrends = months.map(month => {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)

      const monthJobs = jobs.filter(j => {
        const jobDate = new Date(j.date)
        return jobDate >= monthStart && jobDate <= monthEnd && j.completed
      })

      const monthInvoices = invoices.filter(i => {
        const invDate = new Date(i.invoiceDate)
        return invDate >= monthStart && invDate <= monthEnd && i.status === 'paid'
      })

      return {
        month: format(month, 'MMM yyyy'),
        shortMonth: format(month, 'MMM'),
        revenue: monthJobs.reduce((sum, j) => sum + j.rate, 0),
        jobs: monthJobs.length,
        invoiced: monthInvoices.reduce((sum, i) => sum + i.total, 0),
      }
    })

    // === RECENT ACTIVITY ===
    const recentJobs = jobs.slice(0, 10).map(job => ({
      id: job.id,
      date: job.date,
      propertyName: job.property.name,
      rate: job.rate,
      completed: job.completed,
      clientPaid: job.clientPaid,
    }))

    const recentInvoices = invoices.slice(0, 10).map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      propertyName: inv.property.name,
      total: inv.total,
      status: inv.status,
    }))

    // === COMPARISON TO PREVIOUS PERIOD ===
    let previousPeriodRevenue = 0
    let previousPeriodJobs = 0

    if (period !== 'all_time') {
      const periodLength = end.getTime() - start.getTime()
      const prevStart = new Date(start.getTime() - periodLength)
      const prevEnd = new Date(start.getTime() - 1)

      const prevJobs = await prisma.job.findMany({
        where: {
          date: { gte: prevStart, lte: prevEnd },
          completed: true,
        },
      })

      previousPeriodRevenue = prevJobs.reduce((sum, j) => sum + j.rate, 0)
      previousPeriodJobs = prevJobs.length
    }

    const revenueChange = previousPeriodRevenue > 0
      ? ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
      : 0

    const jobsChange = previousPeriodJobs > 0
      ? ((completedJobs.length - previousPeriodJobs) / previousPeriodJobs) * 100
      : 0

    return NextResponse.json({
      period,
      dateRange: { start, end },

      // Overview
      overview: {
        totalRevenue,
        pendingRevenue,
        avgJobValue,
        teamPayments,
        expenseDeductions,
        totalJobs: jobs.length,
        completedJobs: completedJobs.length,
        pendingJobs: pendingJobs.length,
        completionRate: jobs.length > 0 ? (completedJobs.length / jobs.length) * 100 : 0,
      },

      // Comparison
      comparison: {
        revenueChange,
        jobsChange,
        previousPeriodRevenue,
        previousPeriodJobs,
      },

      // Invoices
      invoices: {
        total: invoices.length,
        paid: paidInvoices.length,
        sent: sentInvoices.length,
        draft: draftInvoices.length,
        invoicedRevenue,
        paidInvoiceRevenue,
        outstandingRevenue,
      },

      // Breakdowns
      topProperties,
      topOwners,
      teamStats,
      monthlyTrends,

      // Recent activity
      recentJobs,
      recentInvoices,

      // Counts
      counts: {
        properties: properties.length,
        teamMembers: teamMembers.length,
        owners: owners.length,
      },
    })
  } catch (error) {
    console.error('Reports GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 })
  }
}
