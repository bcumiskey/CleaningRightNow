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

    // Get or create default settings
    let settings = await prisma.companySettings.findUnique({
      where: { id: 'default' },
    })

    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          id: 'default',
          companyName: 'Cleaning Right Now',
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update settings
    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await request.json()

    const settings = await prisma.companySettings.upsert({
      where: { id: 'default' },
      update: {
        companyName: data.companyName,
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        logoUrl: data.logoUrl,
        invoiceFooter: data.invoiceFooter,
        invoiceTerms: data.invoiceTerms,
      },
      create: {
        id: 'default',
        companyName: data.companyName || 'Cleaning Right Now',
        address: data.address,
        phone: data.phone,
        email: data.email,
        website: data.website,
        logoUrl: data.logoUrl,
        invoiceFooter: data.invoiceFooter,
        invoiceTerms: data.invoiceTerms,
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
