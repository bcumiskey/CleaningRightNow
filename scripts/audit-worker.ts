/**
 * Reconcile one worker's earnings straight against the database.
 *
 *   DATABASE_URL="postgresql://..." npx tsx scripts/audit-worker.ts Jessi 2026
 *   DATABASE_URL="postgresql://..." npx tsx scripts/audit-worker.ts Jessi
 *
 * Same logic as GET /api/admin/worker-audit, but runs locally so it needs no
 * deploy and no admin login. Read-only — it opens a connection, prints, and
 * exits without writing anything.
 *
 * It totals the same assignments four ways so a discrepancy between two screens
 * can be traced to specific jobs instead of guessed at.
 */
import { PrismaClient } from '@prisma/client'
import {
  calculateWorkerShare,
  calculateBaseShare,
  hasEarningsDrift,
} from '../src/lib/earnings'

const prisma = new PrismaClient()

const money = (n: number) =>
  (n < 0 ? '-' : '') + '$' + Math.abs(n).toFixed(2).padStart(1, ' ')

const pad = (s: string | number, w: number) => String(s).padEnd(w)
const padL = (s: string | number, w: number) => String(s).padStart(w)

async function main() {
  const nameArg = process.argv[2]
  const yearArg = process.argv[3]

  if (!nameArg) {
    console.error('Usage: npx tsx scripts/audit-worker.ts <name> [year]')
    process.exit(1)
  }

  const worker = await prisma.teamMember.findFirst({
    where: { name: { contains: nameArg, mode: 'insensitive' } },
    select: { id: true, name: true, isActive: true },
  })

  if (!worker) {
    const all = await prisma.teamMember.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    })
    console.error(`No team member matching "${nameArg}".`)
    console.error('Known members: ' + all.map((m) => m.name).join(', '))
    process.exit(1)
  }

  const dateFilter = yearArg
    ? {
        gte: new Date(`${yearArg}-01-01T00:00:00.000Z`),
        lte: new Date(`${yearArg}-12-31T23:59:59.999Z`),
      }
    : undefined

  const assignments = await prisma.jobAssignment.findMany({
    where: {
      teamMemberId: worker.id,
      job: { completed: true, ...(dateFilter ? { date: dateFilter } : {}) },
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
    return {
      date: job.date.toISOString().split('T')[0],
      property: job.property.name,
      propertyId: job.property.id,
      jobId: job.id,
      rate: job.rate,
      expensePercent: job.expensePercent,
      dogFee: job.dogFee ?? 0,
      payOverride: job.payOverride,
      workerCount,
      stored: a.amountEarned,
      computed: calculateBaseShare(job, workerCount),
      adjustment: a.payAdjustment ?? 0,
      final: calculateWorkerShare(a, job, workerCount),
      // The formula the reports page used before src/lib/earnings.ts existed.
      legacy:
        workerCount > 0
          ? Math.round((job.rate * (1 - job.expensePercent / 100) / workerCount) * 100) / 100
          : 0,
      paid: a.paidAt != null,
      drift: hasEarningsDrift(a, job, workerCount),
    }
  })

  const sum = (pick: (l: (typeof lines)[number]) => number) =>
    Math.round(lines.reduce((acc, l) => acc + pick(l), 0) * 100) / 100

  const totals = {
    final: sum((l) => l.final),
    stored: sum((l) => l.stored ?? 0),
    computed: sum((l) => l.computed),
    legacy: sum((l) => l.legacy),
  }

  const scope = yearArg ? `year ${yearArg}` : 'all time'
  console.log(`\n${worker.name}${worker.isActive ? '' : ' (inactive)'} — ${scope}`)
  console.log(`${lines.length} completed jobs\n`)

  console.log(
    pad('DATE', 12) + pad('PROPERTY', 20) + padL('RATE', 9) + padL('EXP%', 6) +
    padL('DOG', 8) + padL('CREW', 6) + padL('STORED', 10) + padL('CALC', 10) +
    padL('ADJ', 8) + padL('FINAL', 10) + padL('OLD-RPT', 10) + '  FLAGS'
  )
  console.log('-'.repeat(125))

  for (const l of lines) {
    const flags = [
      l.drift ? 'DRIFT' : '',
      l.stored == null ? 'NO-CREDIT' : '',
      l.payOverride != null ? 'OVERRIDE' : '',
      l.paid ? '' : 'UNPAID',
    ].filter(Boolean).join(' ')

    console.log(
      pad(l.date, 12) +
      pad(l.property.slice(0, 19), 20) +
      padL(money(l.rate), 9) +
      padL(l.expensePercent, 6) +
      padL(l.dogFee ? money(l.dogFee) : '-', 8) +
      padL(l.workerCount, 6) +
      padL(l.stored == null ? '-' : money(l.stored), 10) +
      padL(money(l.computed), 10) +
      padL(l.adjustment ? money(l.adjustment) : '-', 8) +
      padL(money(l.final), 10) +
      padL(money(l.legacy), 10) +
      '  ' + flags
    )
  }

  console.log('\n' + '='.repeat(60))
  console.log('SAME JOBS, TOTALLED FOUR WAYS')
  console.log('='.repeat(60))
  console.log(padL(money(totals.final), 14) + '   FINAL — what pay statements and reports now both show')
  console.log(padL(money(totals.stored), 14) + '   stored credits only (amountEarned), no adjustments')
  console.log(padL(money(totals.computed), 14) + '   recalculated fresh from each job today')
  console.log(padL(money(totals.legacy), 14) + '   what the reports page showed BEFORE this fix')

  // Each gap is measured directly rather than by subtracting the headline
  // totals. Rows with no stored credit count as 0 in `totals.stored`, so
  // differencing the totals would blame missing credits on pay adjustments.
  const adjustmentsTotal = sum((l) => l.adjustment)
  const correctionsTotal = Math.round(
    lines
      .filter((l) => l.stored != null)
      .reduce((acc, l) => acc + ((l.stored as number) - l.computed), 0) * 100
  ) / 100
  const fallbackTotal = sum((l) => (l.stored == null ? l.computed : 0))

  console.log('\nWHERE THE TOTAL COMES FROM')
  console.log(padL(money(adjustmentsTotal), 14) + '   pay adjustments (bonuses / dockings)')
  console.log(padL(money(correctionsTotal), 14) + '   stored credits differing from a fresh calculation')
  console.log(padL(money(fallbackTotal), 14) + `   fallback calc for ${lines.filter((l) => l.stored == null).length} job(s) with no stored credit`)
  console.log(
    padL(money(Math.round((totals.legacy - totals.final) * 100) / 100), 14) +
    '   how much the old reports page OVERSTATED by'
  )

  // Same property on the same day more than once — the usual cause of an
  // inflated total, from an import creating alongside an existing job.
  const groups: Record<string, typeof lines> = {}
  for (const l of lines) {
    const key = `${l.date}|${l.propertyId}`
    ;(groups[key] ||= []).push(l)
  }
  const dupes = Object.values(groups).filter((g) => g.length > 1)

  console.log('\nFLAGS')
  console.log(`  duplicate date+property jobs : ${dupes.length}`)
  if (dupes.length) {
    const excess = dupes.reduce(
      (s, g) => s + g.reduce((x, l) => x + l.final, 0) - g[0].final,
      0
    )
    console.log(`  value of those duplicates    : ${money(Math.round(excess * 100) / 100)}`)
    for (const g of dupes) {
      console.log(`    ${g[0].date}  ${g[0].property}  x${g.length}  jobIds=${g.map((l) => l.jobId).join(',')}`)
    }
  }
  console.log(`  credits drifted from calc    : ${lines.filter((l) => l.drift).length}`)
  console.log(`  assignments with no credit   : ${lines.filter((l) => l.stored == null).length}`)
  console.log(`  unpaid                       : ${lines.filter((l) => !l.paid).length}  (${money(sum((l) => (l.paid ? 0 : l.final)))})`)
  console.log()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
