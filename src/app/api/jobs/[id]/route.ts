import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { calculateJobPayments } from '@/lib/utils'

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
    if (typeof data.teamPaid === 'boolean') {
      updateData.teamPaid = data.teamPaid
      updateData.teamPaidAt = data.teamPaid ? new Date() : null
    }

    // Other fields
    if (data.date) {
      // Parse date string as local date (not UTC) to avoid timezone shift
      const dateParts = data.date.split('-')
      if (dateParts.length === 3) {
        updateData.date = new Date(
          parseInt(dateParts[0]),
          parseInt(dateParts[1]) - 1,
          parseInt(dateParts[2]),
          12, 0, 0
        )
      }
    }
    if (data.time !== undefined) updateData.time = data.time || null
    if (data.priority !== undefined) updateData.priority = parseInt(data.priority)
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

    // When job is marked completed, calculate and store amountEarned for each assignment
    if (data.completed && job.assignments.length > 0) {
      const payments = calculateJobPayments(job.rate, job.expensePercent, job.assignments.length)
      await prisma.jobAssignment.updateMany({
        where: { jobId: job.id },
        data: { amountEarned: payments.perPerson },
      })
    }

    // When rate or expensePercent changes, cascade to invoice line items (DRAFT only) and recalculate amountEarned
    if (data.rate !== undefined || data.expensePercent !== undefined) {
      // Only cascade to draft invoices - sent/paid invoices are locked
      const linkedLineItem = await prisma.invoiceLineItem.findFirst({
        where: { jobId: job.id },
        include: { invoice: { select: { id: true, status: true, discount: true } } },
      })
      if (linkedLineItem && linkedLineItem.invoice.status === 'draft') {
        await prisma.invoiceLineItem.update({
          where: { id: linkedLineItem.id },
          data: { amount: job.rate },
        })
        // Recalculate parent invoice totals from all its line items
        const allLineItems = await prisma.invoiceLineItem.findMany({
          where: { invoiceId: linkedLineItem.invoiceId },
        })
        const subtotal = allLineItems.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0)
        await prisma.invoice.update({
          where: { id: linkedLineItem.invoiceId },
          data: { subtotal, total: subtotal - (linkedLineItem.invoice.discount || 0) },
        })
      }

      // Recalculate amountEarned for existing assignments if job is completed
      if (job.completed && job.assignments.length > 0) {
        const payments = calculateJobPayments(job.rate, job.expensePercent, job.assignments.length)
        await prisma.jobAssignment.updateMany({
          where: { jobId: job.id },
          data: { amountEarned: payments.perPerson },
        })
      }
    }

    // If job is marked completed, handle invoice creation based on billing frequency
    if (data.completed) {
      // Check if this job is already on an invoice
      const existingInvoiceItem = await prisma.invoiceLineItem.findFirst({
        where: { jobId: job.id },
      })

      if (!existingInvoiceItem) {
        const billingFreq = job.property.billingFrequency || 'per_job'

        if (billingFreq === 'per_job') {
          // Per-job billing: Create individual invoice immediately
          const lastInvoice = await prisma.invoice.findFirst({
            orderBy: { invoiceNumber: 'desc' },
          })
          const lastNumber = lastInvoice?.invoiceNumber
            ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) || 0
            : 0
          const invoiceNumber = `INV-${String(lastNumber + 1).padStart(5, '0')}`

          await prisma.invoice.create({
            data: {
              invoiceNumber,
              propertyId: job.property.id,
              invoiceDate: new Date(),
              paymentTerms: 'Due on Receipt',
              type: 'per_job',
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
        } else {
          // Accumulated billing (weekly, biweekly, monthly): Add to existing draft or create new
          const now = new Date()
          let billingPeriod = ''
          let invoiceType = billingFreq

          // Determine billing period label
          if (billingFreq === 'weekly') {
            const weekStart = new Date(now)
            weekStart.setDate(now.getDate() - now.getDay())
            billingPeriod = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          } else if (billingFreq === 'biweekly') {
            const weekStart = new Date(now)
            weekStart.setDate(now.getDate() - now.getDay())
            billingPeriod = `Bi-weekly ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          } else {
            // Monthly (monthly_1st, monthly_15th, monthly_end)
            billingPeriod = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            invoiceType = 'monthly'
          }

          // Look for existing draft invoice for this property and billing period
          const existingDraft = await prisma.invoice.findFirst({
            where: {
              propertyId: job.property.id,
              status: 'draft',
              type: invoiceType,
              billingPeriod: billingPeriod,
            },
            include: { lineItems: true },
          })

          if (existingDraft) {
            // Add line item to existing draft
            await prisma.invoiceLineItem.create({
              data: {
                invoiceId: existingDraft.id,
                jobId: job.id,
                date: job.date,
                description: `Cleaning service - ${job.property.name}`,
                amount: job.rate,
                itemType: 'cleaning',
                sortOrder: existingDraft.lineItems.length,
              },
            })

            // Update totals
            const newSubtotal = existingDraft.subtotal + job.rate
            await prisma.invoice.update({
              where: { id: existingDraft.id },
              data: {
                subtotal: newSubtotal,
                total: newSubtotal - existingDraft.discount,
              },
            })
          } else {
            // Create new draft invoice for this billing period
            const lastInvoice = await prisma.invoice.findFirst({
              orderBy: { invoiceNumber: 'desc' },
            })
            const lastNumber = lastInvoice?.invoiceNumber
              ? parseInt(lastInvoice.invoiceNumber.replace(/\D/g, '')) || 0
              : 0
            const invoiceNumber = `INV-${String(lastNumber + 1).padStart(5, '0')}`

            await prisma.invoice.create({
              data: {
                invoiceNumber,
                propertyId: job.property.id,
                invoiceDate: new Date(),
                paymentTerms: 'Due on Receipt',
                type: invoiceType,
                billingPeriod: billingPeriod,
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
      }
    }

    // Handle team assignments if provided
    if (data.teamMemberIds !== undefined) {
      // Remove existing assignments
      await prisma.jobAssignment.deleteMany({
        where: { jobId: params.id },
      })

      // Add new assignments with amountEarned if job is completed
      if (data.teamMemberIds.length > 0) {
        const currentJob = await prisma.job.findUnique({ where: { id: params.id } })
        const amountEarned = currentJob?.completed && currentJob.rate > 0
          ? calculateJobPayments(currentJob.rate, currentJob.expensePercent, data.teamMemberIds.length).perPerson
          : null
        await prisma.jobAssignment.createMany({
          data: data.teamMemberIds.map((teamMemberId: string) => ({
            jobId: params.id,
            teamMemberId,
            amountEarned,
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
