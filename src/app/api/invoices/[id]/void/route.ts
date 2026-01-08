import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can void invoices
    const userRole = (session.user as { role?: string })?.role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can void invoices' }, { status: 403 })
    }

    const { id } = await params
    const data = await request.json()
    const { reason, createReplacement } = data

    // Get the original invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: true,
        property: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Can only void sent or paid invoices (draft can just be deleted)
    if (invoice.status === 'draft') {
      return NextResponse.json({
        error: 'Draft invoices can be edited or deleted directly. Voiding is only for sent/paid invoices.'
      }, { status: 400 })
    }

    if (invoice.status === 'void') {
      return NextResponse.json({ error: 'Invoice is already voided' }, { status: 400 })
    }

    let replacementInvoice = null

    if (createReplacement) {
      // Generate new invoice number
      const year = new Date().getFullYear()
      const lastInvoice = await prisma.invoice.findFirst({
        where: {
          invoiceNumber: { startsWith: `INV-${year}-` },
        },
        orderBy: { invoiceNumber: 'desc' },
      })

      let nextNumber = 1
      if (lastInvoice) {
        const lastNum = parseInt(lastInvoice.invoiceNumber.split('-')[2])
        nextNumber = lastNum + 1
      }
      const newInvoiceNumber = `INV-${year}-${String(nextNumber).padStart(3, '0')}`

      // Create replacement invoice as draft with same line items
      replacementInvoice = await prisma.invoice.create({
        data: {
          invoiceNumber: newInvoiceNumber,
          propertyId: invoice.propertyId,
          type: invoice.type,
          billingPeriod: invoice.billingPeriod,
          invoiceDate: new Date(),
          paymentTerms: invoice.paymentTerms,
          subtotal: invoice.subtotal,
          discount: invoice.discount,
          total: invoice.total,
          status: 'draft',
          notes: invoice.notes,
          lineItems: {
            create: invoice.lineItems.map((item, index) => ({
              date: item.date,
              description: item.description,
              amount: item.amount,
              jobId: item.jobId,
              itemType: item.itemType,
              sortOrder: index,
            })),
          },
        },
        include: {
          lineItems: true,
          property: {
            select: {
              id: true,
              name: true,
              address: true,
              ownerName: true,
              ownerEmail: true,
              ownerPhone: true,
            },
          },
        },
      })
    }

    // Void the original invoice
    const voidedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'void',
        voidedAt: new Date(),
        voidReason: reason || 'No reason provided',
        replacedByInvoiceId: replacementInvoice?.id || null,
      },
      include: {
        lineItems: true,
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            ownerName: true,
            ownerEmail: true,
            ownerPhone: true,
          },
        },
      },
    })

    return NextResponse.json({
      voidedInvoice,
      replacementInvoice,
    })
  } catch (error) {
    console.error('Invoice void error:', error)
    const message = error instanceof Error ? error.message : 'Failed to void invoice'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
