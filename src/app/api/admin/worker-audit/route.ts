import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { calculateWorkerShare, calculateBaseShare, hasEarningsDrift } from '@/lib/earnings'

/**
 * GET /api/admin/worker-audit?name=Jessi&year=2026
 * GET /api/admin/worker-audit?workerId=<id>&start=2026-01-01&end=2026-12-31
 *
 * Line-by-line reconciliation of one worker's earnings, built to answer
 * "why does this screen say one number and that screen say another?".
 *
 * It reports the same set of assignments totalled four different ways —
 * including the old reports-page formula — so the gap between any two surfaces
 * can be traced to specific jobs rather than guessed at. It reads only; nothing
 * here changes a stored figure.
 */
export async function GET(request: NextRequest) {
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
    const workerId = searchParams.get('workerId')
    const name = searchParams.get('name')
    const year = searchParams.get('year')
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!workerId && !name) {
      return NextResponse.json(
        { error: 'Provide either workerId or name' },
        { status: 400 }
      )
    }

    // Resolve the worker
    const worker = workerId
      ? await prisma.teamMember.findUnique({
          where: { id: workerId },
          select: { id: true, name: true, isActive: true },
        })
      : await prisma.teamMember.findFirst({
          where: { name: { contains: name as string, mode: 'insensitive' } },
          select: { id: true, name: true, isActive: true },
        })

    if (!worker) {
      const candidates = await prisma.teamMember.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json(
        { error: 'Worker not found', candidates },
        { status: 404 }
      )
    }

    // Date window — defaults to all time so nothing is hidden by a range filter
    let dateFilter: { gte?: Date; lte?: Date } | undefined
    if (year) {
      dateFilter = {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lte: new Date(`${year}-12-31T23:59:59.999Z`),
      }
    } else if (start || end) {
      dateFilter = {}
      if (start) dateFilter.gte = new Date(start)
      if (end) dateFilter.lte = new Date(end)
    }

    const assignments = await prisma.jobAssignment.findMany({
      where: {
        teamMemberId: worker.id,
        job: {
          completed: true,
          ...(dateFilter ? { date: dateFilter } : {}),
        },
      },
      include: {
        job: {
          include: {
            property: { select: { id: true, name: true } },
            assignments: { select: { id: true } },
          },
        },
      },
      orderBy: { job: { date: 'asc' } },
    })

    const lines = assignments.map((a) => {
      const job = a.job
      const workerCount = job.assignments.length
      const computedBase = calculateBaseShare(job, workerCount)

      // The formula the reports page used before it shared src/lib/earnings.ts:
      // raw rate only, no dog fee, no override, no stored credit, no adjustment.
      const legacyReportsShare = workerCount > 0
        ? Math.round((job.rate * (1 - job.expensePercent / 100) / workerCount) * 100) / 100
        : 0

      return {
        assignmentId: a.id,
        jobId: job.id,
        date: job.date.toISOString().split('T')[0],
        property: job.property.name,
        propertyId: job.property.id,
        rate: job.rate,
        expensePercent: job.expensePercent,
        dogFee: job.dogFee ?? 0,
        payOverride: job.payOverride,
        workerCount,
        storedAmountEarned: a.amountEarned,
        computedBase,
        payAdjustment: a.payAdjustment ?? 0,
        adjustNote: a.adjustNote,
        finalShare: calculateWorkerShare(a, job, workerCount),
        legacyReportsShare,
        paid: a.paidAt != null,
        paidAt: a.paidAt,
        // Stored credit disagrees with a fresh calculation. Could be a deliberate
        // correction or a stale value — flagged for review, never auto-changed.
        hasDrift: hasEarningsDrift(a, job, workerCount),
        // No credit was ever written; the figure shown is a fallback calculation.
        missingStoredAmount: a.amountEarned == null,
      }
    })

    const sum = (pick: (l: (typeof lines)[number]) => number) =>
      Math.round(lines.reduce((acc, l) => acc + pick(l), 0) * 100) / 100

    // Same jobs, four totals. Comparing these localises a discrepancy fast.
    const totals = {
      // What the pay statements and reports now agree on.
      finalTotal: sum((l) => l.finalShare),
      // Stored credits only, ignoring adjustments.
      storedTotal: sum((l) => l.storedAmountEarned ?? 0),
      // Fresh calculation from each job's current numbers.
      computedTotal: sum((l) => l.computedBase),
      // What the reports page reported before this fix.
      legacyReportsTotal: sum((l) => l.legacyReportsShare),
    }

    // Same property on the same day more than once — the usual cause of an
    // inflated total, from an import or correction run creating alongside an
    // existing job rather than updating it.
    const byDateProperty: Record<string, typeof lines> = {}
    for (const l of lines) {
      const key = `${l.date}|${l.propertyId}`
      if (!byDateProperty[key]) byDateProperty[key] = []
      byDateProperty[key].push(l)
    }
    const duplicates = Object.entries(byDateProperty)
      .filter(([, group]) => group.length > 1)
      .map(([key, group]) => ({
        date: key.split('|')[0],
        property: group[0].property,
        count: group.length,
        jobIds: group.map((g) => g.jobId),
        totalCredited: Math.round(group.reduce((s, g) => s + g.finalShare, 0) * 100) / 100,
        // What the total would be if only one of these were real.
        excessIfDuplicate:
          Math.round(
            (group.reduce((s, g) => s + g.finalShare, 0) - group[0].finalShare) * 100
          ) / 100,
      }))

    const driftRows = lines.filter((l) => l.hasDrift)
    const missingRows = lines.filter((l) => l.missingStoredAmount)

    return NextResponse.json({
      worker,
      range: dateFilter
        ? { start: dateFilter.gte ?? null, end: dateFilter.lte ?? null }
        : 'all time',
      jobCount: lines.length,
      totals,
      // Gaps between the four totals above, so the size of each cause is explicit.
      variances: {
        adjustmentsApplied: Math.round((totals.finalTotal - totals.storedTotal) * 100) / 100,
        storedVsComputed: Math.round((totals.storedTotal - totals.computedTotal) * 100) / 100,
        legacyReportsOverstatement:
          Math.round((totals.legacyReportsTotal - totals.finalTotal) * 100) / 100,
      },
      flags: {
        duplicateJobCount: duplicates.length,
        duplicateExcess:
          Math.round(duplicates.reduce((s, d) => s + d.excessIfDuplicate, 0) * 100) / 100,
        driftRowCount: driftRows.length,
        missingStoredAmountCount: missingRows.length,
        unpaidCount: lines.filter((l) => !l.paid).length,
        unpaidTotal: sum((l) => (l.paid ? 0 : l.finalShare)),
      },
      duplicates,
      driftRows,
      lines,
    })
  } catch (error) {
    console.error('Worker audit error:', error)
    return NextResponse.json(
      {
        error: 'Failed to audit worker earnings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
