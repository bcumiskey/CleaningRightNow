import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { differenceInDays } from 'date-fns'

interface Invoice {
  id: string
  invoiceNumber: string
  total: number
  status: string
  sentAt: Date | null
  property: {
    id: string
    name: string
    ownerId: string | null
    ownerName: string
  }
}

interface Owner {
  id: string
  name: string
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Get all unpaid invoices (sent or partial status)
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['sent', 'partial'] },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            ownerName: true,
          },
        },
      },
      orderBy: { sentAt: 'asc' },
    })

    // Get owners for grouping
    const owners = await prisma.owner.findMany({
      select: { id: true, name: true },
    })
    const ownerMap = Object.fromEntries(owners.map((o: Owner) => [o.id, o.name]))

    // Calculate aging buckets
    const aging = {
      current: { amount: 0, count: 0, invoices: [] as string[] },      // 0-7 days
      days1to30: { amount: 0, count: 0, invoices: [] as string[] },    // 8-30 days
      days31to60: { amount: 0, count: 0, invoices: [] as string[] },   // 31-60 days
      days60plus: { amount: 0, count: 0, invoices: [] as string[] },   // 60+ days
    }

    // Process each invoice
    const invoiceDetails = (invoices as Invoice[]).map((inv) => {
      const daysOutstanding = inv.sentAt ? differenceInDays(now, new Date(inv.sentAt)) : 0

      // Categorize into aging bucket
      if (daysOutstanding <= 7) {
        aging.current.amount += inv.total
        aging.current.count += 1
        aging.current.invoices.push(inv.id)
      } else if (daysOutstanding <= 30) {
        aging.days1to30.amount += inv.total
        aging.days1to30.count += 1
        aging.days1to30.invoices.push(inv.id)
      } else if (daysOutstanding <= 60) {
        aging.days31to60.amount += inv.total
        aging.days31to60.count += 1
        aging.days31to60.invoices.push(inv.id)
      } else {
        aging.days60plus.amount += inv.total
        aging.days60plus.count += 1
        aging.days60plus.invoices.push(inv.id)
      }

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        propertyId: inv.property.id,
        propertyName: inv.property.name,
        ownerId: inv.property.ownerId,
        ownerName: inv.property.ownerId
          ? ownerMap[inv.property.ownerId] || inv.property.ownerName
          : inv.property.ownerName,
        total: inv.total,
        sentAt: inv.sentAt,
        daysOutstanding,
        isOverdue: daysOutstanding > 30,
      }
    })

    // Group by owner
    const byOwner: Record<string, {
      ownerId: string | null
      ownerName: string
      totalOutstanding: number
      invoiceCount: number
      invoices: typeof invoiceDetails
    }> = {}

    invoiceDetails.forEach((inv) => {
      const key = inv.ownerId || 'no-owner'
      if (!byOwner[key]) {
        byOwner[key] = {
          ownerId: inv.ownerId,
          ownerName: inv.ownerName,
          totalOutstanding: 0,
          invoiceCount: 0,
          invoices: [],
        }
      }
      byOwner[key].totalOutstanding += inv.total
      byOwner[key].invoiceCount += 1
      byOwner[key].invoices.push(inv)
    })

    // Sort owners by amount owed (descending)
    const ownersList = Object.values(byOwner)
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding)

    // Calculate summary
    const totalOutstanding = invoiceDetails.reduce((sum, inv) => sum + inv.total, 0)
    const overdueAmount = invoiceDetails
      .filter(inv => inv.isOverdue)
      .reduce((sum, inv) => sum + inv.total, 0)
    const overdueCount = invoiceDetails.filter(inv => inv.isOverdue).length

    // Calculate average days to payment (from paid invoices)
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        status: 'paid',
        sentAt: { not: null },
        paidAt: { not: null },
      },
      select: {
        sentAt: true,
        paidAt: true,
      },
      take: 100, // Last 100 paid invoices
      orderBy: { paidAt: 'desc' },
    })

    let avgDaysToPayment = 0
    if (paidInvoices.length > 0) {
      const totalDays = paidInvoices.reduce((sum, inv) => {
        if (inv.sentAt && inv.paidAt) {
          return sum + differenceInDays(new Date(inv.paidAt), new Date(inv.sentAt))
        }
        return sum
      }, 0)
      avgDaysToPayment = Math.round(totalDays / paidInvoices.length)
    }

    return NextResponse.json({
      summary: {
        totalOutstanding,
        invoiceCount: invoiceDetails.length,
        overdueAmount,
        overdueCount,
        avgDaysToPayment,
      },
      aging,
      byOwner: ownersList,
      allInvoices: invoiceDetails.sort((a, b) => b.daysOutstanding - a.daysOutstanding),
    })
  } catch (error) {
    console.error('AR Report error:', error)
    return NextResponse.json({ error: 'Failed to fetch AR data' }, { status: 500 })
  }
}
