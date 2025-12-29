import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { z } from 'zod'

const updateExpenseSchema = z.object({
  date: z.string().optional(),
  category: z
    .enum([
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
    ])
    .optional(),
  amount: z.number().min(0).optional(),
  description: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  receipt: z.string().optional().nullable(),
  mileage: z.number().optional().nullable(),
  mileageRate: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// GET /api/expenses/[id] - Get single expense
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

    const expense = await prisma.expense.findUnique({
      where: { id },
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    if (expense.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Expense GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expense' },
      { status: 500 }
    )
  }
}

// PATCH /api/expenses/[id] - Update expense
export async function PATCH(
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
    const validatedData = updateExpenseSchema.parse(body)

    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    })

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    if (existingExpense.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculate mileage amount if mileage is updated
    let amount = validatedData.amount
    const category = validatedData.category || existingExpense.category
    if (category === 'MILEAGE' && validatedData.mileage !== undefined && validatedData.mileage !== null) {
      const rate = validatedData.mileageRate || existingExpense.mileageRate || 0.67
      amount = validatedData.mileage * rate
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(validatedData.date && { date: new Date(validatedData.date) }),
        ...(validatedData.category && { category: validatedData.category }),
        ...(amount !== undefined && { amount }),
        ...(validatedData.description !== undefined && {
          description: validatedData.description,
        }),
        ...(validatedData.vendor !== undefined && { vendor: validatedData.vendor }),
        ...(validatedData.receipt !== undefined && { receipt: validatedData.receipt }),
        ...(validatedData.mileage !== undefined && { mileage: validatedData.mileage }),
        ...(validatedData.mileageRate !== undefined && {
          mileageRate: validatedData.mileageRate,
        }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      entityType: 'Expense',
      entityId: expense.id,
      oldValues: existingExpense,
      newValues: expense,
      description: generateDescription('UPDATE', 'Expense', expense.category),
    })

    return NextResponse.json(expense)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Expense PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    )
  }
}

// DELETE /api/expenses/[id] - Delete expense
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

    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    })

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    if (existingExpense.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.expense.delete({
      where: { id },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'DELETE',
      entityType: 'Expense',
      entityId: id,
      oldValues: existingExpense,
      description: generateDescription(
        'DELETE',
        'Expense',
        `${existingExpense.category} - $${existingExpense.amount.toFixed(2)}`
      ),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Expense DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    )
  }
}
