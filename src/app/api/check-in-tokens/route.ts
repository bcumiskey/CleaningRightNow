import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { randomBytes } from 'crypto'

// Generate a secure random token that's hard to guess or memorize
function generateSecureToken(): string {
  // 32 bytes = 256 bits of randomness, encoded as base64url (no padding)
  // This creates tokens like "Xk9f-Q2r_m8L4nP5vZ1bC3dE6gH7jK8l"
  return randomBytes(32).toString('base64url')
}

// GET - List all check-in tokens (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')

    const where = propertyId ? { propertyId } : {}

    const tokens = await prisma.propertyCheckInToken.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Get property names
    const propertyIds = [...new Set(tokens.map(t => t.propertyId))]
    const properties = await prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: { id: true, name: true },
    })
    const propertyMap = Object.fromEntries(properties.map(p => [p.id, p.name]))

    const tokensWithNames = tokens.map(token => ({
      ...token,
      propertyName: propertyMap[token.propertyId] || 'Unknown',
    }))

    return NextResponse.json(tokensWithNames)
  } catch (error) {
    console.error('Check-in tokens GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 })
  }
}

// POST - Create a new check-in token for a property
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { propertyId, expiresAt } = body

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Verify property exists
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, name: true },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Generate a unique secure token
    const token = generateSecureToken()

    const checkInToken = await prisma.propertyCheckInToken.create({
      data: {
        propertyId,
        token,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    return NextResponse.json({
      ...checkInToken,
      propertyName: property.name,
    })
  } catch (error) {
    console.error('Check-in token POST error:', error)
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
  }
}
