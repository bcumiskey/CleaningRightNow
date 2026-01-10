import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { startOfMonth, endOfMonth, format } from 'date-fns'

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

    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const currentMonth = format(now, 'MMMM yyyy')

    // Get all monthly billing properties
    const monthlyProperties = await prisma.property.findMany({
      where: {
        billingType: 'monthly',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        baseRate: true,
        ownerName: true,
        ownerId: true,
        monthlyBillingDay: true,
      },
    })

    // Get unbilled completed jobs for this month
    const unbilledJobs = await prisma.job.findMany({
      where: {
        completed: true,
        date: { gte: monthStart, lte: monthEnd },
        invoiceItems: { none: {} }, // Not yet on any invoice
      },
      select: {
        id: true,
        propertyId: true,
        rate: true,
        date: true,
      },
    })

    // Get invoices created this month
    const thisMonthInvoices = await prisma.invoice.findMany({
      where: {
        invoiceDate: { gte: monthStart, lte: monthEnd },
      },
      select: {
        id: true,
        invoiceNumber: true,
        propertyId: true,
        total: true,
        status: true,
        createdAt: true,
      },
    })

    // Group unbilled jobs by property
    const unbilledByProperty: Record<string, { count: number; total: number }> = {}
    unbilledJobs.forEach(job => {
      if (!unbilledByProperty[job.propertyId]) {
        unbilledByProperty[job.propertyId] = { count: 0, total: 0 }
      }
      unbilledByProperty[job.propertyId].count += 1
      unbilledByProperty[job.propertyId].total += job.rate
    })

    // Check which properties already have an invoice this month
    const invoicedPropertyIds = new Set(thisMonthInvoices.map(inv => inv.propertyId))

    // Build ready to invoice list (properties with unbilled jobs that don't have an invoice yet)
    const readyToInvoice = monthlyProperties
      .filter(prop => {
        const hasUnbilledJobs = unbilledByProperty[prop.id]?.count > 0
        const notYetInvoiced = !invoicedPropertyIds.has(prop.id)
        return hasUnbilledJobs && notYetInvoiced
      })
      .map(prop => ({
        propertyId: prop.id,
        propertyName: prop.name,
        ownerName: prop.ownerName,
        billingDay: prop.monthlyBillingDay || 1,
        unbilledJobs: unbilledByProperty[prop.id]?.count || 0,
        unbilledAmount: unbilledByProperty[prop.id]?.total || 0,
      }))
      .sort((a, b) => b.unbilledAmount - a.unbilledAmount)

    // Get draft invoices
    const draftInvoices = thisMonthInvoices
      .filter(inv => inv.status === 'draft')
      .map(inv => {
        const prop = monthlyProperties.find(p => p.id === inv.propertyId)
        return {
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          propertyName: prop?.name || 'Unknown',
          amount: inv.total,
          createdAt: inv.createdAt,
        }
      })

    // Calculate summaries
    const sentThisMonth = thisMonthInvoices.filter(inv => inv.status === 'sent')
    const paidThisMonth = thisMonthInvoices.filter(inv => inv.status === 'paid')

    return NextResponse.json({
      currentMonth,
      readyToInvoice,
      draftInvoices,
      summary: {
        readyCount: readyToInvoice.length,
        readyAmount: readyToInvoice.reduce((sum, p) => sum + p.unbilledAmount, 0),
        draftCount: draftInvoices.length,
        sentCount: sentThisMonth.length,
        sentAmount: sentThisMonth.reduce((sum, inv) => sum + inv.total, 0),
        paidCount: paidThisMonth.length,
        paidAmount: paidThisMonth.reduce((sum, inv) => sum + inv.total, 0),
      },
    })
  } catch (error) {
    console.error('Monthly billing status error:', error)
    return NextResponse.json({ error: 'Failed to fetch billing status' }, { status: 500 })
  }
}
