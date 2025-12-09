import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { calculateJobPayment } from '@/lib/utils'
import { z } from 'zod'

const jobSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  scheduledDate: z.string().min(1, 'Date is required'),
  scheduledTime: z.string().optional().nullable(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('SCHEDULED'),
  totalAmount: z.number().min(0).default(0),
  expensePercent: z.number().min(0).max(100).default(12),
  notes: z.string().optional().nullable(),
  clientPaid: z.boolean().default(false),
  teamPaid: z.boolean().default(false),
  services: z.array(z.object({
    serviceId: z.string(),
    price: z.number(),
  })).default([]),
  teamMemberIds: z.array(z.string()).default([]),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const propertyId = searchParams.get('propertyId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}

    if (propertyId) {
      where.propertyId = propertyId
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (startDate || endDate) {
      where.scheduledDate = {}
      if (startDate) {
        (where.scheduledDate as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        (where.scheduledDate as Record<string, Date>).lte = new Date(endDate)
      }
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        property: {
          include: {
            owner: true,
          },
        },
        services: {
          include: {
            service: true,
          },
        },
        teamAssignments: {
          include: {
            teamMember: true,
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    })

    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Jobs GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = jobSchema.parse(body)

    // Calculate payment breakdown
    const payment = calculateJobPayment(
      validatedData.totalAmount,
      validatedData.expensePercent,
      validatedData.teamMemberIds.length
    )

    const job = await prisma.job.create({
      data: {
        propertyId: validatedData.propertyId,
        scheduledDate: new Date(validatedData.scheduledDate),
        scheduledTime: validatedData.scheduledTime,
        status: validatedData.status,
        totalAmount: validatedData.totalAmount,
        expensePercent: validatedData.expensePercent,
        expenseAmount: payment.expenseAmount,
        teamPayoutTotal: payment.teamPayoutTotal,
        notes: validatedData.notes,
        clientPaid: validatedData.clientPaid,
        teamPaid: validatedData.teamPaid,
        services: {
          create: validatedData.services.map((s) => ({
            serviceId: s.serviceId,
            price: s.price,
          })),
        },
        teamAssignments: {
          create: validatedData.teamMemberIds.map((teamMemberId) => ({
            teamMemberId,
            payoutAmount: payment.perPersonPayout,
          })),
        },
      },
      include: {
        property: true,
        services: {
          include: {
            service: true,
          },
        },
        teamAssignments: {
          include: {
            teamMember: true,
          },
        },
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      entityType: 'Job',
      entityId: job.id,
      newValues: job,
      description: generateDescription('CREATE', 'Job', `at ${job.property.name}`),
    })

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Jobs POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    )
  }
}
