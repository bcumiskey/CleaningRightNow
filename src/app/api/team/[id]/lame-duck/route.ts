import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/team/[id]/lame-duck — Mark a worker as Lame Duck
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

    // Verify the worker exists and is currently ACTIVE
    const worker = await prisma.teamMember.findUnique({ where: { id } })
    if (!worker) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    if ((worker as Record<string, unknown>).status === 'LAME_DUCK') {
      return NextResponse.json({ error: 'Worker is already in Lame Duck status' }, { status: 400 })
    }

    if ((worker as Record<string, unknown>).status === 'INACTIVE') {
      return NextResponse.json({ error: 'Worker is already inactive' }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find all incomplete future assignments for this worker
    // (jobs where completed = false AND date >= today)
    const futureAssignments = await prisma.jobAssignment.findMany({
      where: {
        teamMemberId: id,
        job: {
          completed: false,
          date: { gte: today },
        },
      },
      include: {
        job: {
          select: { id: true, date: true, property: { select: { name: true } } },
        },
      },
    })

    const jobsAffected = futureAssignments.length

    // Use a transaction to atomically update status and remove assignments
    await prisma.$transaction([
      // 1. Update worker status to LAME_DUCK
      prisma.teamMember.update({
        where: { id },
        data: {
          status: 'LAME_DUCK',
          lameDuckAt: new Date(),
        },
      }),
      // 2. Delete all future/incomplete assignments
      ...(futureAssignments.length > 0
        ? [
            prisma.jobAssignment.deleteMany({
              where: {
                id: { in: futureAssignments.map((a) => a.id) },
              },
            }),
          ]
        : []),
    ])

    return NextResponse.json({
      success: true,
      jobsAffected,
      message: `${worker.name} marked as Lame Duck. Removed from ${jobsAffected} upcoming job${jobsAffected !== 1 ? 's' : ''}.`,
    })
  } catch (error) {
    console.error('Mark lame duck error:', error)
    return NextResponse.json({ error: 'Failed to mark worker as lame duck' }, { status: 500 })
  }
}
