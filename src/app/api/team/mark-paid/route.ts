import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can mark payments as paid
    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { assignmentIds } = await request.json()

    if (!assignmentIds || !Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      return NextResponse.json({ error: 'Assignment IDs required' }, { status: 400 })
    }

    // Update all assignments to mark them as paid
    const result = await prisma.jobAssignment.updateMany({
      where: {
        id: { in: assignmentIds },
        paidAt: null, // Only update unpaid ones
      },
      data: {
        paidAt: new Date(),
      },
    })

    // Also update the job's teamPaid status if all workers are now paid
    // Get unique job IDs from these assignments
    const assignments = await prisma.jobAssignment.findMany({
      where: { id: { in: assignmentIds } },
      select: { jobId: true },
    })

    const uniqueJobIds = [...new Set(assignments.map((a) => a.jobId))]

    // For each job, check if all assignments are now paid
    for (const jobId of uniqueJobIds) {
      const unpaidCount = await prisma.jobAssignment.count({
        where: {
          jobId,
          paidAt: null,
        },
      })

      if (unpaidCount === 0) {
        await prisma.job.update({
          where: { id: jobId },
          data: {
            teamPaid: true,
            teamPaidAt: new Date(),
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      updated: result.count,
    })
  } catch (error) {
    console.error('Mark paid error:', error)
    return NextResponse.json({ error: 'Failed to mark payments as paid' }, { status: 500 })
  }
}
