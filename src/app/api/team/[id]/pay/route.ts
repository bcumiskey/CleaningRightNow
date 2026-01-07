import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

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
    const totalPayment = unpaidJobs.reduce((sum: number, job: (typeof unpaidJobs)[number]) => {
      return sum + job.assignments.reduce((assignSum: number, a: { amountEarned: number | null }) => assignSum + (a.amountEarned || 0), 0)
    }, 0)

    // Mark all those jobs as team paid
    await prisma.job.updateMany({
      where: {
        id: {
          in: unpaidJobs.map((j: { id: string }) => j.id),
        },
      },
      data: {
        teamPaid: true,
        teamPaidAt: new Date(),
      },
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
