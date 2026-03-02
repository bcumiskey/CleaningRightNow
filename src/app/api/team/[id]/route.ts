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

    const teamMember = await prisma.teamMember.findUnique({
      where: { id },
    })

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    // Type the team member with optional new fields
    const member = teamMember as typeof teamMember & {
      rank?: number
      canSupervise?: boolean
      avgRating?: number | null
      totalRatings?: number
      reliabilityScore?: number | null
      status?: string
      lameDuckAt?: Date | null
      finalPayAt?: Date | null
    }

    return NextResponse.json({
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
      // Lame Duck fields
      status: member.status ?? 'ACTIVE',
      lameDuckAt: member.lameDuckAt ?? null,
      finalPayAt: member.finalPayAt ?? null,
    })
  } catch (error) {
    console.error('Team member GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch team member' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update team members
    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const data = await request.json()

    // Check for duplicate email if email is provided and changed
    if (data.email) {
      const existing = await prisma.teamMember.findFirst({
        where: {
          email: data.email,
          NOT: { id: id },
        },
      })
      if (existing) {
        return NextResponse.json({ error: 'A team member with this email already exists' }, { status: 400 })
      }
    }

    // Build update data - only include fields that were provided
    const updateData: Record<string, unknown> = {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      role: data.role,
      isActive: data.isActive ?? true,
    }

    // Include supervisor fields if provided
    if (data.rank !== undefined) {
      updateData.rank = parseInt(data.rank) || 50
    }
    if (data.canSupervise !== undefined) {
      updateData.canSupervise = Boolean(data.canSupervise)
    }

    const teamMember = await prisma.teamMember.update({
      where: { id },
      data: updateData,
    })

    // Type the team member with optional new fields
    const member = teamMember as typeof teamMember & {
      rank?: number
      canSupervise?: boolean
      avgRating?: number | null
      totalRatings?: number
      reliabilityScore?: number | null
      status?: string
      lameDuckAt?: Date | null
      finalPayAt?: Date | null
    }

    return NextResponse.json({
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      isActive: member.isActive,
      hasPassword: !!member.password,
      rank: member.rank ?? 50,
      canSupervise: member.canSupervise ?? false,
      avgRating: member.avgRating ?? null,
      totalRatings: member.totalRatings ?? 0,
      reliabilityScore: member.reliabilityScore ?? null,
      // Lame Duck fields
      status: member.status ?? 'ACTIVE',
      lameDuckAt: member.lameDuckAt ?? null,
      finalPayAt: member.finalPayAt ?? null,
    })
  } catch (error) {
    console.error('Team member PUT error:', error)
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 })
  }
}

export async function DELETE(
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

    // Soft delete - just mark as inactive
    await prisma.teamMember.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Team member DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete team member' }, { status: 500 })
  }
}
