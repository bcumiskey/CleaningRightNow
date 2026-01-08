import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Preset billing items (built-in, not stored in DB)
export const PRESET_BILLING_ITEMS = [
  { id: 'turnover', label: 'Turnover Cleaning', category: 'service' },
  { id: 'deep_clean', label: 'Deep Clean', category: 'service' },
  { id: 'laundry', label: 'Laundry Service', category: 'service' },
  { id: 'supplies', label: 'Cleaning Supplies', category: 'supplies' },
  { id: 'linens', label: 'Linen Replacement', category: 'supplies' },
  { id: 'mileage', label: 'Mileage', category: 'expense' },
  { id: 'emergency', label: 'Emergency/After-Hours', category: 'service' },
  { id: 'misc', label: 'Miscellaneous', category: 'other' },
]

// GET - Fetch all billing items (presets + custom)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch custom items from database
    const customItems = await prisma.customBillingItem.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      presets: PRESET_BILLING_ITEMS,
      custom: customItems.map((item: { id: string; name: string; category: string; defaultAmount: number | null }) => ({
        id: item.id,
        label: item.name,
        category: item.category,
        defaultAmount: item.defaultAmount,
      })),
    })
  } catch (error) {
    console.error('Billing items GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch billing items' }, { status: 500 })
  }
}

// POST - Create a new custom billing item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await request.json()

    if (!data.name || !data.category) {
      return NextResponse.json({ error: 'Name and category are required' }, { status: 400 })
    }

    const item = await prisma.customBillingItem.create({
      data: {
        name: data.name,
        category: data.category,
        defaultAmount: data.defaultAmount ? parseFloat(data.defaultAmount) : null,
      },
    })

    return NextResponse.json({
      id: item.id,
      label: item.name,
      category: item.category,
      defaultAmount: item.defaultAmount,
    })
  } catch (error) {
    console.error('Billing items POST error:', error)
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'An item with this name already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create billing item' }, { status: 500 })
  }
}

// DELETE - Delete a custom billing item
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await prisma.customBillingItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Billing items DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete billing item' }, { status: 500 })
  }
}
