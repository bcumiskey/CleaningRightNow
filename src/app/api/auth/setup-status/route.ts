import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Public endpoint to check if initial setup is needed
export async function GET() {
  try {
    const adminCount = await prisma.user.count({
      where: { role: 'admin' },
    })

    return NextResponse.json({
      hasAdmin: adminCount > 0,
      setupRequired: adminCount === 0,
    })
  } catch (error) {
    console.error('Setup status check error:', error)
    return NextResponse.json({ hasAdmin: false, setupRequired: true })
  }
}
