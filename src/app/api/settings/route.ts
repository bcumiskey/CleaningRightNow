import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const settingsSchema = z.object({
  businessName: z.string().optional().nullable(),
  businessPhone: z.string().optional().nullable(),
  businessEmail: z.string().email().optional().nullable(),
  businessAddress: z.string().optional().nullable(),
  expensePercentage: z.number().min(0).max(100).optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        businessName: true,
        businessPhone: true,
        businessEmail: true,
        businessAddress: true,
        expensePercentage: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = settingsSchema.parse(body)

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: validatedData,
      select: {
        businessName: true,
        businessPhone: true,
        businessEmail: true,
        businessAddress: true,
        expensePercentage: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Settings PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
