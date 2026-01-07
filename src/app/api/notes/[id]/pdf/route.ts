import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import IncidentReportPDF from '@/lib/pdf/incident-report-pdf'

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

    // Get note with all details
    const note = await prisma.propertyNote.findUnique({
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
        addedBy: {
          select: { name: true },
        },
        photos: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
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
    }

    // Generate PDF
    const pdfDocument = IncidentReportPDF({
      incident: {
        type: note.type,
        title: note.title || undefined,
        content: note.content,
        severity: note.severity || undefined,
        estimatedCost: note.estimatedCost || undefined,
        createdAt: note.createdAt,
        addedBy: note.addedBy,
        photos: note.photos.map((p: { url: string; caption: string | null }) => ({
          url: p.url,
          caption: p.caption || undefined,
        })),
      },
      property: note.property,
      company,
    })

    const pdfBuffer = await renderToBuffer(pdfDocument as React.ReactElement)

    // Generate filename
    const propertyName = note.property.name.replace(/[^a-zA-Z0-9]/g, '-')
    const date = note.createdAt.toISOString().split('T')[0]
    const filename = `Incident-Report-${propertyName}-${date}.pdf`

    // Return PDF as download (convert Buffer to Uint8Array for NextResponse compatibility)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Incident report PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
