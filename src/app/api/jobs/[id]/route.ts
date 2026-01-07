import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { calculateJobPayment } from '@/lib/utils'
import { z } from 'zod'

const jobUpdateSchema = z.object({
  date: z.string().optional(),
  time: z.string().optional().nullable(),
  rate: z.number().min(0).optional(),
  expensePercent: z.number().min(0).max(100).optional(),
  completed: z.boolean().optional(),
  clientPaid: z.boolean().optional(),
  teamPaid: z.boolean().optional(),
  source: z.enum(['manual', 'turno', 'google']).optional(),
  teamMemberIds: z.array(z.string()).optional(),
})

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

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        property: {
          include: {
            notes: {
              where: { status: 'active' },
              orderBy: { createdAt: 'desc' },
            },
            standingInstructions: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        assignments: {
          include: {
            teamMember: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
        invoiceItems: {
          include: {
            invoice: true,
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
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    )
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
    const body = await request.json()
    const validatedData = jobUpdateSchema.parse(body)

    const existingJob = await prisma.job.findUnique({
      where: { id },
      include: { assignments: true },
    })

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}

    if (validatedData.date) {
      updateData.date = new Date(validatedData.date)
    }
    if (validatedData.time !== undefined) {
      updateData.time = validatedData.time
    }
    if (validatedData.rate !== undefined) {
      updateData.rate = validatedData.rate
    }
    if (validatedData.expensePercent !== undefined) {
      updateData.expensePercent = validatedData.expensePercent
    }
    if (validatedData.source !== undefined) {
      updateData.source = validatedData.source
    }
    if (validatedData.completed !== undefined) {
      updateData.completed = validatedData.completed
      if (validatedData.completed) {
        updateData.completedAt = new Date()
      }
    }
    if (validatedData.clientPaid !== undefined) {
      updateData.clientPaid = validatedData.clientPaid
      if (validatedData.clientPaid) {
        updateData.clientPaidAt = new Date()
      }
    }
    if (validatedData.teamPaid !== undefined) {
      updateData.teamPaid = validatedData.teamPaid
      if (validatedData.teamPaid) {
        updateData.teamPaidAt = new Date()
      }
    }

    // Handle team member updates
    if (validatedData.teamMemberIds) {
      const rate = validatedData.rate ?? existingJob.rate
      const expensePercent = validatedData.expensePercent ?? existingJob.expensePercent
      const payment = calculateJobPayment(rate, expensePercent, validatedData.teamMemberIds.length)

      // Delete existing assignments and create new ones
      await prisma.jobAssignment.deleteMany({
        where: { jobId: id },
      })

      updateData.assignments = {
        create: validatedData.teamMemberIds.map((teamMemberId) => ({
          teamMemberId,
          amountEarned: payment.perPersonPayout,
        })),
      }
    }

    const job = await prisma.job.update({
      where: { id },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        assignments: {
          include: {
            teamMember: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      entityType: 'Job',
      entityId: job.id,
      oldValues: existingJob,
      newValues: job,
      description: generateDescription('UPDATE', 'Job', `at ${job.property.name}`),
    })

    return NextResponse.json(job)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Job PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    )
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

    const { id } = await params

    const existingJob = await prisma.job.findUnique({
      where: { id },
      include: { property: true },
    })

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    await prisma.job.delete({
      where: { id },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'DELETE',
      entityType: 'Job',
      entityId: id,
      oldValues: existingJob,
      description: generateDescription('DELETE', 'Job', `at ${existingJob.property.name}`),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Job DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    )
  }
}
