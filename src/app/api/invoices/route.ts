import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { z } from 'zod'

const invoiceSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  type: z.enum(['per_job', 'monthly']),
  billingPeriod: z.string().optional().nullable(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  paymentTerms: z.string().default('Due upon receipt'),
  notes: z.string().optional().nullable(),
  lineItems: z.array(z.object({
    date: z.string().optional().nullable(),
    description: z.string().min(1),
    amount: z.number(),
    jobId: z.string().optional().nullable(),
    itemType: z.enum(['service', 'supplies', 'expense', 'misc', 'custom']).default('service'),
  })).default([]),
})

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()

  // Find the last invoice number for this year
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: `INV-${year}-`,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
  })

  let sequence = 1
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2], 10)
    sequence = lastSequence + 1
  }

  return `INV-${year}-${String(sequence).padStart(3, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const propertyId = searchParams.get('propertyId')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (propertyId) {
      where.propertyId = propertyId
    }

    if (type && type !== 'all') {
      where.type = type
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            ownerName: true,
            ownerEmail: true,
          },
        },
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            lineItems: true,
          },
        },
      },
      orderBy: { invoiceDate: 'desc' },
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Invoices GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = invoiceSchema.parse(body)

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: validatedData.propertyId },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Calculate totals
    const subtotal = validatedData.lineItems.reduce((sum, item) => sum + item.amount, 0)
    const total = subtotal // No discount by default

    const invoiceNumber = await generateInvoiceNumber()

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        propertyId: validatedData.propertyId,
        type: validatedData.type,
        billingPeriod: validatedData.billingPeriod,
        invoiceDate: validatedData.invoiceDate ? new Date(validatedData.invoiceDate) : new Date(),
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        paymentTerms: validatedData.paymentTerms,
        subtotal,
        discount: 0,
        total,
        notes: validatedData.notes,
        lineItems: {
          create: validatedData.lineItems.map((item, index) => ({
            date: item.date ? new Date(item.date) : null,
            description: item.description,
            amount: item.amount,
            jobId: item.jobId,
            itemType: item.itemType,
            sortOrder: index,
          })),
        },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            ownerName: true,
            ownerEmail: true,
          },
        },
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      entityType: 'Invoice',
      entityId: invoice.id,
      newValues: invoice,
      description: generateDescription('CREATE', 'Invoice', invoice.invoiceNumber),
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Invoices POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
