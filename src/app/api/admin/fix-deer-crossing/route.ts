import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// POST /api/admin/fix-deer-crossing
// Manually sets Deer Crossing cleaning dates for 2026.
// For each date: if a Dogwood job exists on that date, reassign it to Deer Crossing.
// If no job exists, create one. Mark B2B as specified.

const DEER_CROSSING_DATES_2026 = [
  '2026-05-31',
  '2026-06-04',
  '2026-06-07',
  '2026-06-11',
  '2026-06-14',
  '2026-06-21',
  '2026-06-25',
  '2026-06-28',
  '2026-07-05',
  '2026-07-12',
  '2026-07-19',
  '2026-07-26',
  '2026-08-02',
  '2026-08-09',
  '2026-08-23',
  '2026-08-27',
  '2026-08-30',
  '2026-09-02',
  '2026-09-06',
  '2026-09-10',
  '2026-09-13',
  '2026-09-20',
]

// These dates are NOT back-to-back (all others are B2B)
const NOT_B2B_DATES = new Set([
  '2026-07-26',
  '2026-09-13',
  '2026-09-20',
])

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

    // Find Deer Crossing property
    const allProperties = await prisma.property.findMany({
      select: { id: true, name: true, baseRate: true },
    })

    let deerCrossing = allProperties.find(
      p => p.name.toLowerCase().trim() === 'deer crossing'
    )

    // Also try partial matches
    if (!deerCrossing) {
      deerCrossing = allProperties.find(
        p => p.name.toLowerCase().includes('deer') && p.name.toLowerCase().includes('cross')
      )
    }

    if (!deerCrossing) {
      return NextResponse.json({
        error: 'Deer Crossing property not found in database',
        availableProperties: allProperties.map(p => p.name),
        hint: 'Create a property named "Deer Crossing" first, then run this again.',
      }, { status: 404 })
    }

    // Find Dogwood property (to reassign wrong jobs)
    const dogwood = allProperties.find(
      p => p.name.toLowerCase().includes('dogwood')
    )

    const rate = deerCrossing.baseRate || 0
    let reassigned = 0
    let created = 0
    let alreadyCorrect = 0
    const details: string[] = []

    for (const dateStr of DEER_CROSSING_DATES_2026) {
      const isB2B = !NOT_B2B_DATES.has(dateStr)
      // Use noon UTC to avoid timezone issues
      const jobDate = new Date(`${dateStr}T12:00:00.000Z`)

      // Check if there's already a Deer Crossing job on this date
      const existingDeerCrossingJob = await prisma.job.findFirst({
        where: {
          propertyId: deerCrossing.id,
          date: jobDate,
        },
      })

      if (existingDeerCrossingJob) {
        // Already correct — just update B2B flag if needed
        if (existingDeerCrossingJob.isBackToBack !== isB2B) {
          await prisma.job.update({
            where: { id: existingDeerCrossingJob.id },
            data: { isBackToBack: isB2B },
          })
          details.push(`${dateStr}: updated B2B flag to ${isB2B}`)
        } else {
          details.push(`${dateStr}: already correct`)
        }
        alreadyCorrect++
        continue
      }

      // Check if there's a Dogwood job on this date that should be Deer Crossing
      if (dogwood) {
        const wrongDogwoodJob = await prisma.job.findFirst({
          where: {
            propertyId: dogwood.id,
            date: jobDate,
          },
        })

        if (wrongDogwoodJob) {
          // Reassign from Dogwood to Deer Crossing
          await prisma.job.update({
            where: { id: wrongDogwoodJob.id },
            data: {
              propertyId: deerCrossing.id,
              isBackToBack: isB2B,
            },
          })
          reassigned++
          details.push(`${dateStr}: reassigned from ${dogwood.name} → ${deerCrossing.name} (B2B: ${isB2B})`)
          continue
        }
      }

      // Also check +/- 1 day in case of timezone offset creating wrong dates
      if (dogwood) {
        const dayBefore = new Date(jobDate)
        dayBefore.setDate(dayBefore.getDate() - 1)
        const dayAfter = new Date(jobDate)
        dayAfter.setDate(dayAfter.getDate() + 1)

        const nearbyDogwoodJob = await prisma.job.findFirst({
          where: {
            propertyId: dogwood.id,
            date: { gte: dayBefore, lte: dayAfter },
          },
        })

        if (nearbyDogwoodJob) {
          await prisma.job.update({
            where: { id: nearbyDogwoodJob.id },
            data: {
              propertyId: deerCrossing.id,
              date: jobDate,
              isBackToBack: isB2B,
            },
          })
          reassigned++
          details.push(`${dateStr}: reassigned nearby Dogwood job (was ${nearbyDogwoodJob.date.toISOString().split('T')[0]}) → ${deerCrossing.name}`)
          continue
        }
      }

      // No existing job found — create new one
      await prisma.job.create({
        data: {
          date: jobDate,
          propertyId: deerCrossing.id,
          rate,
          expensePercent: 12,
          source: 'manual',
          isBackToBack: isB2B,
        },
      })
      created++
      details.push(`${dateStr}: created new job (B2B: ${isB2B})`)
    }

    return NextResponse.json({
      success: true,
      deerCrossingProperty: deerCrossing.name,
      dogwoodProperty: dogwood?.name || 'not found',
      totalDates: DEER_CROSSING_DATES_2026.length,
      reassignedFromDogwood: reassigned,
      newJobsCreated: created,
      alreadyCorrect,
      details,
    })
  } catch (error) {
    console.error('Fix Deer Crossing error:', error)
    return NextResponse.json(
      { error: 'Failed to fix Deer Crossing', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
