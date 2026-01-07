import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

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
        lineItems: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Invoice GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
        paymentTerms: data.paymentTerms,
        billingPeriod: data.billingPeriod,
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        status: data.status,
        notes: data.notes,
        sentAt: data.status === 'sent' && !data.sentAt ? new Date() : undefined,
        paidAt: data.status === 'paid' && !data.paidAt ? new Date() : undefined,
      },
      include: {
        property: true,
        lineItems: true,
      },
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Invoice PUT error:', error)
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    await prisma.invoice.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Invoice DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 })
  }
}
