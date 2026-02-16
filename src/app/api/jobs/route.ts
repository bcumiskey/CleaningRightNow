import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { calculateJobPayments } from '@/lib/utils'

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
          select: { id: true, name: true, address: true, color: true },
        },
        assignments: {
          select: {
            id: true,
            paidAt: true,
            paymentMethod: true,
            teamMember: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { priority: 'asc' }, { time: 'asc' }],
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
    // Parse date string as local date (not UTC) to avoid timezone shift
    // Input: "2026-01-12" -> Should be Jan 12 at midnight local time
    const dateParts = data.date.split('-')
    if (dateParts.length !== 3) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }
    const jobDate = new Date(
      parseInt(dateParts[0]), // year
      parseInt(dateParts[1]) - 1, // month (0-indexed)
      parseInt(dateParts[2]), // day
      12, 0, 0 // noon local time to avoid any date boundary issues
    )
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

    const jobRate = data.rate || property.baseRate
    const jobExpensePercent = data.expensePercent ?? property.expensePercent ?? 12
    const teamMemberIds: string[] = data.teamMemberIds || []

    // Pre-calculate amountEarned for assignments if we have a rate and team
    const amountEarned = teamMemberIds.length > 0 && jobRate > 0
      ? calculateJobPayments(jobRate, jobExpensePercent, teamMemberIds.length).perPerson
      : null

    const job = await prisma.job.create({
      data: {
        date: jobDate,
        time: data.time || null,
        priority: data.priority ?? 5,
        propertyId: data.propertyId,
        rate: jobRate,
        expensePercent: jobExpensePercent,
        source: 'manual',
        assignments: teamMemberIds.length > 0
          ? {
              create: teamMemberIds.map((id: string) => ({
                teamMemberId: id,
                amountEarned,
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
