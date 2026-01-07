import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

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

    // Get all paid jobs for this team member
    const paidJobs = await prisma.job.findMany({
      where: {
        completed: true,
        teamPaid: true,
        assignments: {
          some: {
            teamMemberId: id,
          },
        },
      },
      include: {
        property: {
          select: { id: true, name: true },
        },
        assignments: {
          where: { teamMemberId: id },
          select: { amountEarned: true },
        },
      },
      orderBy: { teamPaidAt: 'desc' },
    })

    // Group by payment date
    type PaymentHistoryAcc = Record<string, { date: string; jobs: unknown[]; total: number }>
    const paymentHistory = paidJobs.reduce((acc: PaymentHistoryAcc, job: (typeof paidJobs)[number]) => {
      const paidAt = job.teamPaidAt?.toISOString().split('T')[0] || 'unknown'
      if (!acc[paidAt]) {
        acc[paidAt] = {
          date: paidAt,
          jobs: [],
          total: 0,
        }
      }
      const amount = job.assignments[0]?.amountEarned || 0
      acc[paidAt].jobs.push({
        id: job.id,
        date: job.date,
        property: job.property,
        amount,
      })
      acc[paidAt].total += amount
      return acc
    }, {} as Record<string, { date: string; jobs: unknown[]; total: number }>)

    return NextResponse.json(Object.values(paymentHistory))
  } catch (error) {
    console.error('Team payments GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment history' },
      { status: 500 }
    )
  }
}
