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

    return NextResponse.json({
      id: teamMember.id,
      name: teamMember.name,
      email: teamMember.email,
      phone: teamMember.phone,
      role: teamMember.role,
      isActive: teamMember.isActive,
      hasPassword: !!teamMember.password,
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

    const { id } = await params
    const data = await request.json()

    const teamMember = await prisma.teamMember.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        role: data.role,
        isActive: data.isActive ?? true,
      },
    })

    return NextResponse.json({
      id: teamMember.id,
      name: teamMember.name,
      email: teamMember.email,
      phone: teamMember.phone,
      role: teamMember.role,
      isActive: teamMember.isActive,
      hasPassword: !!teamMember.password,
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
