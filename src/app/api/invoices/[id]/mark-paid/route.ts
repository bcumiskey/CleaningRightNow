import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'

export async function POST(
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
      include: {
        lineItems: true,
      },
    })

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Update invoice status to paid
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt: new Date(),
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

    // Mark linked jobs as client paid
    const jobIds = existingInvoice.lineItems
      .filter((item) => item.jobId)
      .map((item) => item.jobId!)

    if (jobIds.length > 0) {
      await prisma.job.updateMany({
        where: {
          id: { in: jobIds },
        },
        data: {
          clientPaid: true,
          clientPaidAt: new Date(),
        },
      })
    }

    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      entityType: 'Invoice',
      entityId: invoice.id,
      oldValues: { status: existingInvoice.status },
      newValues: { status: 'paid', paidAt: invoice.paidAt },
      description: generateDescription('PAID', 'Invoice', invoice.invoiceNumber),
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Invoice mark-paid error:', error)
    return NextResponse.json(
      { error: 'Failed to mark invoice as paid' },
      { status: 500 }
    )
  }
}
