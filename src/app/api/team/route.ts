import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'
import { z } from 'zod'

const teamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  active: z.boolean().default(true),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teamMembers = await prisma.teamMember.findMany({
      include: {
        jobAssignments: {
          where: {
            paid: false,
            job: {
              status: 'COMPLETED',
            },
          },
          select: {
            payoutAmount: true,
          },
        },
        _count: {
          select: {
            jobAssignments: true,
            payments: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Calculate owed amounts
    const membersWithOwed = teamMembers.map((member) => ({
      ...member,
      owedAmount: member.jobAssignments.reduce(
        (sum, assignment) => sum + assignment.payoutAmount,
        0
      ),
    }))

    return NextResponse.json(membersWithOwed)
  } catch (error) {
    console.error('Team GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
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
    const validatedData = teamMemberSchema.parse(body)

    const teamMember = await prisma.teamMember.create({
      data: validatedData,
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      entityType: 'TeamMember',
      entityId: teamMember.id,
      newValues: teamMember,
      description: generateDescription('CREATE', 'Team Member', teamMember.name),
    })

    return NextResponse.json(teamMember, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Team POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create team member' },
      { status: 500 }
    )
  }
}
