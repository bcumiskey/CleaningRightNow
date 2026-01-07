import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, addDays, startOfWeek, endOfWeek } from 'date-fns'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const startOfToday = startOfDay(today)
    const endOfToday = endOfDay(today)
    const startOfThisMonth = startOfMonth(today)
    const endOfThisMonth = endOfMonth(today)
    const startOfThisWeek = startOfWeek(today)
    const endOfThisWeek = endOfWeek(today)
    const nextWeek = addDays(today, 7)

    // Get today's jobs
    const todayJobs = await prisma.job.findMany({
      where: {
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            calendarSource: true,
          },
        },
        assignments: {
          include: {
            teamMember: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: [
        { time: 'asc' },
        { property: { name: 'asc' } },
      ],
    })

    // Get upcoming jobs (next 7 days)
    const upcomingJobs = await prisma.job.findMany({
      where: {
        date: {
          gt: endOfToday,
          lte: nextWeek,
        },
        completed: false,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            calendarSource: true,
          },
        },
        assignments: {
          include: {
            teamMember: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
      take: 10,
    })

    // Calculate monthly revenue (completed jobs this month)
    const completedJobsThisMonth = await prisma.job.findMany({
      where: {
        completed: true,
        completedAt: {
          gte: startOfThisMonth,
          lte: endOfThisMonth,
        },
      },
    })

    const monthlyRevenue = completedJobsThisMonth.reduce(
      (sum: number, job: { rate: number }) => sum + job.rate,
      0
    )

    const monthlyExpenses = completedJobsThisMonth.reduce(
      (sum: number, job: { rate: number; expensePercent: number }) => sum + (job.rate * job.expensePercent / 100),
      0
    )

    // Pending from clients (sent invoices unpaid)
    const pendingFromClients = await prisma.invoice.aggregate({
      where: {
        status: 'sent',
      },
      _sum: {
        total: true,
      },
    })

    // Owed to team (completed but team not paid)
    const owedToTeam = await prisma.jobAssignment.aggregate({
      where: {
        job: {
          completed: true,
          teamPaid: false,
        },
      },
      _sum: {
        amountEarned: true,
      },
    })

    // Draft invoices count
    const draftInvoicesCount = await prisma.invoice.count({
      where: {
        status: 'draft',
      },
    })

    // Low stock items (items below 2x target)
    const allProperties = await prisma.property.findMany({
      include: {
        linenRequirements: true,
        linenInventory: true,
      },
    })

    let lowStockCount = 0
    for (const property of allProperties) {
      for (const requirement of property.linenRequirements) {
        const target = requirement.perFlip * 2
        const inventory = property.linenInventory.find(
          (inv: { linenItemId: string; onHand: number }) => inv.linenItemId === requirement.linenItemId
        )
        const onHand = inventory?.onHand || 0
        if (onHand < target) {
          lowStockCount++
        }
      }
    }

    // Active notes grouped by property
    const activeNotes = await prisma.propertyNote.findMany({
      where: {
        status: 'active',
      },
      include: {
        property: {
          select: { id: true, name: true },
        },
        addedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Group notes by property
    type NotesByPropertyAcc = Record<string, { property: { id: string; name: string }; notes: typeof activeNotes }>
    const notesByProperty = activeNotes.reduce((acc: NotesByPropertyAcc, note: (typeof activeNotes)[number]) => {
      const key = note.property.id
      if (!acc[key]) {
        acc[key] = {
          property: note.property,
          notes: [],
        }
      }
      acc[key].notes.push(note)
      return acc
    }, {} as NotesByPropertyAcc)

    // Team balances
    const teamMembers = await prisma.teamMember.findMany({
      where: { isActive: true },
      include: {
        jobAssignments: {
          where: {
            job: {
              completed: true,
              teamPaid: false,
            },
          },
          select: {
            amountEarned: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const teamBalances = teamMembers.map((member: (typeof teamMembers)[number]) => ({
      id: member.id,
      name: member.name,
      owed: member.jobAssignments.reduce(
        (sum: number, a: { amountEarned: number | null }) => sum + (a.amountEarned || 0),
        0
      ),
    })).filter((m: { id: string; name: string; owed: number }) => m.owed > 0)

    // Notes resolved this week
    const notesResolvedThisWeek = await prisma.propertyNote.count({
      where: {
        status: 'resolved',
        resolvedAt: {
          gte: startOfThisWeek,
          lte: endOfThisWeek,
        },
      },
    })

    return NextResponse.json({
      todayJobs,
      upcomingJobs,
      metrics: {
        monthlyRevenue,
        monthlyExpenses,
        pendingFromClients: pendingFromClients._sum.total || 0,
        owedToTeam: owedToTeam._sum.amountEarned || 0,
        draftInvoicesCount,
        lowStockCount,
        todayJobsCount: todayJobs.length,
        upcomingJobsCount: upcomingJobs.length,
        completedJobsThisMonth: completedJobsThisMonth.length,
        activeNotesCount: activeNotes.length,
        notesResolvedThisWeek,
      },
      propertyAlerts: Object.values(notesByProperty),
      teamBalances,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
