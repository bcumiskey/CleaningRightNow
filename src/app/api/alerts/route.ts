import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface Alert {
  id: string
  type: 'surprise_booking' | 'urgent_job' | 'critical_issue' | 'unpaid_job' | 'new_job_soon' | 'job_modified' | 'job_cancelled'
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  propertyId?: string
  propertyName?: string
  jobId?: string
  date?: Date
  actionUrl?: string
  createdAt: Date
  isRead?: boolean
  isPersisted?: boolean
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const showAll = searchParams.get('all') === 'true'

    const alerts: Alert[] = []
    const now = new Date()

    // Fetch persisted alerts from database (calendar sync alerts)
    const persistedAlerts = await prisma.alert.findMany({
      where: showAll ? {} : { isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    for (const pa of persistedAlerts) {
      alerts.push({
        id: pa.id,
        type: pa.type as Alert['type'],
        severity: pa.type === 'job_cancelled' ? 'critical' : 'warning',
        title: pa.type === 'new_job_soon' ? 'New Booking' : pa.type === 'job_modified' ? 'Schedule Changed' : pa.type === 'job_cancelled' ? 'Cancellation' : pa.message.substring(0, 30),
        description: pa.message,
        propertyId: pa.propertyId || undefined,
        jobId: pa.jobId || undefined,
        actionUrl: '/jobs',
        createdAt: pa.createdAt,
        isRead: pa.isRead,
        isPersisted: true,
      })
    }
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

    // Sort alerts by severity (critical first) then by date
    alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity]
      }
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    // Get unread count for persisted alerts
    const unreadCount = await prisma.alert.count({
      where: { isRead: false },
    })

    return NextResponse.json({
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warnings: alerts.filter(a => a.severity === 'warning').length,
        unreadPersisted: unreadCount,
      },
    })
  } catch (error) {
    console.error('Alerts GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

// PATCH - Mark persisted alerts as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { alertIds, markAllRead } = body

    if (markAllRead) {
      await prisma.alert.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      })
      return NextResponse.json({ success: true, message: 'All alerts marked as read' })
    }

    if (alertIds && Array.isArray(alertIds) && alertIds.length > 0) {
      await prisma.alert.updateMany({
        where: { id: { in: alertIds } },
        data: { isRead: true },
      })
      return NextResponse.json({ success: true, message: `${alertIds.length} alerts marked as read` })
    }

    return NextResponse.json({ error: 'No alert IDs provided' }, { status: 400 })
  } catch (error) {
    console.error('Alerts PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update alerts' }, { status: 500 })
  }
}

// DELETE - Delete old alerts (cleanup)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const daysOld = parseInt(searchParams.get('daysOld') || '30', 10)

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const result = await prisma.alert.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    })

    return NextResponse.json({ success: true, deleted: result.count })
  } catch (error) {
    console.error('Alerts DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete alerts' }, { status: 500 })
  }
}
