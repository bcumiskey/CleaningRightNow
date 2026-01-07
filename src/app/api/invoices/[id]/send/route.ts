import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import InvoicePDF from '@/lib/pdf/invoice-pdf'
import { sendInvoiceEmail } from '@/lib/email'

export async function POST(
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

    // Get invoice with all details
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        property: {
          select: {
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

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (!invoice.property.ownerEmail) {
      return NextResponse.json(
        { error: 'Property owner has no email address configured' },
        { status: 400 }
      )
    }

    // Get company settings
    const settings = await prisma.companySettings.findUnique({
      where: { id: 'default' },
    })

    const company = {
      companyName: settings?.companyName || 'Cleaning Right Now',
      address: settings?.address,
      phone: settings?.phone,
      email: settings?.email,
      logoUrl: settings?.logoUrl,
      invoiceFooter: settings?.invoiceFooter,
      invoiceTerms: settings?.invoiceTerms,
    }

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      InvoicePDF({
        invoice: {
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          paymentTerms: invoice.paymentTerms,
          billingPeriod: invoice.billingPeriod,
          subtotal: invoice.subtotal,
          discount: invoice.discount,
          total: invoice.total,
          status: invoice.status,
          notes: invoice.notes,
          lineItems: invoice.lineItems.map((item) => ({
            id: item.id,
            date: item.date,
            description: item.description,
            amount: item.amount,
          })),
          property: invoice.property,
        },
        company,
      })
    )

    // Send email
    const emailResult = await sendInvoiceEmail({
      to: invoice.property.ownerEmail,
      invoiceNumber: invoice.invoiceNumber,
      propertyName: invoice.property.name,
      total: invoice.total,
      pdfBuffer: Buffer.from(pdfBuffer),
      fromName: company.companyName,
    })

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    // Update invoice status to sent
    await prisma.invoice.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: `Invoice sent to ${invoice.property.ownerEmail}`,
    })
  } catch (error) {
    console.error('Send invoice error:', error)
    return NextResponse.json({ error: 'Failed to send invoice' }, { status: 500 })
  }
}
