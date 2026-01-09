import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

// POST - Process a check-in (NFC/QR scan)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, teamMemberId, method, location } = body

    if (!token || !teamMemberId) {
      return NextResponse.json(
        { error: 'Token and team member ID are required' },
        { status: 400 }
      )
    }

    // Verify the token exists and is active
    const checkInToken = await prisma.propertyCheckInToken.findUnique({
      where: { token },
    })

    if (!checkInToken) {
      return NextResponse.json(
        { error: 'Invalid check-in token', code: 'INVALID_TOKEN' },
        { status: 404 }
      )
    }

    if (!checkInToken.isActive) {
      return NextResponse.json(
        { error: 'This check-in token is no longer active', code: 'TOKEN_INACTIVE' },
        { status: 400 }
      )
    }

    if (checkInToken.expiresAt && new Date() > checkInToken.expiresAt) {
      return NextResponse.json(
        { error: 'This check-in token has expired', code: 'TOKEN_EXPIRED' },
        { status: 400 }
      )
    }

    // Verify team member exists
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
      select: { id: true, name: true, rank: true, canSupervise: true },
    })

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found', code: 'INVALID_MEMBER' },
        { status: 404 }
      )
    }

    // Find today's job at this property that this team member is assigned to
    const today = new Date()
    const job = await prisma.job.findFirst({
      where: {
        propertyId: checkInToken.propertyId,
        date: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
        assignments: {
          some: { teamMemberId },
        },
      },
      include: {
        property: { select: { id: true, name: true, address: true } },
        assignments: {
          include: {
            teamMember: { select: { id: true, name: true, rank: true, canSupervise: true } },
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json(
        {
          error: 'No job scheduled for today at this property',
          code: 'NO_JOB_TODAY',
          propertyId: checkInToken.propertyId,
        },
        { status: 404 }
      )
    }

    // Check if already checked in
    const existingSession = await prisma.jobSession.findUnique({
      where: {
        jobId_teamMemberId: {
          jobId: job.id,
          teamMemberId,
        },
      },
    })

    if (existingSession?.checkedInAt) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        session: existingSession,
        job: {
          id: job.id,
          date: job.date,
          time: job.time,
          property: job.property,
        },
      })
    }

    // Determine supervisor (highest ranked member who has checked in or is checking in now)
    const allSessions = await prisma.jobSession.findMany({
      where: { jobId: job.id, checkedInAt: { not: null } },
      include: { teamMember: { select: { id: true, rank: true, canSupervise: true } } },
    })

    // Include current team member in ranking consideration
    const checkedInMembers = [
      ...allSessions.map((s: { teamMember: { id: string; rank: number | null; canSupervise: boolean | null } }) => s.teamMember),
      teamMember,
    ]

    // Supervisor is the highest ranked member who can supervise (or just highest ranked)
    const supervisor = checkedInMembers
      .filter(m => m.canSupervise)
      .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))[0] ||
      checkedInMembers.sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))[0]

    // Create or update the job session
    const session = await prisma.jobSession.upsert({
      where: {
        jobId_teamMemberId: {
          jobId: job.id,
          teamMemberId,
        },
      },
      create: {
        jobId: job.id,
        teamMemberId,
        checkedInAt: new Date(),
        checkInMethod: method || 'nfc',
        checkInLocation: location || null,
        status: 'checked_in',
        supervisorId: supervisor?.id || teamMemberId,
      },
      update: {
        checkedInAt: new Date(),
        checkInMethod: method || 'nfc',
        checkInLocation: location || null,
        status: 'checked_in',
        isAbsent: false,
        absentReason: null,
      },
    })

    // Update token last used timestamp
    await prisma.propertyCheckInToken.update({
      where: { id: checkInToken.id },
      data: { lastUsedAt: new Date() },
    })

    // Get team assignments for this job
    interface JobAssignment {
      teamMember: {
        id: string
        name: string
        rank: number | null
        canSupervise: boolean | null
      }
    }
    const teamAssignments = job.assignments.map((a: JobAssignment) => ({
      id: a.teamMember.id,
      name: a.teamMember.name,
      rank: a.teamMember.rank,
      canSupervise: a.teamMember.canSupervise,
    }))

    return NextResponse.json({
      success: true,
      session,
      job: {
        id: job.id,
        date: job.date,
        time: job.time,
        property: job.property,
        team: teamAssignments,
      },
      isSupervisor: supervisor?.id === teamMemberId,
      supervisor: supervisor ? { id: supervisor.id, name: teamMember.name } : null,
    })
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json({ error: 'Check-in failed' }, { status: 500 })
  }
}
