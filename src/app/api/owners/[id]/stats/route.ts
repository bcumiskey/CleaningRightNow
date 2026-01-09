import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface JobWithProperty {
  id: string
  date: Date
  rate: number
  completed: boolean
  clientPaid: boolean
  property: { name: string }
}

interface InvoiceWithProperty {
  id: string
  invoiceNumber: string
  invoiceDate: Date
  total: number
  status: string
  property: { name: string }
}

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

    const propertyIds = owner.properties.map((p: { id: string }) => p.id)

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

    const typedJobs = jobs as JobWithProperty[]
    const completedJobs = typedJobs.filter((j: JobWithProperty) => j.completed)
    const pendingJobs = typedJobs.filter((j: JobWithProperty) => !j.completed)

    // Get invoice stats
    const invoices = await prisma.invoice.findMany({
      where: { propertyId: { in: propertyIds } },
      include: {
        property: { select: { name: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    })

    const typedInvoices = invoices as InvoiceWithProperty[]
    const paidInvoices = typedInvoices.filter((i: InvoiceWithProperty) => i.status === 'paid')
    const sentInvoices = typedInvoices.filter((i: InvoiceWithProperty) => i.status === 'sent')
    const draftInvoices = typedInvoices.filter((i: InvoiceWithProperty) => i.status === 'draft')

    const totalRevenue = typedInvoices.reduce((sum: number, inv: InvoiceWithProperty) => sum + inv.total, 0)
    const paidRevenue = paidInvoices.reduce((sum: number, inv: InvoiceWithProperty) => sum + inv.total, 0)
    const unpaidRevenue = sentInvoices.reduce((sum: number, inv: InvoiceWithProperty) => sum + inv.total, 0)

    return NextResponse.json({
      totalRevenue,
      paidRevenue,
      unpaidRevenue,
      totalJobs: typedJobs.length,
      completedJobs: completedJobs.length,
      pendingJobs: pendingJobs.length,
      totalInvoices: typedInvoices.length,
      paidInvoices: paidInvoices.length,
      unpaidInvoices: sentInvoices.length,
      draftInvoices: draftInvoices.length,
      recentJobs: typedJobs.slice(0, 5).map((j: JobWithProperty) => ({
        id: j.id,
        date: j.date,
        propertyName: j.property.name,
        rate: j.rate,
        completed: j.completed,
        clientPaid: j.clientPaid,
      })),
      recentInvoices: typedInvoices.slice(0, 5).map((i: InvoiceWithProperty) => ({
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
