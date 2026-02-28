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

    const { id } = await params
    const data = await request.json()

    const invoice = await prisma.invoice.findUnique({ where: { id } })
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    if (invoice.status === 'draft') {
      return NextResponse.json({ error: 'Draft invoices should be deleted, not voided' }, { status: 400 })
    }
    if (invoice.status === 'voided') {
      return NextResponse.json({ error: 'Invoice is already voided' }, { status: 400 })
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'voided',
        voidedAt: new Date(),
        voidReason: data.reason || null,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Invoice void error:', error)
    return NextResponse.json({ error: 'Failed to void invoice' }, { status: 500 })
  }
}
