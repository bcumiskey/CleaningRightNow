import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const teamMembers = await prisma.teamMember.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    })

    // Add hasPassword indicator without exposing password
    interface TeamMemberFromDb {
      id: string
      name: string
      email: string | null
      phone: string | null
      role: string
      isActive: boolean
      password: string | null
      rank?: number
      canSupervise?: boolean
      avgRating?: number | null
      totalRatings?: number
      reliabilityScore?: number | null
    }

    // Calculate YTD earnings for each team member
    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)

    // Get all paid assignments for this year grouped by team member
    const ytdEarnings = await prisma.jobAssignment.groupBy({
      by: ['teamMemberId'],
      where: {
        paidAt: {
          gte: yearStart,
          lte: now,
        },
        job: {
          completed: true,
        },
      },
      _count: {
        id: true,
      },
    })

    // Get job details to calculate actual earnings
    const assignmentsWithJobs = await prisma.jobAssignment.findMany({
      where: {
        paidAt: {
          gte: yearStart,
          lte: now,
        },
        job: {
          completed: true,
        },
      },
      include: {
        job: {
          select: {
            rate: true,
            expensePercent: true,
            assignments: {
              select: { id: true },
            },
          },
        },
      },
    })

    // Calculate earnings per team member
    const earningsMap = new Map<string, { ytdEarnings: number; ytdJobs: number }>()
    for (const assignment of assignmentsWithJobs) {
      const teamMemberId = assignment.teamMemberId
      const job = assignment.job
      const assignmentCount = job.assignments.length
      const teamTotal = job.rate * (1 - (job.expensePercent / 100))
      const perPerson = assignmentCount > 0 ? teamTotal / assignmentCount : 0

      const current = earningsMap.get(teamMemberId) || { ytdEarnings: 0, ytdJobs: 0 }
      earningsMap.set(teamMemberId, {
        ytdEarnings: current.ytdEarnings + perPerson,
        ytdJobs: current.ytdJobs + 1,
      })
    }

    const membersWithPasswordStatus = teamMembers.map((member: TeamMemberFromDb) => {
      const earnings = earningsMap.get(member.id) || { ytdEarnings: 0, ytdJobs: 0 }
      return {
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        role: member.role,
        isActive: member.isActive,
        hasPassword: !!member.password,
        // Supervisor fields
        rank: member.rank ?? 50,
        canSupervise: member.canSupervise ?? false,
        // Performance metrics
        avgRating: member.avgRating ?? null,
        totalRatings: member.totalRatings ?? 0,
        reliabilityScore: member.reliabilityScore ?? null,
        // YTD earnings
        ytdEarnings: earnings.ytdEarnings,
        ytdJobs: earnings.ytdJobs,
      }
    })

    return NextResponse.json(membersWithPasswordStatus)
  } catch (error) {
    console.error('Team GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can create team members
    const userRole = (session.user as { role?: string })?.role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: `Only administrators can add team members. Your role: ${userRole || 'none'}` }, { status: 403 })
    }

    const data = await request.json()

    // Check for duplicate email if email is provided
    if (data.email) {
      const existing = await prisma.teamMember.findUnique({
        where: { email: data.email },
      })
      if (existing) {
        if (!existing.isActive) {
          return NextResponse.json({
            error: `An inactive team member "${existing.name}" already has this email. You can reactivate them from the team management page.`,
            existingMemberId: existing.id,
            canReactivate: true
          }, { status: 400 })
        }
        return NextResponse.json({ error: 'A team member with this email already exists' }, { status: 400 })
      }
    }

    // Create team member with basic fields only
    // New fields (rank, canSupervise) require DB migration to work
    const teamMember = await prisma.teamMember.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        role: data.role || 'worker',
      },
    })

    return NextResponse.json(teamMember)
  } catch (error) {
    console.error('Team POST error:', error)
    const message = error instanceof Error ? error.message : 'Failed to create team member'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
