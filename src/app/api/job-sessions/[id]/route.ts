import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET - Get a specific session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await prisma.jobSession.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            property: { select: { id: true, name: true, address: true } },
          },
        },
        teamMember: { select: { id: true, name: true, rank: true, canSupervise: true } },
        supervisor: { select: { id: true, name: true } },
        rating: true,
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('Job session GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}

// PATCH - Update a session (mark absent, complete, add notes, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      status,
      isAbsent,
      absentReason,
      markedAbsentBy,
      isLastMinuteFillIn,
      fillInBonus,
      notes,
      completionPhotos,
      checkedOutAt,
    } = body

    const existingSession = await prisma.jobSession.findUnique({
      where: { id },
      include: { teamMember: { select: { id: true, reliabilityScore: true } } },
    })

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (status !== undefined) {
      updateData.status = status
    }

    // Handle marking absent
    if (isAbsent !== undefined) {
      updateData.isAbsent = isAbsent
      if (isAbsent) {
        updateData.status = 'absent'
        updateData.markedAbsentAt = new Date()
        if (markedAbsentBy) updateData.markedAbsentBy = markedAbsentBy
        if (absentReason) updateData.absentReason = absentReason
      }
    }

    // Handle fill-in bonus
    if (isLastMinuteFillIn !== undefined) {
      updateData.isLastMinuteFillIn = isLastMinuteFillIn
      if (fillInBonus) updateData.fillInBonus = parseFloat(fillInBonus)
    }

    // Handle completion
    if (checkedOutAt !== undefined) {
      updateData.checkedOutAt = checkedOutAt ? new Date(checkedOutAt) : new Date()
      updateData.status = 'completed'
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (completionPhotos !== undefined) {
      updateData.completionPhotos = JSON.stringify(completionPhotos)
    }

    const updatedSession = await prisma.jobSession.update({
      where: { id },
      data: updateData,
      include: {
        job: {
          include: {
            property: { select: { id: true, name: true, address: true } },
          },
        },
        teamMember: { select: { id: true, name: true, rank: true } },
        supervisor: { select: { id: true, name: true } },
      },
    })

    // If marked absent, update reliability score
    if (isAbsent && existingSession.teamMember) {
      const memberSessions = await prisma.jobSession.findMany({
        where: { teamMemberId: existingSession.teamMemberId },
        select: { isAbsent: true },
      })
      const totalSessions = memberSessions.length
      const absentSessions = memberSessions.filter((s: { isAbsent: boolean | null }) => s.isAbsent).length
      const reliabilityScore = totalSessions > 0
        ? ((totalSessions - absentSessions) / totalSessions) * 100
        : 100

      await prisma.teamMember.update({
        where: { id: existingSession.teamMemberId },
        data: { reliabilityScore },
      })
    }

    return NextResponse.json(updatedSession)
  } catch (error) {
    console.error('Job session PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}

// DELETE - Remove a session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.jobSession.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Job session DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}
