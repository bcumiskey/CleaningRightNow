import { calculateJobPayments } from './utils'

/**
 * Single source of truth for "what did this worker earn on this job?"
 *
 * Before this module existed, four surfaces each did their own arithmetic and
 * disagreed with each other for the same worker:
 *
 *   - /api/worker/earnings   used amountEarned, but silently dropped payAdjustment
 *   - /api/reports           always recomputed from job.rate, ignoring amountEarned,
 *                            payOverride, payAdjustment and dogFee
 *   - /api/team/[id]/paid-out used amountEarned + payAdjustment
 *   - /api/dashboard         recomputed from job.rate, ignoring everything else
 *
 * Every one of those is now expected to call into this module so a worker's
 * total is the same number no matter which screen it is read from.
 */

export interface EarningsJob {
  rate: number
  expensePercent: number
  dogFee?: number | null
  payOverride?: number | null
}

export interface EarningsAssignment {
  amountEarned?: number | null
  payAdjustment?: number | null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Total pot paid out to the crew for a job, before it is split between them.
 *
 * Mirrors the write path in /api/jobs and /api/jobs/[id]: the dog fee is part of
 * revenue before the house takes its cut, and an explicit payOverride replaces
 * the calculation entirely.
 */
export function calculateJobTeamTotal(job: EarningsJob): number {
  if (job.payOverride != null) return round2(job.payOverride)

  const totalRevenue = job.rate + (job.dogFee ?? 0)
  return calculateJobPayments(totalRevenue, job.expensePercent, 1).teamTotal
}

/**
 * Per-person share derived from the job itself, used only when an assignment has
 * no stored amountEarned. This is the fallback, not the primary answer —
 * amountEarned is what the worker was actually credited.
 */
export function calculateBaseShare(job: EarningsJob, workerCount: number): number {
  if (workerCount <= 0) return 0

  if (job.payOverride != null) {
    return round2(job.payOverride / workerCount)
  }

  const totalRevenue = job.rate + (job.dogFee ?? 0)
  return calculateJobPayments(totalRevenue, job.expensePercent, workerCount).perPerson
}

/**
 * What this worker actually earned on this job.
 *
 * Stored amountEarned wins when present — it is the credited figure, set at
 * completion and by the correction tooling, and it can legitimately differ from
 * a fresh calculation (historical rate, hand-corrected split, imported sheet).
 * Recomputing over the top of it is what made the reports page disagree with
 * the pay statements.
 */
export function calculateWorkerShare(
  assignment: EarningsAssignment,
  job: EarningsJob,
  workerCount: number
): number {
  const base = assignment.amountEarned != null
    ? assignment.amountEarned
    : calculateBaseShare(job, workerCount)

  return round2(base + (assignment.payAdjustment ?? 0))
}

/**
 * True when the stored credit has drifted away from what the job's current
 * numbers would produce. Drift is not automatically wrong — an intentional
 * correction looks identical to a stale value — so this only flags rows for a
 * human to review rather than changing any figure.
 */
export function hasEarningsDrift(
  assignment: EarningsAssignment,
  job: EarningsJob,
  workerCount: number
): boolean {
  if (assignment.amountEarned == null) return false

  const computed = calculateBaseShare(job, workerCount)
  return Math.abs(assignment.amountEarned - computed) >= 0.01
}
