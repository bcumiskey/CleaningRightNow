import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { z } from 'zod'

const updateInvoiceSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'UNPAID', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  paidAt: z.string().optional().nullable(),
  paymentMethod: z
    .enum([
      'CASH',
      'CHECK',
      'CREDIT_CARD',
      'DEBIT_CARD',
      'VENMO',
      'ZELLE',
      'PAYPAL',
      'BANK_TRANSFER',
      'OTHER',
    ])
    .optional()
    .nullable(),
  paymentReference: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// GET /api/invoices/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const invoice = await prisma.invoice.findUnique({
      where: { id },
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

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Invoice GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}

// PATCH /api/invoices/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateInvoiceSchema.parse(body)

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    })

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status
    }

    if (validatedData.paidAt !== undefined) {
      updateData.paidAt = validatedData.paidAt ? new Date(validatedData.paidAt) : null
    }

    if (validatedData.paymentMethod !== undefined) {
      updateData.paymentMethod = validatedData.paymentMethod
    }

    if (validatedData.paymentReference !== undefined) {
      updateData.paymentReference = validatedData.paymentReference
    }

    if (validatedData.dueDate !== undefined) {
      updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
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

    // If marked as paid, also update the job's clientPaid status
    if (validatedData.status === 'PAID') {
      await prisma.job.update({
        where: { id: invoice.jobId },
        data: {
          clientPaid: true,
          clientPaidAt: validatedData.paidAt ? new Date(validatedData.paidAt) : new Date(),
        },
      })
    }

    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      entityType: 'Invoice',
      entityId: invoice.id,
      oldValues: existingInvoice,
      newValues: invoice,
      description: generateDescription(
        'UPDATE',
        'Invoice',
        `${invoice.invoiceNumber} - ${validatedData.status || 'updated'}`
      ),
    })

    return NextResponse.json(invoice)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Invoice PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    )
  }
}

// DELETE /api/invoices/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
    })

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    await prisma.invoice.delete({
      where: { id },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'DELETE',
      entityType: 'Invoice',
      entityId: id,
      oldValues: existingInvoice,
      description: generateDescription('DELETE', 'Invoice', existingInvoice.invoiceNumber),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Invoice DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    )
  }
}
