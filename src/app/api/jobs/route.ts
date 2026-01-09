import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    let whereClause = {}
    if (month && year) {
      const monthNum = parseInt(month)
      const yearNum = parseInt(year)
      // Validate month and year ranges
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12 || isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 })
      }
      const startDate = new Date(yearNum, monthNum - 1, 1)
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59)
      whereClause = {
        date: { gte: startDate, lte: endDate },
      }
    }

    const jobs = await prisma.job.findMany({
      where: whereClause,
      include: {
        property: {
          select: { id: true, name: true, address: true },
        },
        assignments: {
          include: {
            teamMember: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { time: 'asc' }],
    })

    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Jobs GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Validate required fields
    if (!data.propertyId) {
      return NextResponse.json({ error: 'Property is required' }, { status: 400 })
    }
    if (!data.date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }
    const jobDate = new Date(data.date)
    if (isNaN(jobDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }
    if (data.rate !== undefined && (isNaN(parseFloat(data.rate)) || parseFloat(data.rate) < 0)) {
      return NextResponse.json({ error: 'Rate must be a non-negative number' }, { status: 400 })
    }

    // Get property for rate if not provided
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const job = await prisma.job.create({
      data: {
        date: jobDate,
        time: data.time || null,
        propertyId: data.propertyId,
        rate: data.rate || property.baseRate,
        expensePercent: data.expensePercent ?? property.expensePercent ?? 12,
        source: 'manual',
        assignments: data.teamMemberIds?.length > 0
          ? {
              create: data.teamMemberIds.map((id: string) => ({
                teamMemberId: id,
              })),
            }
          : undefined,
      },
      include: {
        property: { select: { name: true } },
        assignments: {
          include: { teamMember: { select: { name: true } } },
        },
      },
    })

    return NextResponse.json(job)
  } catch (error) {
    console.error('Jobs POST error:', error)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}
