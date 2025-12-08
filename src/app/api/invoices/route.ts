import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { generateInvoiceNumber } from '@/lib/utils'
import { z } from 'zod'

const invoiceSchema = z.object({
  jobId: z.string().min(1, 'Job is required'),
  dueDate: z.string().optional().nullable(),
  tax: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (status && status !== 'all') {
      where.status = status
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        job: {
          include: {
            property: {
              include: {
                owner: true,
              },
            },
            services: {
              include: {
                service: true,
              },
            },
          },
        },
      },
      orderBy: { issueDate: 'desc' },
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

    // Get the job details
    const job = await prisma.job.findUnique({
      where: { id: validatedData.jobId },
      include: {
        services: true,
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Check if invoice already exists for this job
    const existingInvoice = await prisma.invoice.findUnique({
      where: { jobId: validatedData.jobId },
    })

    if (existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice already exists for this job' },
        { status: 400 }
      )
    }

    const subtotal = job.totalAmount
    const tax = validatedData.tax
    const total = subtotal + tax

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        jobId: validatedData.jobId,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        subtotal,
        tax,
        total,
        notes: validatedData.notes,
      },
      include: {
        job: {
          include: {
            property: {
              include: {
                owner: true,
              },
            },
            services: {
              include: {
                service: true,
              },
            },
          },
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
        { error: 'Validation error', details: error.errors },
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
