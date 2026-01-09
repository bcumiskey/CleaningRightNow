import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Get owner statistics - revenue, jobs, invoices
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ownerId = params.id

    // Get owner with properties
    const owner = await prisma.owner.findUnique({
      where: { id: ownerId },
      include: {
        properties: {
          select: { id: true },
        },
      },
    })

    if (!owner) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 404 })
    }

    const propertyIds = owner.properties.map(p => p.id)

    if (propertyIds.length === 0) {
      return NextResponse.json({
        totalRevenue: 0,
        paidRevenue: 0,
        unpaidRevenue: 0,
        totalJobs: 0,
        completedJobs: 0,
        pendingJobs: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        unpaidInvoices: 0,
        draftInvoices: 0,
        recentJobs: [],
        recentInvoices: [],
      })
    }

    // Get job stats
    const jobs = await prisma.job.findMany({
      where: { propertyId: { in: propertyIds } },
      include: {
        property: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    })

    const completedJobs = jobs.filter(j => j.completed)
    const pendingJobs = jobs.filter(j => !j.completed)

    // Get invoice stats
    const invoices = await prisma.invoice.findMany({
      where: { propertyId: { in: propertyIds } },
      include: {
        property: { select: { name: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    })

    const paidInvoices = invoices.filter(i => i.status === 'paid')
    const sentInvoices = invoices.filter(i => i.status === 'sent')
    const draftInvoices = invoices.filter(i => i.status === 'draft')

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0)
    const paidRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0)
    const unpaidRevenue = sentInvoices.reduce((sum, inv) => sum + inv.total, 0)

    return NextResponse.json({
      totalRevenue,
      paidRevenue,
      unpaidRevenue,
      totalJobs: jobs.length,
      completedJobs: completedJobs.length,
      pendingJobs: pendingJobs.length,
      totalInvoices: invoices.length,
      paidInvoices: paidInvoices.length,
      unpaidInvoices: sentInvoices.length,
      draftInvoices: draftInvoices.length,
      recentJobs: jobs.slice(0, 5).map(j => ({
        id: j.id,
        date: j.date,
        propertyName: j.property.name,
        rate: j.rate,
        completed: j.completed,
        clientPaid: j.clientPaid,
      })),
      recentInvoices: invoices.slice(0, 5).map(i => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        invoiceDate: i.invoiceDate,
        propertyName: i.property.name,
        total: i.total,
        status: i.status,
      })),
    })
  } catch (error) {
    console.error('Owner stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch owner stats' }, { status: 500 })
  }
}
