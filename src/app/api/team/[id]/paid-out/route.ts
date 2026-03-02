import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/team/[id]/paid-out — Mark a lame duck worker as fully paid out (INACTIVE)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const worker = await prisma.teamMember.findUnique({ where: { id } })
    if (!worker) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    if ((worker as Record<string, unknown>).status !== 'LAME_DUCK') {
      return NextResponse.json(
        { error: 'Worker must be in Lame Duck status before being marked paid out' },
        { status: 400 }
      )
    }

    // Check outstanding balance: unpaid assignments where amountEarned > 0
    const unpaidAssignments = await prisma.jobAssignment.findMany({
      where: {
        teamMemberId: id,
        paidAt: null,
        amountEarned: { gt: 0 },
      },
    })

    const outstandingBalance = unpaidAssignments.reduce(
      (sum, a) => sum + (a.amountEarned || 0) + (a.payAdjustment || 0),
      0
    )

    // Read optional override flag from request body
    let forceOverride = false
    try {
      const body = await request.json()
      forceOverride = body.forceOverride === true
    } catch {
      // No body is fine — default to no override
    }

    if (outstandingBalance > 0 && !forceOverride) {
      return NextResponse.json(
        {
          error: `Worker has $${outstandingBalance.toFixed(2)} outstanding. Pay out or use override.`,
          outstandingBalance,
        },
        { status: 400 }
      )
    }

    // Update to INACTIVE
    await prisma.teamMember.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        isActive: false,
        finalPayAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: `${worker.name} has been archived as inactive. Historical records preserved.`,
    })
  } catch (error) {
    console.error('Mark paid out error:', error)
    return NextResponse.json({ error: 'Failed to mark worker as paid out' }, { status: 500 })
  }
}
