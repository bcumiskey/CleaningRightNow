import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import masterData from '../../../../../data/crn_jobs_master.json'

// POST /api/admin/correct-jobs
// Bulk-corrects all completed jobs to match the master JSON.
// Uses direct Prisma calls (NOT the PATCH endpoint) to avoid auto-recalculation.
// Sets amountEarned directly from the JSON per_cleaner value.

// Map JSON property codes → possible DB property names (case-insensitive)
const PROPERTY_ALIAS_MAP: Record<string, string[]> = {
  'BBR': ['the gambrel- bbr', 'the gambrel', 'gambrel', 'bbr', 'black barn ridge'],
  'DUTCH': ['the dutch', 'dutch'],
  'GABLE': ['the gable', 'gable'],
  'STONES': ["stone's thoreau", 'stones thoreau', 'stones', "stone's"],
  'OWL': ['owl', 'the owl'],
  'DOG': ['dogwood cleaning', 'dogwood', 'dog'],
  'CB': ['cb'],
  'RED': ['red bud holiday house', 'redbud holiday house', 'red', 'the red', 'redbud'],
  'MULBERRY': ['test (mulberry)', 'test', 'mulberry'],
  'MINDY': ['981 ridgeview, mindy', '981 ridgeview mindy', 'mindy'],
  'FUNK': ['funkhouse', 'funk'],
  'TOBY': ['toby'],
  'CEDAR': ['cedar shores main', 'cedar shores', 'cedar'],
  'ANT': ['anthony', 'ant'],
  '1': ['suite 1', '1'],
  '2': ['suite 2', '2'],
  '150': ['other', '150'],
}

interface MasterJob {
  date: string | null
  property: string
  property_price: number
  commission_rate: number
  commission: number
  after_commission: number
  num_cleaners: number
  per_cleaner: number
  cleaners: string
  original_group: string
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const sessionUser = session.user as { role?: string }
    if (sessionUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 1. Fetch all properties and team members
    const allProperties = await prisma.property.findMany({
      select: { id: true, name: true },
    })
    const allTeamMembers = await prisma.teamMember.findMany({
      select: { id: true, name: true },
    })

    // 2. Build property lookup: JSON code → DB property ID
    const propertyMap: Record<string, { id: string; name: string }> = {}
    const unmatchedProperties: string[] = []

    for (const [jsonCode, aliases] of Object.entries(PROPERTY_ALIAS_MAP)) {
      const match = allProperties.find(p => {
        const dbName = p.name.toLowerCase().trim()
        return aliases.some(alias => dbName === alias.toLowerCase().trim())
      })
      if (match) {
        propertyMap[jsonCode] = match
      } else {
        unmatchedProperties.push(jsonCode)
      }
    }

    if (unmatchedProperties.length > 0) {
      return NextResponse.json({
        error: 'Some properties could not be matched to the database',
        unmatchedProperties,
        availableProperties: allProperties.map(p => p.name),
        hint: 'Create these properties or update the alias map, then try again.',
      }, { status: 400 })
    }

    // 3. Build team member lookup: first name → DB TeamMember
    // JSON uses: Alex, Alexandria Keag, Kim Keag, Ashley
    const teamMemberMap: Record<string, string> = {}
    const unmatchedMembers: string[] = []
    const expectedNames = new Set<string>()

    for (const job of masterData.jobs as MasterJob[]) {
      const names = job.cleaners.split(',').map(n => n.trim())
      names.forEach(n => expectedNames.add(n))
    }

    for (const name of expectedNames) {
      const match = allTeamMembers.find(m => {
        const dbName = m.name.toLowerCase().trim()
        const searchName = name.toLowerCase().trim()
        // Match by exact name, first name, or contains
        return dbName === searchName ||
               dbName.split(' ')[0] === searchName ||
               dbName.includes(searchName)
      })
      if (match) {
        teamMemberMap[name] = match.id
      } else {
        unmatchedMembers.push(name)
      }
    }

    if (unmatchedMembers.length > 0) {
      return NextResponse.json({
        error: 'Some team members could not be matched to the database',
        unmatchedMembers,
        availableTeamMembers: allTeamMembers.map(m => m.name),
        hint: 'Create these team members or check names, then try again.',
      }, { status: 400 })
    }

    // 4. Process each job
    const results: {
      status: 'updated' | 'created' | 'skipped' | 'error'
      date: string | null
      property: string
      detail: string
    }[] = []

    let updated = 0
    let created = 0
    let skipped = 0
    let errors = 0
    let totalRevenue = 0
    let totalCommission = 0

    for (const masterJob of masterData.jobs as MasterJob[]) {
      // Skip DOG (FEE) — null date, needs manual handling
      // Skip 150 — not yet in the system
      if (masterJob.date === null) {
        results.push({
          status: 'skipped',
          date: masterJob.date,
          property: masterJob.property,
          detail: 'Skipped: null date (DOG FEE) — needs manual date assignment',
        })
        skipped++
        continue
      }

      const propertyEntry = propertyMap[masterJob.property]
      if (!propertyEntry) {
        results.push({
          status: 'error',
          date: masterJob.date,
          property: masterJob.property,
          detail: `Error: property "${masterJob.property}" not in alias map`,
        })
        errors++
        continue
      }

      // Parse cleaner names → team member IDs
      const cleanerNames = masterJob.cleaners.split(',').map(n => n.trim())
      const cleanerIds = cleanerNames.map(n => teamMemberMap[n]).filter(Boolean)
      if (cleanerIds.length !== cleanerNames.length) {
        results.push({
          status: 'error',
          date: masterJob.date,
          property: masterJob.property,
          detail: `Error: could not match all cleaners — expected ${cleanerNames.join(', ')}`,
        })
        errors++
        continue
      }

      // Parse date as noon UTC to avoid timezone issues
      const jobDate = new Date(`${masterJob.date}T12:00:00.000Z`)
      const expensePercent = masterJob.commission_rate * 100 // 0.05 → 5, 0.12 → 12

      try {
        // Find existing job by date + property (with ±1 day tolerance)
        const dayBefore = new Date(jobDate)
        dayBefore.setDate(dayBefore.getDate() - 1)
        const dayAfter = new Date(jobDate)
        dayAfter.setDate(dayAfter.getDate() + 1)

        const existingJob = await prisma.job.findFirst({
          where: {
            propertyId: propertyEntry.id,
            date: { gte: dayBefore, lte: dayAfter },
          },
          include: {
            assignments: { select: { id: true, teamMemberId: true } },
          },
        })

        if (existingJob) {
          // UPDATE existing job — direct Prisma, no auto-recalculation
          await prisma.job.update({
            where: { id: existingJob.id },
            data: {
              date: jobDate,
              rate: masterJob.property_price,
              expensePercent,
              originalGroup: masterJob.original_group,
              completed: true,
              completedAt: existingJob.completedAt || jobDate,
            },
          })

          // Read existing assignments to preserve payment status
          const existingAssignments = await prisma.jobAssignment.findMany({
            where: { jobId: existingJob.id },
            select: { teamMemberId: true, paidAt: true, paymentMethod: true },
          })
          const paidMap = new Map(
            existingAssignments.map(a => [a.teamMemberId, { paidAt: a.paidAt, paymentMethod: a.paymentMethod }])
          )

          // Delete and recreate with correct amountEarned, preserving payment status
          await prisma.jobAssignment.deleteMany({
            where: { jobId: existingJob.id },
          })
          await prisma.jobAssignment.createMany({
            data: cleanerIds.map(teamMemberId => ({
              jobId: existingJob.id,
              teamMemberId,
              amountEarned: masterJob.per_cleaner,
              paidAt: paidMap.get(teamMemberId)?.paidAt || null,
              paymentMethod: paidMap.get(teamMemberId)?.paymentMethod || null,
            })),
          })

          results.push({
            status: 'updated',
            date: masterJob.date,
            property: masterJob.property,
            detail: `Updated: rate=$${masterJob.property_price}, expense=${expensePercent}%, per_cleaner=$${masterJob.per_cleaner}, ${cleanerNames.length} cleaners`,
          })
          updated++
        } else {
          // CREATE new job
          const newJob = await prisma.job.create({
            data: {
              date: jobDate,
              propertyId: propertyEntry.id,
              rate: masterJob.property_price,
              expensePercent,
              originalGroup: masterJob.original_group,
              completed: true,
              completedAt: jobDate,
              source: 'manual',
            },
          })

          // Create assignments with exact amountEarned
          await prisma.jobAssignment.createMany({
            data: cleanerIds.map(teamMemberId => ({
              jobId: newJob.id,
              teamMemberId,
              amountEarned: masterJob.per_cleaner,
            })),
          })

          results.push({
            status: 'created',
            date: masterJob.date,
            property: masterJob.property,
            detail: `Created: rate=$${masterJob.property_price}, expense=${expensePercent}%, per_cleaner=$${masterJob.per_cleaner}, ${cleanerNames.length} cleaners`,
          })
          created++
        }

        totalRevenue += masterJob.property_price
        totalCommission += masterJob.commission
      } catch (err) {
        results.push({
          status: 'error',
          date: masterJob.date,
          property: masterJob.property,
          detail: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        })
        errors++
      }
    }

    const netAfterCommission = totalRevenue - totalCommission

    return NextResponse.json({
      success: true,
      summary: {
        totalProcessed: results.length,
        updated,
        created,
        skipped,
        errors,
        totalRevenue,
        totalCommission: Math.round(totalCommission * 100) / 100,
        netAfterCommission: Math.round(netAfterCommission * 100) / 100,
      },
      propertyMapping: Object.fromEntries(
        Object.entries(propertyMap).map(([code, p]) => [code, p.name])
      ),
      teamMemberMapping: teamMemberMap,
      results,
    })
  } catch (error) {
    console.error('Correct jobs error:', error)
    return NextResponse.json(
      { error: 'Failed to correct jobs', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
