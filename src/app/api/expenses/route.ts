import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

// IRS mileage rate for 2026 (update annually)
const MILEAGE_RATE = 0.70

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'this_month'

    // Calculate date range
    let start: Date
    let end: Date
    const now = new Date()

    switch (period) {
      case 'this_month':
        start = startOfMonth(now)
        end = endOfMonth(now)
        break
      case 'last_month':
        const lastMonth = subMonths(now, 1)
        start = startOfMonth(lastMonth)
        end = endOfMonth(lastMonth)
        break
      case 'last_3_months':
        start = startOfMonth(subMonths(now, 2))
        end = endOfMonth(now)
        break
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1)
        end = new Date(now.getFullYear(), 11, 31)
        break
      case 'all':
      default:
        start = new Date(2020, 0, 1)
        end = now
    }

    const expenses = await prisma.expense.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      include: {
        property: { select: { id: true, name: true } },
        job: { select: { id: true, date: true } },
      },
      orderBy: { date: 'desc' },
    })

    // Calculate totals by category
    const byCategory: Record<string, number> = {}
    let total = 0

    expenses.forEach((exp) => {
      const cat = exp.category
      byCategory[cat] = (byCategory[cat] || 0) + exp.amount
      total += exp.amount
    })

    return NextResponse.json({
      expenses,
      summary: {
        total,
        byCategory,
        count: expenses.length,
        period,
        dateRange: { start, end },
      },
      mileageRate: MILEAGE_RATE,
    })
  } catch (error) {
    console.error('Expenses GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string; id?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await request.json()

    // Validate required fields
    if (!data.date || !data.category || !data.description) {
      return NextResponse.json(
        { error: 'Date, category, and description are required' },
        { status: 400 }
      )
    }

    // Calculate amount for mileage expenses
    let amount = data.amount
    if (data.category === 'mileage' && data.miles) {
      const rate = data.mileageRate || MILEAGE_RATE
      amount = data.miles * rate
    }

    const expense = await prisma.expense.create({
      data: {
        date: new Date(data.date),
        category: data.category,
        description: data.description,
        amount: amount || 0,
        vendor: data.vendor || null,
        receiptUrl: data.receiptUrl || null,
        propertyId: data.propertyId || null,
        jobId: data.jobId || null,
        miles: data.miles || null,
        mileageRate: data.category === 'mileage' ? (data.mileageRate || MILEAGE_RATE) : null,
        notes: data.notes || null,
        createdById: sessionUser.id || null,
      },
      include: {
        property: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Expenses POST error:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}
