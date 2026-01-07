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
    const body = await request.json().catch(() => ({}))
    const { syncJobAmounts } = body

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: {
          include: {
            job: true,
          },
        },
        property: true,
      },
    })

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Sync job amounts if requested
    if (syncJobAmounts) {
      for (const lineItem of existingInvoice.lineItems) {
        if (lineItem.job && lineItem.amount !== lineItem.job.rate) {
          await prisma.job.update({
            where: { id: lineItem.jobId! },
            data: { rate: lineItem.amount },
          })
        }
      }
    }

    // Update invoice status to sent
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
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

    // Mark linked jobs as client paid pending (invoice sent)
    const jobIds = existingInvoice.lineItems
      .filter((item) => item.jobId)
      .map((item) => item.jobId!)

    if (jobIds.length > 0) {
      // Jobs are now invoiced but not yet paid
      // We could add an "invoiced" flag if needed
    }

    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      entityType: 'Invoice',
      entityId: invoice.id,
      oldValues: { status: existingInvoice.status },
      newValues: { status: 'sent', sentAt: invoice.sentAt },
      description: generateDescription('SEND', 'Invoice', invoice.invoiceNumber),
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Invoice send error:', error)
    return NextResponse.json(
      { error: 'Failed to send invoice' },
      { status: 500 }
    )
  }
}
