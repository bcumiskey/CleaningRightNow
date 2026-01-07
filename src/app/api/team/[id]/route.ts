import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { z } from 'zod'

const teamMemberUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  role: z.enum(['admin', 'worker']).optional(),
  isActive: z.boolean().optional(),
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

    const teamMember = await prisma.teamMember.findUnique({
      where: { id },
      include: {
        jobAssignments: {
          include: {
            job: {
              include: {
                property: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: {
            job: { date: 'desc' },
          },
          take: 50,
        },
      },
    })

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Calculate owed amount
    const unpaidAssignments = await prisma.jobAssignment.findMany({
      where: {
        teamMemberId: id,
        job: {
          completed: true,
          teamPaid: false,
        },
      },
      select: {
        amountEarned: true,
      },
    })

    const owedAmount = unpaidAssignments.reduce(
      (sum, a) => sum + (a.amountEarned || 0),
      0
    )

    return NextResponse.json({
      ...teamMember,
      owedAmount,
      passwordHash: undefined,
    })
  } catch (error) {
    console.error('Team member GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team member' },
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
    const validatedData = teamMemberUpdateSchema.parse(body)

    const existingMember = await prisma.teamMember.findUnique({
      where: { id },
    })

    if (!existingMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    const teamMember = await prisma.teamMember.update({
      where: { id },
      data: validatedData,
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'UPDATE',
      entityType: 'TeamMember',
      entityId: teamMember.id,
      oldValues: { ...existingMember, passwordHash: undefined },
      newValues: { ...teamMember, passwordHash: undefined },
      description: generateDescription('UPDATE', 'Team Member', teamMember.name),
    })

    return NextResponse.json({ ...teamMember, passwordHash: undefined })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Team member PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update team member' },
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

    const existingMember = await prisma.teamMember.findUnique({
      where: { id },
    })

    if (!existingMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    await prisma.teamMember.delete({
      where: { id },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'DELETE',
      entityType: 'TeamMember',
      entityId: id,
      oldValues: { ...existingMember, passwordHash: undefined },
      description: generateDescription('DELETE', 'Team Member', existingMember.name),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Team member DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete team member' },
      { status: 500 }
    )
  }
}
