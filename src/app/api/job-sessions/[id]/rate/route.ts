import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// POST - Rate a team member for a job session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const body = await request.json()
    const { ratedById, qualityRating, speedRating, attitudeRating, feedback } = body

    // Validate ratings (1-5)
    if (!qualityRating || !speedRating || !attitudeRating) {
      return NextResponse.json(
        { error: 'All ratings (quality, speed, attitude) are required' },
        { status: 400 }
      )
    }

    const validateRating = (r: number) => r >= 1 && r <= 5
    if (!validateRating(qualityRating) || !validateRating(speedRating) || !validateRating(attitudeRating)) {
      return NextResponse.json(
        { error: 'Ratings must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Get the session
    const session = await prisma.jobSession.findUnique({
      where: { id: sessionId },
      include: { teamMember: true },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify the rater is the supervisor or has permission
    if (ratedById) {
      const rater = await prisma.teamMember.findUnique({
        where: { id: ratedById },
        select: { id: true, rank: true, canSupervise: true },
      })

      if (!rater) {
        return NextResponse.json({ error: 'Rater not found' }, { status: 404 })
      }

      // Can only rate if you're a supervisor or have higher rank
      const canRate = rater.canSupervise || (rater.rank ?? 0) > (session.teamMember.rank ?? 0)
      if (!canRate) {
        return NextResponse.json(
          { error: 'You do not have permission to rate this team member' },
          { status: 403 }
        )
      }
    }

    // Calculate overall rating
    const overallRating = (qualityRating + speedRating + attitudeRating) / 3

    // Create or update the rating
    const rating = await prisma.performanceRating.upsert({
      where: { sessionId },
      create: {
        sessionId,
        teamMemberId: session.teamMemberId,
        ratedById: ratedById || session.supervisorId || session.teamMemberId,
        qualityRating,
        speedRating,
        attitudeRating,
        overallRating,
        feedback: feedback || null,
      },
      update: {
        qualityRating,
        speedRating,
        attitudeRating,
        overallRating,
        feedback: feedback || null,
      },
    })

    // Update team member's average rating
    const allRatings = await prisma.performanceRating.findMany({
      where: { teamMemberId: session.teamMemberId },
      select: { overallRating: true },
    })

    const avgRating = allRatings.reduce((sum, r) => sum + r.overallRating, 0) / allRatings.length

    await prisma.teamMember.update({
      where: { id: session.teamMemberId },
      data: {
        avgRating,
        totalRatings: allRatings.length,
      },
    })

    return NextResponse.json(rating)
  } catch (error) {
    console.error('Rating POST error:', error)
    return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
  }
}

// GET - Get rating for a session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    const rating = await prisma.performanceRating.findUnique({
      where: { sessionId },
      include: {
        teamMember: { select: { id: true, name: true } },
        ratedBy: { select: { id: true, name: true } },
      },
    })

    if (!rating) {
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 })
    }

    return NextResponse.json(rating)
  } catch (error) {
    console.error('Rating GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch rating' }, { status: 500 })
  }
}
