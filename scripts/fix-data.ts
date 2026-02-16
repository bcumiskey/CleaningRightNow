/**
 * Data Fix Script for CRN CleaningRightNow
 *
 * Fixes two production data issues:
 *
 * A) Midnight UTC dates → Noon UTC
 *    Jobs created by calendar sync stored dates at midnight UTC (00:00:00),
 *    which shifts to the previous day in EST/EDT (UTC-5/4).
 *    Fix: Update all midnight-UTC jobs to noon UTC (12:00:00).
 *
 * B) Backfill amountEarned for completed jobs
 *    All JobAssignment.amountEarned values are NULL because
 *    calculateJobPayments() was never called. Fix: Calculate and
 *    populate for all completed jobs with assignments.
 *
 * Usage:
 *   npx tsx scripts/fix-data.ts              # DRY RUN (read-only, shows what would change)
 *   npx tsx scripts/fix-data.ts --apply      # APPLY changes to production
 *   npx tsx scripts/fix-data.ts --rollback   # ROLLBACK using saved snapshot
 *
 * Safety:
 *   - Always runs in DRY RUN mode by default
 *   - Saves a JSON snapshot before applying changes (for rollback)
 *   - Rollback restores original values from the snapshot
 */

import * as fs from 'fs'
import * as path from 'path'

// Load .env file manually (no dotenv dependency needed)
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const mode = process.argv[2] || '--dry-run'

// ─── Utility: same calculation as src/lib/utils.ts ───
function calculateJobPayments(rate: number, expensePercent: number, assignmentCount: number) {
  const expenseAmount = Math.round(rate * (expensePercent / 100) * 100) / 100
  const teamTotal = Math.round((rate - expenseAmount) * 100) / 100
  const perPerson = assignmentCount > 0 ? Math.round((teamTotal / assignmentCount) * 100) / 100 : 0
  return { expense: expenseAmount, teamTotal, perPerson }
}

// ─── Fix A: Midnight UTC → Noon UTC ───
async function fixMidnightDates(apply: boolean) {
  console.log('\n══════════════════════════════════════════════════')
  console.log('  FIX A: Midnight UTC Dates → Noon UTC')
  console.log('══════════════════════════════════════════════════\n')

  // Find all jobs stored at midnight UTC
  const allJobs = await prisma.job.findMany({
    select: { id: true, date: true },
    orderBy: { date: 'asc' },
  })

  const midnightJobs = allJobs.filter(j => {
    const hours = j.date.getUTCHours()
    const mins = j.date.getUTCMinutes()
    const secs = j.date.getUTCSeconds()
    return hours === 0 && mins === 0 && secs === 0
  })

  console.log(`  Total jobs: ${allJobs.length}`)
  console.log(`  Jobs at midnight UTC: ${midnightJobs.length}`)
  console.log(`  Jobs already at noon: ${allJobs.length - midnightJobs.length}`)

  if (midnightJobs.length === 0) {
    console.log('\n  ✅ No midnight dates to fix.')
    return { snapshot: [], count: 0 }
  }

  // Show sample
  console.log('\n  Sample (first 5):')
  for (const job of midnightJobs.slice(0, 5)) {
    const corrected = new Date(job.date)
    corrected.setUTCHours(12, 0, 0, 0)
    console.log(`    ${job.id}: ${job.date.toISOString()} → ${corrected.toISOString()}`)
  }

  // Save snapshot for rollback
  const snapshot = midnightJobs.map(j => ({
    id: j.id,
    originalDate: j.date.toISOString(),
  }))

  if (apply) {
    console.log(`\n  🔧 Applying fix to ${midnightJobs.length} jobs...`)
    let updated = 0
    for (const job of midnightJobs) {
      const newDate = new Date(job.date)
      newDate.setUTCHours(12, 0, 0, 0)
      await prisma.job.update({
        where: { id: job.id },
        data: { date: newDate },
      })
      updated++
      if (updated % 50 === 0) {
        console.log(`    ...updated ${updated}/${midnightJobs.length}`)
      }
    }
    console.log(`  ✅ Updated ${updated} jobs from midnight → noon UTC`)
  } else {
    console.log(`\n  ⏸️  DRY RUN: Would update ${midnightJobs.length} jobs`)
  }

  return { snapshot, count: midnightJobs.length }
}

// ─── Fix B: Backfill amountEarned ───
async function fixAmountEarned(apply: boolean) {
  console.log('\n══════════════════════════════════════════════════')
  console.log('  FIX B: Backfill amountEarned for Completed Jobs')
  console.log('══════════════════════════════════════════════════\n')

  // Find completed jobs with assignments that have NULL amountEarned
  const completedJobs = await prisma.job.findMany({
    where: {
      completed: true,
      assignments: { some: { amountEarned: null } },
    },
    include: {
      property: { select: { name: true } },
      assignments: {
        select: { id: true, amountEarned: true, teamMember: { select: { name: true } } },
      },
    },
    orderBy: { date: 'desc' },
  })

  const totalAssignments = completedJobs.reduce((sum, j) => sum + j.assignments.length, 0)
  const nullAssignments = completedJobs.reduce(
    (sum, j) => sum + j.assignments.filter(a => a.amountEarned === null).length, 0
  )

  console.log(`  Completed jobs with NULL amountEarned: ${completedJobs.length}`)
  console.log(`  Total assignments to backfill: ${nullAssignments}`)

  if (completedJobs.length === 0) {
    console.log('\n  ✅ No assignments need backfilling.')
    return { snapshot: [], count: 0 }
  }

  // Show sample calculations
  console.log('\n  Sample calculations (first 5):')
  const snapshot: { assignmentId: string; originalAmount: number | null; newAmount: number }[] = []

  for (const job of completedJobs.slice(0, 5)) {
    const payments = calculateJobPayments(job.rate, job.expensePercent, job.assignments.length)
    const team = job.assignments.map(a => a.teamMember.name.split(' ')[0]).join(', ')
    console.log(`    ${job.property.name} | Rate: $${job.rate} | Expense: ${job.expensePercent}% | ${job.assignments.length} workers (${team})`)
    console.log(`      → Per person: $${payments.perPerson} (team total: $${payments.teamTotal}, expense: $${payments.expense})`)
  }

  // Build full snapshot
  for (const job of completedJobs) {
    const payments = calculateJobPayments(job.rate, job.expensePercent, job.assignments.length)
    for (const assignment of job.assignments) {
      if (assignment.amountEarned === null) {
        snapshot.push({
          assignmentId: assignment.id,
          originalAmount: null,
          newAmount: payments.perPerson,
        })
      }
    }
  }

  if (apply) {
    console.log(`\n  🔧 Applying fix to ${snapshot.length} assignments...`)
    let updated = 0
    for (const job of completedJobs) {
      if (job.rate <= 0) continue
      const payments = calculateJobPayments(job.rate, job.expensePercent, job.assignments.length)
      await prisma.jobAssignment.updateMany({
        where: {
          jobId: job.id,
          amountEarned: null,
        },
        data: { amountEarned: payments.perPerson },
      })
      updated += job.assignments.filter(a => a.amountEarned === null).length
    }
    console.log(`  ✅ Updated ${updated} assignments with calculated amountEarned`)
  } else {
    console.log(`\n  ⏸️  DRY RUN: Would update ${snapshot.length} assignments`)
  }

  return { snapshot, count: snapshot.length }
}

// ─── Rollback ───
async function rollback() {
  console.log('\n══════════════════════════════════════════════════')
  console.log('  ROLLBACK: Restoring from snapshot')
  console.log('══════════════════════════════════════════════════\n')

  const fs = await import('fs')
  const snapshotPath = './scripts/fix-data-snapshot.json'

  if (!fs.existsSync(snapshotPath)) {
    console.error('  ❌ No snapshot file found at', snapshotPath)
    console.error('  Cannot rollback without a snapshot. Was --apply ever run?')
    process.exit(1)
  }

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'))

  // Rollback dates
  if (snapshot.dates && snapshot.dates.length > 0) {
    console.log(`  Rolling back ${snapshot.dates.length} date changes...`)
    for (const entry of snapshot.dates) {
      await prisma.job.update({
        where: { id: entry.id },
        data: { date: new Date(entry.originalDate) },
      })
    }
    console.log(`  ✅ Restored ${snapshot.dates.length} job dates`)
  }

  // Rollback amountEarned
  if (snapshot.assignments && snapshot.assignments.length > 0) {
    console.log(`  Rolling back ${snapshot.assignments.length} amountEarned changes...`)
    for (const entry of snapshot.assignments) {
      await prisma.jobAssignment.update({
        where: { id: entry.assignmentId },
        data: { amountEarned: entry.originalAmount },
      })
    }
    console.log(`  ✅ Restored ${snapshot.assignments.length} assignment amounts`)
  }

  console.log('\n  ✅ Rollback complete!')
}

// ─── Main ───
async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║   CRN Data Fix Script                           ║')
  console.log('║   Mode: ' + mode.padEnd(40) + '║')
  console.log('╚══════════════════════════════════════════════════╝')

  if (mode === '--rollback') {
    await rollback()
    await prisma.$disconnect()
    return
  }

  const apply = mode === '--apply'

  if (!apply) {
    console.log('\n  ℹ️  Running in DRY RUN mode. Use --apply to make changes.')
  }

  const dateResult = await fixMidnightDates(apply)
  const earningsResult = await fixAmountEarned(apply)

  // Save snapshot if applying
  if (apply) {
    const fs = await import('fs')
    const snapshot = {
      appliedAt: new Date().toISOString(),
      dates: dateResult.snapshot,
      assignments: earningsResult.snapshot,
    }
    fs.writeFileSync('./scripts/fix-data-snapshot.json', JSON.stringify(snapshot, null, 2))
    console.log('\n  📁 Snapshot saved to scripts/fix-data-snapshot.json (for rollback)')
  }

  console.log('\n══════════════════════════════════════════════════')
  console.log('  SUMMARY')
  console.log('══════════════════════════════════════════════════')
  console.log(`  Midnight dates: ${dateResult.count} ${apply ? 'fixed' : 'to fix'}`)
  console.log(`  NULL amountEarned: ${earningsResult.count} ${apply ? 'backfilled' : 'to backfill'}`)
  if (!apply) {
    console.log('\n  Run with --apply to make these changes.')
  }
  console.log('')

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('Script failed:', e)
  await prisma.$disconnect()
  process.exit(1)
})
