import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/admin/fix-property-names
// Strips 🧹, "Clean", and extra whitespace from property names.

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const properties = await prisma.property.findMany({
      where: {
        OR: [
          { name: { contains: '🧹' } },
          { name: { startsWith: 'Clean' } },
        ],
      },
      select: { id: true, name: true },
    })

    const renamed: { oldName: string; newName: string }[] = []

    for (const prop of properties) {
      const cleaned = prop.name
        .replace(/🧹/g, '')
        .replace(/^Clean\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim()

      if (cleaned !== prop.name && cleaned.length > 0) {
        await prisma.property.update({
          where: { id: prop.id },
          data: { name: cleaned },
        })
        renamed.push({ oldName: prop.name, newName: cleaned })
      }
    }

    return NextResponse.json({
      success: true,
      count: renamed.length,
      renamed,
    })
  } catch (error) {
    console.error('Fix property names error:', error)
    return NextResponse.json(
      { error: 'Failed to fix property names', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
