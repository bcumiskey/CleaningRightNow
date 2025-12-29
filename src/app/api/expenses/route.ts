import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { z } from 'zod'

const expenseSchema = z.object({
  date: z.string().optional(),
  category: z.enum([
    'SUPPLIES',
    'EQUIPMENT',
    'GAS_FUEL',
    'MILEAGE',
    'LAUNDRY',
    'INSURANCE',
    'MARKETING',
    'SOFTWARE',
    'VEHICLE',
    'REPAIRS',
    'UTILITIES',
    'OTHER',
  ]),
  amount: z.number().min(0, 'Amount must be positive'),
  description: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  receipt: z.string().optional().nullable(),
  mileage: z.number().optional().nullable(),
  mileageRate: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// GET /api/expenses - List all expenses
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const category = searchParams.get('category')

    const where: Record<string, unknown> = {
      userId: session.user.id,
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        (where.date as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        (where.date as Record<string, Date>).lte = new Date(endDate)
      }
    }

    if (category && category !== 'all') {
      where.category = category
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Expenses GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

// POST /api/expenses - Create new expense
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = expenseSchema.parse(body)

    // Calculate mileage amount if mileage is provided
    let amount = validatedData.amount
    if (validatedData.category === 'MILEAGE' && validatedData.mileage) {
      const rate = validatedData.mileageRate || 0.67 // 2024 IRS standard rate
      amount = validatedData.mileage * rate
    }

    const expense = await prisma.expense.create({
      data: {
        userId: session.user.id,
        date: validatedData.date ? new Date(validatedData.date) : new Date(),
        category: validatedData.category,
        amount,
        description: validatedData.description,
        vendor: validatedData.vendor,
        receipt: validatedData.receipt,
        mileage: validatedData.mileage,
        mileageRate: validatedData.mileageRate,
        notes: validatedData.notes,
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      entityType: 'Expense',
      entityId: expense.id,
      newValues: expense,
      description: generateDescription(
        'CREATE',
        'Expense',
        `${validatedData.category} - $${amount.toFixed(2)}`
      ),
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Expense POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    )
  }
}
