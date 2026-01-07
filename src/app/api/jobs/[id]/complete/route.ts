import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { calculateJobPayment } from '@/lib/utils'

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

    const existingJob = await prisma.job.findUnique({
      where: { id },
      include: {
        assignments: true,
        property: true,
      },
    })

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Calculate payment for each team member
    const payment = calculateJobPayment(
      existingJob.rate,
      existingJob.expensePercent,
      existingJob.assignments.length
    )

    // Update job and all assignments with calculated amounts
    const job = await prisma.job.update({
      where: { id },
      data: {
        completed: true,
        completedAt: new Date(),
        assignments: {
          updateMany: {
            where: { jobId: id },
            data: { amountEarned: payment.perPersonPayout },
          },
        },
      },
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
      description: generateDescription('COMPLETE', 'Job', `at ${job.property.name}`),
    })

    return NextResponse.json(job)
  } catch (error) {
    console.error('Job complete error:', error)
    return NextResponse.json(
      { error: 'Failed to complete job' },
      { status: 500 }
    )
  }
}
