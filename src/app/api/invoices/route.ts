import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Helper to generate next invoice number
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`

  const lastInvoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  })

  let nextNum = 1
  if (lastInvoice) {
    const numPart = lastInvoice.invoiceNumber.replace(prefix, '')
    const lastNum = parseInt(numPart, 10)
    // Guard against NaN from invalid invoice number formats
    if (!isNaN(lastNum) && lastNum >= 1) {
      nextNum = lastNum + 1
    }
  }

  return `${prefix}${nextNum.toString().padStart(3, '0')}`
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const invoices = await prisma.invoice.findMany({
      include: {
        property: {
          select: { name: true, ownerName: true },
        },
      },
      orderBy: { invoiceDate: 'desc' },
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Invoices GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

// POST - Create a new invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    if (!data.propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Get property info
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
      select: { id: true, billingType: true },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const invoiceNumber = await generateInvoiceNumber()
    const invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : new Date()

    // Calculate subtotal from included jobs if provided
    let subtotal = 0
    const lineItemsToCreate: {
      date: Date | null
      description: string
      amount: number
      itemType: string
      jobId: string | null
      sortOrder: number
    }[] = []

    // If job IDs provided, add them as line items
    if (data.jobIds && Array.isArray(data.jobIds) && data.jobIds.length > 0) {
      const jobs = await prisma.job.findMany({
        where: {
          id: { in: data.jobIds },
          propertyId: data.propertyId,
        },
        include: {
          property: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
      })

      jobs.forEach((job: { id: string; date: Date; rate: number; property: { name: string } }, index: number) => {
        lineItemsToCreate.push({
          date: job.date,
          description: `Turnover Cleaning - ${job.property.name}`,
          amount: job.rate,
          itemType: 'service',
          jobId: job.id,
          sortOrder: index + 1,
        })
        subtotal += job.rate
      })
    }

    // If additional line items provided (preset items, custom items)
    if (data.lineItems && Array.isArray(data.lineItems)) {
      const startOrder = lineItemsToCreate.length
      for (let i = 0; i < data.lineItems.length; i++) {
        const item = data.lineItems[i] as { date?: string; description: string; amount: number; itemType?: string }
        if (!item.description || typeof item.description !== 'string' || item.description.trim().length === 0) {
          return NextResponse.json({ error: `Line item ${i + 1}: Description is required` }, { status: 400 })
        }
        const amount = parseFloat(String(item.amount))
        if (isNaN(amount) || amount < 0) {
          return NextResponse.json({ error: `Line item ${i + 1}: Amount must be a non-negative number` }, { status: 400 })
        }
        lineItemsToCreate.push({
          date: item.date ? new Date(item.date) : null,
          description: item.description.trim(),
          amount: amount,
          itemType: item.itemType || 'service',
          jobId: null,
          sortOrder: startOrder + i + 1,
        })
        subtotal += amount
      }
    }

    let discount = 0
    if (data.discount !== undefined && data.discount !== null && data.discount !== '') {
      discount = parseFloat(String(data.discount))
      if (isNaN(discount) || discount < 0) {
        return NextResponse.json({ error: 'Discount must be a non-negative number' }, { status: 400 })
      }
      if (discount > subtotal) {
        return NextResponse.json({ error: 'Discount cannot exceed subtotal' }, { status: 400 })
      }
    }
    const total = subtotal - discount

    // Create invoice with line items in transaction
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        propertyId: data.propertyId,
        type: data.type || property.billingType || 'per_job',
        billingPeriod: data.billingPeriod || null,
        invoiceDate,
        paymentTerms: data.paymentTerms || 'Due upon receipt',
        subtotal,
        discount,
        total,
        status: 'draft',
        notes: data.notes || null,
        lineItems: {
          create: lineItemsToCreate,
        },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            ownerName: true,
            ownerEmail: true,
          },
        },
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Invoices POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create invoice'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
