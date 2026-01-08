import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface Alert {
  id: string
  type: 'surprise_booking' | 'urgent_job' | 'low_inventory' | 'critical_issue' | 'unpaid_job'
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  propertyId?: string
  propertyName?: string
  jobId?: string
  date?: Date
  actionUrl?: string
  createdAt: Date
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const alerts: Alert[] = []
    const now = new Date()
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    // 1. SURPRISE BOOKINGS - Jobs created within 2 days of their date
    const recentJobs = await prisma.job.findMany({
      where: {
        date: {
          gte: todayStart,
          lte: twoDaysFromNow,
        },
        createdAt: {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Created in last 24 hours
        },
      },
      include: {
        property: { select: { id: true, name: true } },
        assignments: { include: { teamMember: { select: { name: true } } } },
      },
      orderBy: { date: 'asc' },
    })

    for (const job of recentJobs) {
      const timeDiff = job.date.getTime() - job.createdAt.getTime()
      const daysNotice = Math.floor(timeDiff / (24 * 60 * 60 * 1000))

      if (daysNotice <= 2) {
        const isToday = job.date >= todayStart && job.date < todayEnd
        const isTomorrow = job.date >= todayEnd && job.date < oneDayFromNow

        alerts.push({
          id: `surprise-${job.id}`,
          type: 'surprise_booking',
          severity: isToday ? 'critical' : 'warning',
          title: isToday ? 'Same-Day Booking!' : isTomorrow ? 'Tomorrow Booking!' : 'Short Notice Booking',
          description: `${job.property.name} - ${isToday ? 'TODAY' : isTomorrow ? 'TOMORROW' : `${daysNotice} day notice`}${job.time ? ` at ${job.time}` : ''}`,
          propertyId: job.property.id,
          propertyName: job.property.name,
          jobId: job.id,
          date: job.date,
          actionUrl: '/jobs',
          createdAt: job.createdAt,
        })
      }
    }

    // 2. URGENT JOBS - Jobs in next 2 days without team assigned
    const upcomingUnassigned = await prisma.job.findMany({
      where: {
        date: {
          gte: todayStart,
          lte: twoDaysFromNow,
        },
        completed: false,
        assignments: {
          none: {},
        },
      },
      include: {
        property: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    })

    for (const job of upcomingUnassigned) {
      const isToday = job.date >= todayStart && job.date < todayEnd

      alerts.push({
        id: `unassigned-${job.id}`,
        type: 'urgent_job',
        severity: isToday ? 'critical' : 'warning',
        title: isToday ? 'Unassigned Job TODAY!' : 'Unassigned Job Soon',
        description: `${job.property.name} needs team assignment${job.time ? ` - ${job.time}` : ''}`,
        propertyId: job.property.id,
        propertyName: job.property.name,
        jobId: job.id,
        date: job.date,
        actionUrl: '/jobs',
        createdAt: now,
      })
    }

    // 3. CRITICAL PROPERTY ISSUES - High severity notes that are active
    const criticalNotes = await prisma.propertyNote.findMany({
      where: {
        status: 'active',
        severity: 'high',
      },
      include: {
        property: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    for (const note of criticalNotes) {
      alerts.push({
        id: `issue-${note.id}`,
        type: 'critical_issue',
        severity: 'critical',
        title: note.title || 'Critical Issue',
        description: `${note.property.name}: ${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}`,
        propertyId: note.property.id,
        propertyName: note.property.name,
        actionUrl: '/notes',
        createdAt: note.createdAt,
      })
    }

    // 4. UNPAID COMPLETED JOBS - Jobs completed 7+ days ago but not paid
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const unpaidJobs = await prisma.job.findMany({
      where: {
        completed: true,
        completedAt: {
          lte: sevenDaysAgo,
        },
        OR: [
          { clientPaid: false },
          { teamPaid: false },
        ],
      },
      include: {
        property: { select: { id: true, name: true } },
      },
      orderBy: { completedAt: 'asc' },
      take: 10, // Limit to avoid too many alerts
    })

    for (const job of unpaidJobs) {
      const unpaidParts = []
      if (!job.clientPaid) unpaidParts.push('client')
      if (!job.teamPaid) unpaidParts.push('team')

      alerts.push({
        id: `unpaid-${job.id}`,
        type: 'unpaid_job',
        severity: 'warning',
        title: 'Unpaid Job',
        description: `${job.property.name} - ${unpaidParts.join(' & ')} unpaid (completed ${Math.floor((now.getTime() - (job.completedAt?.getTime() || 0)) / (24 * 60 * 60 * 1000))} days ago)`,
        propertyId: job.property.id,
        propertyName: job.property.name,
        jobId: job.id,
        actionUrl: '/jobs',
        createdAt: job.completedAt || now,
      })
    }

    // 5. LOW INVENTORY - Check property linen inventory vs requirements
    // Get all properties with their linen requirements and current inventory
    const properties = await prisma.property.findMany({
      include: {
        linenRequirements: {
          include: {
            linenItem: { select: { name: true, code: true } },
          },
        },
        linenInventory: {
          include: {
            linenItem: { select: { name: true, code: true } },
          },
        },
      },
    })

    for (const property of properties) {
      for (const req of property.linenRequirements) {
        if (req.perFlip > 0) {
          const inventory = property.linenInventory.find(
            (inv: { linenItemId: string }) => inv.linenItemId === req.linenItemId
          )
          const onHand = inventory?.onHand || 0
          const neededForThreeFlips = req.perFlip * 3 // Alert if less than 3 flips worth

          if (onHand < neededForThreeFlips && onHand < req.perFlip * 5) {
            const flipsRemaining = Math.floor(onHand / req.perFlip)

            alerts.push({
              id: `inventory-${property.id}-${req.linenItemId}`,
              type: 'low_inventory',
              severity: flipsRemaining <= 1 ? 'critical' : 'warning',
              title: 'Low Linen Stock',
              description: `${property.name}: ${req.linenItem.name} - only ${onHand} left (${flipsRemaining} flips)`,
              propertyId: property.id,
              propertyName: property.name,
              actionUrl: '/linens',
              createdAt: now,
            })
          }
        }
      }
    }

    // Sort alerts by severity (critical first) then by date
    alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity]
      }
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    return NextResponse.json({
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warnings: alerts.filter(a => a.severity === 'warning').length,
      },
    })
  } catch (error) {
    console.error('Alerts GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}
