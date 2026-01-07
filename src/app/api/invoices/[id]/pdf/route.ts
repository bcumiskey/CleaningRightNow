import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import InvoicePDF from '@/lib/pdf/invoice-pdf'

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
          lineItems: invoice.lineItems.map((item: { id: string; date: Date | null; description: string; amount: number }) => ({
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

    // Return PDF as download (convert Buffer to Uint8Array for NextResponse compatibility)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
