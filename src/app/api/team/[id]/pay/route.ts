import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createAuditLog, generateDescription } from '@/lib/audit'

export async function POST(
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
    })

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Find all unpaid jobs where this team member has assignments
    const unpaidJobs = await prisma.job.findMany({
      where: {
        completed: true,
        teamPaid: false,
        assignments: {
          some: {
            teamMemberId: id,
          },
        },
      },
      include: {
        assignments: {
          where: {
            teamMemberId: id,
          },
        },
      },
    })

    if (unpaidJobs.length === 0) {
      return NextResponse.json({ error: 'No unpaid jobs found for this team member' }, { status: 400 })
    }

    // Calculate total payment
    const totalPayment = unpaidJobs.reduce((sum, job) => {
      return sum + job.assignments.reduce((assignSum, a) => assignSum + (a.amountEarned || 0), 0)
    }, 0)

    // Mark all those jobs as team paid
    await prisma.job.updateMany({
      where: {
        id: {
          in: unpaidJobs.map((j) => j.id),
        },
      },
      data: {
        teamPaid: true,
        teamPaidAt: new Date(),
      },
    })

    await createAuditLog({
      userId: session.user.id,
      action: 'CREATE',
      entityType: 'TeamPayment',
      entityId: id,
      newValues: {
        teamMemberId: id,
        amount: totalPayment,
        jobCount: unpaidJobs.length,
        jobIds: unpaidJobs.map((j) => j.id),
      },
      description: generateDescription('PAY', 'Team Member', `${teamMember.name} - $${totalPayment.toFixed(2)}`),
    })

    return NextResponse.json({
      success: true,
      amount: totalPayment,
      jobCount: unpaidJobs.length,
    })
  } catch (error) {
    console.error('Team pay error:', error)
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    )
  }
}
