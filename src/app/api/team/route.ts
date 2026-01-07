import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teamMembers = await prisma.teamMember.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })

    // Add hasPassword indicator without exposing password
    const membersWithPasswordStatus = teamMembers.map((member: { id: string; name: string; email: string | null; phone: string | null; role: string; isActive: boolean; password: string | null }) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      isActive: member.isActive,
      hasPassword: !!member.password,
    }))

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
      return NextResponse.json({ error: 'Only administrators can add team members' }, { status: 403 })
    }

    const data = await request.json()

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
    return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 })
  }
}
