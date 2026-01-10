import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET single job
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const job = await prisma.job.findUnique({
      where: { id: params.id },
      include: {
        property: {
          select: { id: true, name: true, address: true, imageUrl: true },
        },
        assignments: {
          include: {
            teamMember: { select: { id: true, name: true, rank: true, canSupervise: true } },
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Job GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
  }
}

// UPDATE job
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Build update object dynamically
    const updateData: Record<string, unknown> = {}

    // Status fields
    if (typeof data.completed === 'boolean') {
      updateData.completed = data.completed
      updateData.completedAt = data.completed ? new Date() : null
    }
    if (typeof data.clientPaid === 'boolean') {
      updateData.clientPaid = data.clientPaid
      updateData.clientPaidAt = data.clientPaid ? new Date() : null
      // When client paid is marked, also mark job as completed
      if (data.clientPaid) {
        updateData.completed = true
        updateData.completedAt = new Date()
      }
    }
    if (typeof data.teamPaid === 'boolean') {
      updateData.teamPaid = data.teamPaid
      updateData.teamPaidAt = data.teamPaid ? new Date() : null
    }

    // Other fields
    if (data.date) updateData.date = new Date(data.date)
    if (data.time !== undefined) updateData.time = data.time || null
    if (data.rate !== undefined) updateData.rate = parseFloat(data.rate)
    if (data.expensePercent !== undefined) updateData.expensePercent = parseFloat(data.expensePercent)
    if (data.propertyId) updateData.propertyId = data.propertyId

    const job = await prisma.job.update({
      where: { id: params.id },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            ownerName: true,
            ownerEmail: true,
            billingFrequency: true,
          },
        },
        assignments: {
          include: { teamMember: { select: { name: true } } },
        },
      },
    })

    // If clientPaid is true and property has per_job billing, create draft invoice
    if (data.clientPaid && job.property.billingFrequency === 'per_job') {
      // Check if invoice already exists for this job
      const existingInvoiceItem = await prisma.invoiceLineItem.findFirst({
        where: { jobId: job.id },
      })

      if (!existingInvoiceItem) {
        // Generate invoice number
        const lastInvoice = await prisma.invoice.findFirst({
          orderBy: { invoiceNumber: 'desc' },
        })
        const lastNumber = lastInvoice?.invoiceNumber
          ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) || 0
          : 0
        const invoiceNumber = `INV-${String(lastNumber + 1).padStart(5, '0')}`

        // Create draft invoice
        await prisma.invoice.create({
          data: {
            invoiceNumber,
            propertyId: job.property.id,
            invoiceDate: new Date(),
            paymentTerms: 'Due on Receipt',
            type: 'one_time',
            subtotal: job.rate,
            discount: 0,
            total: job.rate,
            status: 'draft',
            lineItems: {
              create: [{
                jobId: job.id,
                date: job.date,
                description: `Cleaning service - ${job.property.name}`,
                amount: job.rate,
                itemType: 'cleaning',
                sortOrder: 0,
              }],
            },
          },
        })
      }
    }

    // Handle team assignments if provided
    if (data.teamMemberIds !== undefined) {
      // Remove existing assignments
      await prisma.jobAssignment.deleteMany({
        where: { jobId: params.id },
      })

      // Add new assignments
      if (data.teamMemberIds.length > 0) {
        await prisma.jobAssignment.createMany({
          data: data.teamMemberIds.map((teamMemberId: string) => ({
            jobId: params.id,
            teamMemberId,
          })),
        })
      }

      // Fetch updated job with assignments
      const updatedJob = await prisma.job.findUnique({
        where: { id: params.id },
        include: {
          property: { select: { name: true } },
          assignments: {
            include: { teamMember: { select: { id: true, name: true } } },
          },
        },
      })

      return NextResponse.json(updatedJob)
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Job PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}

// DELETE job
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete jobs
    const userRole = (session.user as { role?: string })?.role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can delete jobs' }, { status: 403 })
    }

    await prisma.job.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Job DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 })
  }
}
