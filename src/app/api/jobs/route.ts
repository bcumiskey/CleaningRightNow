import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { calculateJobPayment } from '@/lib/utils'
import { z } from 'zod'

const jobSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().optional().nullable(),
  rate: z.number().min(0),
  expensePercent: z.number().min(0).max(100).default(12),
  source: z.enum(['manual', 'turno', 'google']).default('manual'),
  externalId: z.string().optional().nullable(),
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
    const completed = searchParams.get('completed')
    const clientPaid = searchParams.get('clientPaid')
    const teamPaid = searchParams.get('teamPaid')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const month = searchParams.get('month') // Format: "2026-01"
    const source = searchParams.get('source')

    const where: Record<string, unknown> = {}

    if (propertyId) {
      where.propertyId = propertyId
    }

    if (completed !== null && completed !== 'all') {
      where.completed = completed === 'true'
    }

    if (clientPaid !== null && clientPaid !== 'all') {
      where.clientPaid = clientPaid === 'true'
    }

    if (teamPaid !== null && teamPaid !== 'all') {
      where.teamPaid = teamPaid === 'true'
    }

    if (source && source !== 'all') {
      where.source = source
    }

    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      const startOfMonth = new Date(year, monthNum - 1, 1)
      const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59)
      where.date = {
        gte: startOfMonth,
        lte: endOfMonth,
      }
    } else if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        (where.date as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        (where.date as Record<string, Date>).lte = new Date(endDate)
      }
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            ownerName: true,
            ownerPhone: true,
            calendarSource: true,
          },
        },
        assignments: {
          include: {
            teamMember: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
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
      validatedData.rate,
      validatedData.expensePercent,
      validatedData.teamMemberIds.length
    )

    const job = await prisma.job.create({
      data: {
        propertyId: validatedData.propertyId,
        date: new Date(validatedData.date),
        time: validatedData.time,
        rate: validatedData.rate,
        expensePercent: validatedData.expensePercent,
        source: validatedData.source,
        externalId: validatedData.externalId,
        assignments: {
          create: validatedData.teamMemberIds.map((teamMemberId) => ({
            teamMemberId,
            amountEarned: payment.perPersonPayout,
          })),
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

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
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
