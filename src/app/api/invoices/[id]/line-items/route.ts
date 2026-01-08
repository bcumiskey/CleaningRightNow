import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST - Add a new line item to an invoice
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: invoiceId } = await params
    const data = await request.json()

    // Get max sort order
    const maxSort = await prisma.invoiceLineItem.findFirst({
      where: { invoiceId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const lineItem = await prisma.invoiceLineItem.create({
      data: {
        invoiceId,
        date: data.date ? new Date(data.date) : null,
        description: data.description,
        amount: parseFloat(data.amount) || 0,
        itemType: data.itemType || 'service',
        jobId: data.jobId || null,
        sortOrder: (maxSort?.sortOrder || 0) + 1,
      },
    })

    // Recalculate invoice totals
    await recalculateInvoiceTotals(invoiceId)

    return NextResponse.json(lineItem)
  } catch (error) {
    console.error('Line items POST error:', error)
    return NextResponse.json({ error: 'Failed to add line item' }, { status: 500 })
  }
}

// PUT - Update line items (bulk update)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: invoiceId } = await params
    const data = await request.json()

    // data.lineItems = array of line items to update
    // data.syncToJobs = boolean indicating if we should sync amounts to job records

    if (!Array.isArray(data.lineItems)) {
      return NextResponse.json({ error: 'lineItems array required' }, { status: 400 })
    }

    const syncToJobs = data.syncToJobs === true
    const modifiedJobIds: string[] = []

    // Update each line item
    for (const item of data.lineItems) {
      if (item.id) {
        // Get current item to check if amount changed
        const currentItem = await prisma.invoiceLineItem.findUnique({
          where: { id: item.id },
        })

        // Update the line item
        await prisma.invoiceLineItem.update({
          where: { id: item.id },
          data: {
            date: item.date ? new Date(item.date) : null,
            description: item.description,
            amount: parseFloat(item.amount) || 0,
            itemType: item.itemType,
            sortOrder: item.sortOrder,
          },
        })

        // Track modified job amounts for sync
        if (currentItem?.jobId && currentItem.amount !== parseFloat(item.amount)) {
          modifiedJobIds.push(currentItem.jobId)

          // If sync requested, update the job record
          if (syncToJobs) {
            await prisma.job.update({
              where: { id: currentItem.jobId },
              data: { rate: parseFloat(item.amount) || 0 },
            })
          }
        }
      }
    }

    // Recalculate invoice totals
    await recalculateInvoiceTotals(invoiceId)

    return NextResponse.json({
      success: true,
      modifiedJobs: modifiedJobIds.length,
      syncedToJobs: syncToJobs,
    })
  } catch (error) {
    console.error('Line items PUT error:', error)
    return NextResponse.json({ error: 'Failed to update line items' }, { status: 500 })
  }
}

// DELETE - Delete a line item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: invoiceId } = await params
    const { searchParams } = new URL(request.url)
    const lineItemId = searchParams.get('lineItemId')

    if (!lineItemId) {
      return NextResponse.json({ error: 'lineItemId is required' }, { status: 400 })
    }

    await prisma.invoiceLineItem.delete({
      where: { id: lineItemId },
    })

    // Recalculate invoice totals
    await recalculateInvoiceTotals(invoiceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Line items DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete line item' }, { status: 500 })
  }
}

// Helper function to recalculate invoice totals
async function recalculateInvoiceTotals(invoiceId: string) {
  const lineItems = await prisma.invoiceLineItem.findMany({
    where: { invoiceId },
  })

  const subtotal = lineItems.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0)

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { discount: true },
  })

  const total = subtotal - (invoice?.discount || 0)

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { subtotal, total },
  })
}
