import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { startOfYear, endOfYear } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear()

    const yearStart = startOfYear(new Date(year, 0, 1))
    const yearEnd = endOfYear(new Date(year, 0, 1))

    // Fetch all relevant data for the year
    const [jobs, invoices, expenses, teamMembers, properties, owners] = await Promise.all([
      prisma.job.findMany({
        where: {
          date: { gte: yearStart, lte: yearEnd },
          completed: true,
        },
        include: {
          property: { select: { id: true, name: true, ownerId: true } },
          assignments: {
            include: { teamMember: { select: { id: true, name: true, email: true } } },
          },
        },
      }),
      prisma.invoice.findMany({
        where: {
          invoiceDate: { gte: yearStart, lte: yearEnd },
        },
        include: {
          property: { select: { id: true, name: true, ownerName: true, ownerId: true } },
        },
      }),
      prisma.expense.findMany({
        where: {
          date: { gte: yearStart, lte: yearEnd },
        },
        include: {
          property: { select: { id: true, name: true } },
        },
      }),
      prisma.teamMember.findMany({
        select: { id: true, name: true, email: true, phone: true },
      }),
      prisma.property.findMany({
        select: { id: true, name: true, ownerId: true, ownerName: true },
      }),
      prisma.owner.findMany({
        select: { id: true, name: true },
      }),
    ])

    // Calculate revenue summary
    const totalRevenue = jobs.reduce((sum, job) => sum + job.rate, 0)
    const invoicedRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0)
    const paidInvoices = invoices.filter(inv => inv.status === 'paid')
    const paidRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0)

    // Calculate revenue by month
    const revenueByMonth: Record<string, number> = {}
    jobs.forEach(job => {
      const month = new Date(job.date).toLocaleString('default', { month: 'short' })
      revenueByMonth[month] = (revenueByMonth[month] || 0) + job.rate
    })

    // Calculate revenue by property
    const revenueByProperty: Record<string, { name: string; revenue: number; jobs: number }> = {}
    jobs.forEach(job => {
      const propId = job.property.id
      if (!revenueByProperty[propId]) {
        revenueByProperty[propId] = { name: job.property.name, revenue: 0, jobs: 0 }
      }
      revenueByProperty[propId].revenue += job.rate
      revenueByProperty[propId].jobs += 1
    })

    // Calculate revenue by owner
    const ownerMap = Object.fromEntries(owners.map(o => [o.id, o.name]))
    const revenueByOwner: Record<string, { name: string; revenue: number; jobs: number }> = {}
    jobs.forEach(job => {
      const ownerId = job.property.ownerId || 'no-owner'
      const ownerName = job.property.ownerId
        ? ownerMap[job.property.ownerId] || 'Unknown Owner'
        : 'No Owner Assigned'
      if (!revenueByOwner[ownerId]) {
        revenueByOwner[ownerId] = { name: ownerName, revenue: 0, jobs: 0 }
      }
      revenueByOwner[ownerId].revenue += job.rate
      revenueByOwner[ownerId].jobs += 1
    })

    // Calculate expense summary
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const expensesByCategory: Record<string, number> = {}
    expenses.forEach(exp => {
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + exp.amount
    })

    // Calculate mileage
    const mileageExpenses = expenses.filter(exp => exp.category === 'mileage')
    const totalMiles = mileageExpenses.reduce((sum, exp) => sum + (exp.miles || 0), 0)

    // Calculate contractor payments (for 1099s)
    const contractorPayments: Record<string, {
      id: string
      name: string
      email: string | null
      totalPaid: number
      jobCount: number
      needs1099: boolean
    }> = {}

    jobs.forEach(job => {
      const teamShare = job.rate * (1 - job.expensePercent / 100)
      const perWorker = job.assignments.length > 0 ? teamShare / job.assignments.length : 0

      job.assignments.forEach(assignment => {
        const workerId = assignment.teamMember.id
        if (!contractorPayments[workerId]) {
          contractorPayments[workerId] = {
            id: workerId,
            name: assignment.teamMember.name,
            email: assignment.teamMember.email,
            totalPaid: 0,
            jobCount: 0,
            needs1099: false,
          }
        }
        contractorPayments[workerId].totalPaid += perWorker
        contractorPayments[workerId].jobCount += 1
      })
    })

    // Mark those needing 1099 (>$600)
    Object.values(contractorPayments).forEach(cp => {
      cp.needs1099 = cp.totalPaid >= 600
    })

    const contractorList = Object.values(contractorPayments).sort((a, b) => b.totalPaid - a.totalPaid)
    const total1099Count = contractorList.filter(c => c.needs1099).length
    const total1099Amount = contractorList.filter(c => c.needs1099).reduce((sum, c) => sum + c.totalPaid, 0)

    // Team payments total
    const totalTeamPayments = contractorList.reduce((sum, c) => sum + c.totalPaid, 0)

    // Calculate business margin (revenue - team payments)
    const grossProfit = totalRevenue - totalTeamPayments
    const netProfit = grossProfit - totalExpenses

    return NextResponse.json({
      year,
      summary: {
        totalRevenue,
        invoicedRevenue,
        paidRevenue,
        totalExpenses,
        totalTeamPayments,
        grossProfit,
        netProfit,
        totalJobs: jobs.length,
        totalInvoices: invoices.length,
        totalMiles,
      },
      revenueByMonth,
      revenueByProperty: Object.values(revenueByProperty).sort((a, b) => b.revenue - a.revenue),
      revenueByOwner: Object.values(revenueByOwner).sort((a, b) => b.revenue - a.revenue),
      expensesByCategory,
      expenses: expenses.map(exp => ({
        id: exp.id,
        date: exp.date,
        category: exp.category,
        description: exp.description,
        amount: exp.amount,
        vendor: exp.vendor,
        propertyName: exp.property?.name || null,
        miles: exp.miles,
      })),
      contractors: contractorList,
      contractor1099: {
        count: total1099Count,
        totalAmount: total1099Amount,
      },
      availableYears: [
        new Date().getFullYear(),
        new Date().getFullYear() - 1,
        new Date().getFullYear() - 2,
      ],
    })
  } catch (error) {
    console.error('Year-end report error:', error)
    return NextResponse.json({ error: 'Failed to generate year-end report' }, { status: 500 })
  }
}
