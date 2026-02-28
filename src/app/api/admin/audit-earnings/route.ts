import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import masterData from '../../../../../data/crn_jobs_master.json'

// Reuse the same property alias map from correct-jobs
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
}

interface MasterJob {
  date: string | null
  property: string
  property_price: number
  per_cleaner: number
  cleaners: string
}

interface Discrepancy {
  date: string
  property: string
  dbAmount: number
  jsonAmount: number
}

interface MemberAudit {
  name: string
  dbTotal: number
  jsonTotal: number
  difference: number
  dbJobCount: number
  jsonJobCount: number
  extras: { date: string; property: string; amountEarned: number }[]
  missing: { date: string; property: string; perCleaner: number }[]
  mismatches: Discrepancy[]
}

export async function GET() {
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

    // 2. Build property lookup: DB property ID → JSON code
    const propertyIdToCode: Record<string, string> = {}
    const propertyCodeToName: Record<string, string> = {}
    for (const [jsonCode, aliases] of Object.entries(PROPERTY_ALIAS_MAP)) {
      const match = allProperties.find(p => {
        const dbName = p.name.toLowerCase().trim()
        return aliases.some(alias => dbName === alias.toLowerCase().trim())
      })
      if (match) {
        propertyIdToCode[match.id] = jsonCode
        propertyCodeToName[jsonCode] = match.name
      }
    }

    // 3. Build team member lookup: name → id (same logic as correct-jobs)
    const teamMemberMap: Record<string, string> = {} // JSON name → DB id
    const teamMemberIdToName: Record<string, string> = {} // DB id → DB name
    const expectedNames = new Set<string>()

    for (const job of masterData.jobs as MasterJob[]) {
      const names = job.cleaners.split(',').map(n => n.trim())
      names.forEach(n => expectedNames.add(n))
    }

    for (const name of expectedNames) {
      const match = allTeamMembers.find(m => {
        const dbName = m.name.toLowerCase().trim()
        const searchName = name.toLowerCase().trim()
        return dbName === searchName ||
               dbName.split(' ')[0] === searchName ||
               dbName.includes(searchName)
      })
      if (match) {
        teamMemberMap[name] = match.id
        teamMemberIdToName[match.id] = match.name
      }
    }

    // Also map all team members by ID for DB lookups
    for (const m of allTeamMembers) {
      teamMemberIdToName[m.id] = m.name
    }

    // 4. Fetch all completed DB assignments in 2026
    const startOf2026 = new Date('2026-01-01T00:00:00.000Z')
    const startOf2027 = new Date('2027-01-01T00:00:00.000Z')

    const dbAssignments = await prisma.jobAssignment.findMany({
      where: {
        job: {
          completed: true,
          date: { gte: startOf2026, lt: startOf2027 },
        },
      },
      select: {
        teamMemberId: true,
        amountEarned: true,
        job: {
          select: {
            date: true,
            propertyId: true,
            property: { select: { name: true } },
          },
        },
      },
    })

    // 5. Group DB assignments by team member
    const dbByMember: Record<string, { date: string; property: string; propertyCode: string; amountEarned: number }[]> = {}
    for (const a of dbAssignments) {
      const memberId = a.teamMemberId
      if (!dbByMember[memberId]) dbByMember[memberId] = []
      const dateStr = a.job.date.toISOString().split('T')[0]
      const propertyCode = propertyIdToCode[a.job.propertyId] || a.job.property.name
      dbByMember[memberId].push({
        date: dateStr,
        property: propertyCode,
        propertyCode: propertyCode,
        amountEarned: a.amountEarned ?? 0,
      })
    }

    // 6. Group JSON jobs by team member
    const jsonByMember: Record<string, { date: string; property: string; perCleaner: number }[]> = {}
    for (const job of masterData.jobs as MasterJob[]) {
      if (job.date === null) continue // skip null-date entries
      const names = job.cleaners.split(',').map(n => n.trim())
      for (const name of names) {
        const memberId = teamMemberMap[name]
        if (!memberId) continue
        if (!jsonByMember[memberId]) jsonByMember[memberId] = []
        jsonByMember[memberId].push({
          date: job.date,
          property: job.property,
          perCleaner: job.per_cleaner,
        })
      }
    }

    // 7. Compare per team member
    const allMemberIds = new Set([...Object.keys(dbByMember), ...Object.keys(jsonByMember)])
    const members: MemberAudit[] = []

    for (const memberId of allMemberIds) {
      const memberName = teamMemberIdToName[memberId] || memberId
      const dbJobs = dbByMember[memberId] || []
      const jsonJobs = jsonByMember[memberId] || []

      const dbTotal = dbJobs.reduce((sum, j) => sum + j.amountEarned, 0)
      const jsonTotal = jsonJobs.reduce((sum, j) => sum + j.perCleaner, 0)

      // Build key sets for comparison (date+property)
      const makeKey = (date: string, property: string) => `${date}|${property}`

      const dbMap = new Map<string, number>()
      for (const j of dbJobs) {
        dbMap.set(makeKey(j.date, j.property), j.amountEarned)
      }

      const jsonMap = new Map<string, number>()
      for (const j of jsonJobs) {
        jsonMap.set(makeKey(j.date, j.property), j.perCleaner)
      }

      // Extras: in DB but not in JSON
      const extras: { date: string; property: string; amountEarned: number }[] = []
      for (const j of dbJobs) {
        const key = makeKey(j.date, j.property)
        if (!jsonMap.has(key)) {
          extras.push({ date: j.date, property: j.property, amountEarned: j.amountEarned })
        }
      }

      // Missing: in JSON but not in DB
      const missing: { date: string; property: string; perCleaner: number }[] = []
      for (const j of jsonJobs) {
        const key = makeKey(j.date, j.property)
        if (!dbMap.has(key)) {
          missing.push({ date: j.date, property: j.property, perCleaner: j.perCleaner })
        }
      }

      // Mismatches: in both but amounts differ
      const mismatches: Discrepancy[] = []
      for (const j of dbJobs) {
        const key = makeKey(j.date, j.property)
        const jsonAmount = jsonMap.get(key)
        if (jsonAmount !== undefined && j.amountEarned !== jsonAmount) {
          mismatches.push({
            date: j.date,
            property: j.property,
            dbAmount: j.amountEarned,
            jsonAmount,
          })
        }
      }

      members.push({
        name: memberName,
        dbTotal: Math.round(dbTotal * 100) / 100,
        jsonTotal: Math.round(jsonTotal * 100) / 100,
        difference: Math.round((dbTotal - jsonTotal) * 100) / 100,
        dbJobCount: dbJobs.length,
        jsonJobCount: jsonJobs.length,
        extras,
        missing,
        mismatches,
      })
    }

    // Sort by name
    members.sort((a, b) => a.name.localeCompare(b.name))

    const totalIssues = members.reduce((sum, m) => sum + m.extras.length + m.missing.length + m.mismatches.length, 0)

    return NextResponse.json({
      success: true,
      auditDate: new Date().toISOString(),
      totalMembers: members.length,
      totalIssues,
      members,
    })
  } catch (error) {
    console.error('Audit earnings error:', error)
    return NextResponse.json(
      { error: 'Failed to audit earnings', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
