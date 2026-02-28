/**
 * Room Setup Guide - Data Load Script
 *
 * Loads room-by-room setup data for:
 * - Gable & Dutch (identical houses)
 * - Gambrel (BBR)
 * - Stones Thoreau (ST)
 *
 * Also loads Michelle's operational rules as property-wide instructions.
 *
 * Usage:
 *   npx tsx scripts/load-room-setup.ts              # DRY RUN
 *   npx tsx scripts/load-room-setup.ts --apply       # APPLY changes
 */

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = !process.argv.includes('--apply')

// =================================================================
// ROOM DEFINITIONS
// =================================================================

interface RoomDef {
  name: string
  type: 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'laundry' | 'outdoor' | 'storage' | 'other'
  floor: string
  beds?: Array<{ type: string; count: number }>
  pillowCount?: number
  sheetSet?: string
  servesRoom?: string
  notes?: string
  sortOrder: number
}

// Gable & Dutch — identical layout
const GABLE_DUTCH_ROOMS: RoomDef[] = [
  // Main Floor
  {
    name: 'King Bedroom 1',
    type: 'bedroom',
    floor: 'Main Floor',
    beds: [{ type: 'King', count: 1 }],
    pillowCount: 4,
    sheetSet: 'King Set',
    notes: 'Both main floor bedrooms are identical',
    sortOrder: 0,
  },
  {
    name: 'King Bedroom 1 — Bathroom',
    type: 'bathroom',
    floor: 'Main Floor',
    servesRoom: 'King Bedroom 1',
    notes: `Big Towels: 2 — both hanging
Hand Towels: 2 — 1 hanging, 1 under cabinet
Black Makeup: 2 — 1 tri-folded on top of hand towel, 1 under sink
White Wash: 2 under sink
Rug: 1 hanging over shower door`,
    sortOrder: 1,
  },
  {
    name: 'King Bedroom 2',
    type: 'bedroom',
    floor: 'Main Floor',
    beds: [{ type: 'King', count: 1 }],
    pillowCount: 4,
    sheetSet: 'King Set',
    notes: 'Identical to King Bedroom 1',
    sortOrder: 2,
  },
  {
    name: 'King Bedroom 2 — Bathroom',
    type: 'bathroom',
    floor: 'Main Floor',
    servesRoom: 'King Bedroom 2',
    notes: `Big Towels: 2 — both hanging
Hand Towels: 2 — 1 hanging, 1 under cabinet
Black Makeup: 2 — 1 tri-folded on top of hand towel, 1 under sink
White Wash: 2 under sink
Rug: 1 hanging over shower door`,
    sortOrder: 3,
  },
  {
    name: 'Half Bath',
    type: 'bathroom',
    floor: 'Main Floor',
    notes: `Hand Towels: 1
Toilet Paper: 3 rolls`,
    sortOrder: 4,
  },
  {
    name: 'Hallway Linen Closet',
    type: 'storage',
    floor: 'Main Floor',
    notes: `Big Towels: 4
Hand Towels: 4
White Wash: 4
Black Makeup: 4`,
    sortOrder: 5,
  },
  // Upstairs
  {
    name: 'King Bedroom (Upstairs)',
    type: 'bedroom',
    floor: 'Upstairs',
    beds: [{ type: 'King', count: 1 }, { type: 'Crib', count: 1 }],
    sheetSet: 'King Set',
    notes: 'Also has a crib with crib sheet',
    sortOrder: 6,
  },
  {
    name: 'Upstairs Bathroom',
    type: 'bathroom',
    floor: 'Upstairs',
    servesRoom: 'King Bedroom (Upstairs)',
    notes: `Double sink bathroom
Big Towels: 6 — 1 hanging, 2 in one basket under sink, 3 in the other
Hand Towels: 6 — 1 rolled on each sink (2), 2 in baskets under each sink (4)
Black Makeup: 6 — 1 rolled on each counter (2), 2 in each drawer under sink (4)
White Wash: 6 — 3 under each sink
Rug: 1 bath mat`,
    sortOrder: 7,
  },
  // Basement
  {
    name: 'King Bedroom (Basement)',
    type: 'bedroom',
    floor: 'Basement',
    beds: [{ type: 'King', count: 1 }],
    sheetSet: 'King Set',
    notes: 'Closet: 2 of each towel type',
    sortOrder: 8,
  },
  {
    name: 'Bunk Room',
    type: 'bedroom',
    floor: 'Basement',
    beds: [{ type: 'Twin', count: 2 }, { type: 'Queen', count: 2 }],
    notes: `Sheets: 2 Twin Sets + 2 Queen Sets
Closet: 2 of each towel type`,
    sortOrder: 9,
  },
  {
    name: 'Shared Bathroom (Basement)',
    type: 'bathroom',
    floor: 'Basement',
    notes: `Big Towels: 4 on bottom shelf under sink
Hand Towels: 4 — 1 hanging, 3 under sink
Black Makeup: 1 hanging
White Wash: 4 under sink
Toilet Paper: 4 under sink
Rug: 1 hung over side of tub`,
    sortOrder: 10,
  },
  // Garage
  {
    name: 'Garage',
    type: 'outdoor',
    floor: 'Garage',
    notes: `Beach Towels: 14
Cleaning Instructions: Wipe down tables, push chairs in, pick up all toys, vacuum floor (use the vacuum that stays in the garage), make sure poker table is clean`,
    sortOrder: 11,
  },
  // Kitchen
  {
    name: 'Kitchen',
    type: 'kitchen',
    floor: 'Main Floor',
    notes: `Kitchen Towels: 6
Paper Towels: 2 full rolls
Trash Bags: New bag in can + extras under sink
Sponge: Always a new sponge`,
    sortOrder: 12,
  },
]

// Gambrel (BBR)
const GAMBREL_ROOMS: RoomDef[] = [
  // Main Floor
  {
    name: 'King Bedroom 1',
    type: 'bedroom',
    floor: 'Main Floor',
    beds: [{ type: 'King', count: 1 }],
    sheetSet: 'King Set',
    notes: 'Standard pillows (same as Bedroom 2)',
    sortOrder: 0,
  },
  {
    name: 'King Bedroom 1 — Bathroom',
    type: 'bathroom',
    floor: 'Main Floor',
    servesRoom: 'King Bedroom 1',
    notes: `Big Towels: 2
Hand Towels: 2 — 1 rolled on counter
White Wash: 2
Black Makeup: 2 — 1 rolled on counter with hand towel (see photo)
Rug: 1`,
    sortOrder: 1,
  },
  {
    name: 'King Bedroom 2',
    type: 'bedroom',
    floor: 'Main Floor',
    beds: [{ type: 'King', count: 1 }],
    sheetSet: 'King Set',
    notes: 'Same as King Bedroom 1',
    sortOrder: 2,
  },
  {
    name: 'King Bedroom 2 — Bathroom',
    type: 'bathroom',
    floor: 'Main Floor',
    servesRoom: 'King Bedroom 2',
    notes: `Big Towels: 2
Hand Towels: 2 — 1 rolled on counter
White Wash: 2
Black Makeup: 2 — 1 rolled on counter with hand towel
Rug: 1`,
    sortOrder: 3,
  },
  {
    name: 'Main Floor Closet',
    type: 'storage',
    floor: 'Main Floor',
    notes: `By front door — overflow storage
Big Towels: 4
Hand Towels: 4
White Wash: 4
Black Makeup: 4`,
    sortOrder: 4,
  },
  // Upstairs
  {
    name: 'Master Bedroom',
    type: 'bedroom',
    floor: 'Upstairs',
    beds: [{ type: 'King', count: 1 }],
    pillowCount: 4,
    sheetSet: 'King Set',
    notes: 'Attached bathroom',
    sortOrder: 5,
  },
  {
    name: 'Master Bathroom',
    type: 'bathroom',
    floor: 'Upstairs',
    servesRoom: 'Master Bedroom',
    notes: `Big Towels: 4
Hand Towels: 4 — 2 rolled on counter
White Wash: 4
Black Makeup: 4 — 2 rolled on counter
Reference photo needed showing counter arrangement`,
    sortOrder: 6,
  },
  {
    name: 'Bunk Room',
    type: 'bedroom',
    floor: 'Upstairs',
    beds: [{ type: 'Twin', count: 2 }, { type: 'Full', count: 2 }],
    pillowCount: 6,
    notes: 'Sheets: 2 Twin Sets + 2 Full Sets',
    sortOrder: 7,
  },
  {
    name: 'Shared Bathroom (Bunk Room)',
    type: 'bathroom',
    floor: 'Upstairs',
    servesRoom: 'Bunk Room',
    notes: `Big Towels: 6 — 2 of the 6 hanging folded with tri-fold
Hand Towels: 6 — 1 rolled on counter
White Wash: 6
Black Makeup: 6 — 1 rolled on counter`,
    sortOrder: 8,
  },
]

// Stones Thoreau (ST)
const STONES_ROOMS: RoomDef[] = [
  // 1st Floor
  {
    name: 'King Bedroom (Master)',
    type: 'bedroom',
    floor: '1st Floor',
    beds: [{ type: 'King', count: 1 }],
    sheetSet: 'King Set',
    notes: 'Standard pillows',
    sortOrder: 0,
  },
  {
    name: 'Master Bathroom',
    type: 'bathroom',
    floor: '1st Floor',
    servesRoom: 'King Bedroom (Master)',
    notes: `Double sink bathroom
Big Towels: 8 — 4 under each sink
Hand Towels: 8 — 3 under each sink, 1 hung on each towel bar
Black Makeup: 8 — 1 on top of each hung hand towel, 3 under each sink
White Wash: 8 — 4 under each sink
Robes: 2
Slippers: 2 pairs`,
    sortOrder: 1,
  },
  {
    name: 'Den',
    type: 'bedroom',
    floor: '1st Floor',
    beds: [{ type: 'Full', count: 1 }],
    sheetSet: 'Full Set',
    sortOrder: 2,
  },
  {
    name: 'Half Bath',
    type: 'bathroom',
    floor: '1st Floor',
    notes: `Hand Towels: 2
Toilet Paper: 3 rolls`,
    sortOrder: 3,
  },
  // 2nd Floor
  {
    name: 'Queen Room',
    type: 'bedroom',
    floor: '2nd Floor',
    beds: [{ type: 'Queen', count: 1 }],
    sheetSet: 'Queen Set',
    notes: 'Attached bathroom',
    sortOrder: 4,
  },
  {
    name: 'Queen Room Bathroom',
    type: 'bathroom',
    floor: '2nd Floor',
    servesRoom: 'Queen Room',
    notes: `Big Towels: 4
Hand Towels: 4
White Wash: 4
Black Makeup: 4
Robes: 2
Slippers: 2 pairs
Toilet Paper: 3 rolls`,
    sortOrder: 5,
  },
  {
    name: 'King Room',
    type: 'bedroom',
    floor: '2nd Floor',
    beds: [{ type: 'King', count: 1 }],
    sheetSet: 'King Set',
    notes: `Big Towels: 6
Hand Towels: 6
White Wash: 6
Black Makeup: 6
Robes: 2
Slippers: 2 pairs
Toilet Paper: 3 rolls`,
    sortOrder: 6,
  },
  {
    name: 'Murphy Bed',
    type: 'bedroom',
    floor: '2nd Floor',
    beds: [{ type: 'Full', count: 1 }],
    sheetSet: 'Full Set',
    sortOrder: 7,
  },
]

// =================================================================
// MICHELLE'S OPERATIONAL RULES
// =================================================================

const OPERATIONAL_RULES = [
  // Laundry Rules
  {
    room: 'General',
    instruction: 'LAUNDRY — GOES TO DRY CLEANER (ZOOM): White bath towels, white bath mats, sheets. Nothing else unless it\'s a one-off stain.',
    sortOrder: 1,
  },
  {
    room: 'General',
    instruction: 'LAUNDRY — ON PROPERTY EVERY TURN: Beach towels, kitchen towels, black makeup washcloths, colored blankets on beds, throw blankets. Start laundry when the clean begins. 24-hour gap between guests. If not done when clean ends, tell Michelle and she\'ll finish it.',
    sortOrder: 2,
  },
  {
    room: 'General',
    instruction: 'DUVET COVERS & MATTRESS PADS (BBR ONLY — Dutch, Gable, Gambrel): Do NOT send to Zoom. Spot treat stains on property. Drop at Michelle\'s house — note which home each item belongs to. She washes and returns them. If Michelle is out of town, they can go to Zoom. This does NOT apply to Cottage or Stones.',
    sortOrder: 3,
  },
  {
    room: 'General',
    instruction: 'Only wash what is actually dirty. Treat stains on property before sending anything out. Don\'t overload bathrooms with towels — extras go in closets.',
    sortOrder: 4,
  },
  // Towel Display Rules
  {
    room: 'General',
    instruction: 'TOWEL DISPLAY: Fewer towels in bathrooms — just what\'s needed. Extra towels in central locations (closets, laundry room, under sinks). Displayed towels (bars/counters) = follow set arrangement (rolled, tri-folded). Stored towels (out of sight) = fold however.',
    sortOrder: 5,
  },
  {
    room: 'General',
    instruction: 'Blankets on beds must fully cover the duvet. Makeup removal signs coming for bathrooms.',
    sortOrder: 6,
  },
  // Bath Mats
  {
    room: 'General',
    instruction: 'BATH MATS (BBR — Dutch, Gable, Gambrel): Switching from thick to flat/thin style. Use up existing thick mats, retire old ones to basements. Reorder flat style when needed.',
    sortOrder: 7,
  },
  // Guest Checkout
  {
    room: 'General',
    instruction: 'GUEST CHECKOUT INSTRUCTIONS: Guests are TOLD to: Put everything back where found (remotes, blankets, games). Leave ALL used towels in showers. Strip sheets and pillowcases from beds they used — leave on bedroom floors. Do NOT remove protector covers (comforter, mattress, pillows). Baby items: wipe with Clorox wipes. Take trash to bin in driveway. Dirty dishes in dishwasher — START it. Remove all food/drinks. All lights off. Front door unlocked, keys on entryway bench. If they didn\'t do something on this list, let Alex know.',
    sortOrder: 8,
  },
  // Replacement Tracking
  {
    room: 'General',
    instruction: 'REPLACEMENT TRACKING: Note WHY each item is replaced — normal wear and tear vs. guest damage. Michelle needs this to charge the right party. Monthly reports: items in/out, cost, reason, which property.',
    sortOrder: 9,
  },
  // Scheduling
  {
    room: 'General',
    instruction: 'SCHEDULING: No same-day turns — 24-hour minimum between guests. Check Turno notes — Michelle puts important info there. Holiday blackouts: Thanksgiving, Christmas, New Year\'s + day before and after.',
    sortOrder: 10,
  },
]

// BBR-specific rules (for Dutch, Gable, Gambrel only)
const BBR_SPECIFIC_RULES = [
  {
    room: 'General',
    instruction: 'BBR RULE: Duvet covers and mattress pads — DO NOT send to Zoom. Drop at Michelle\'s house with a note saying which home. She washes and returns.',
    sortOrder: 50,
  },
]

// Stones-specific rules
const STONES_SPECIFIC_RULES = [
  {
    room: 'General',
    instruction: 'STONES SPECIFIC: This property has robes and slippers — unique to Stones. Replace after each guest. Standard BBR laundry rules do NOT apply for duvet drop-off — Stones is separate from Black Barn Ridge.',
    sortOrder: 50,
  },
]

// =================================================================
// MAIN EXECUTION
// =================================================================

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN MODE ===' : '=== APPLYING CHANGES ===')
  console.log('')

  // Find properties
  const properties = await prisma.property.findMany({
    select: { id: true, name: true },
  })

  const propMap = new Map(properties.map(p => [p.name.toLowerCase(), p]))

  // Find matching properties
  const gable = propMap.get('gable') || propMap.get('the gable')
  const dutch = propMap.get('dutch') || propMap.get('the dutch')
  const gambrel = propMap.get('gambrel') || propMap.get('bbr') || propMap.get('the gambrel') || propMap.get('black barn ridge')
  const stones = propMap.get('stones') || propMap.get('stones thoreau') || propMap.get('st')

  console.log('Properties found:')
  console.log(`  Gable:   ${gable ? `${gable.name} (${gable.id})` : 'NOT FOUND'}`)
  console.log(`  Dutch:   ${dutch ? `${dutch.name} (${dutch.id})` : 'NOT FOUND'}`)
  console.log(`  Gambrel: ${gambrel ? `${gambrel.name} (${gambrel.id})` : 'NOT FOUND'}`)
  console.log(`  Stones:  ${stones ? `${stones.name} (${stones.id})` : 'NOT FOUND'}`)
  console.log('')

  if (!gable && !dutch && !gambrel && !stones) {
    console.log('No matching properties found. Available properties:')
    properties.forEach(p => console.log(`  - "${p.name}" (${p.id})`))
    console.log('\nPlease ensure properties are created first.')
    return
  }

  // Load rooms for each property
  const loadResults: Array<{ property: string; rooms: number; instructions: number }> = []

  // Gable
  if (gable) {
    const result = await loadPropertyData(gable.id, gable.name, GABLE_DUTCH_ROOMS, [...OPERATIONAL_RULES, ...BBR_SPECIFIC_RULES])
    loadResults.push(result)
  }

  // Dutch (same layout as Gable)
  if (dutch) {
    const result = await loadPropertyData(dutch.id, dutch.name, GABLE_DUTCH_ROOMS, [...OPERATIONAL_RULES, ...BBR_SPECIFIC_RULES])
    loadResults.push(result)
  }

  // Gambrel
  if (gambrel) {
    const result = await loadPropertyData(gambrel.id, gambrel.name, GAMBREL_ROOMS, [...OPERATIONAL_RULES, ...BBR_SPECIFIC_RULES])
    loadResults.push(result)
  }

  // Stones
  if (stones) {
    const result = await loadPropertyData(stones.id, stones.name, STONES_ROOMS, [...OPERATIONAL_RULES, ...STONES_SPECIFIC_RULES])
    loadResults.push(result)
  }

  console.log('\n=== SUMMARY ===')
  for (const r of loadResults) {
    console.log(`  ${r.property}: ${r.rooms} rooms, ${r.instructions} instructions`)
  }

  if (DRY_RUN) {
    console.log('\n*** DRY RUN — no changes made. Run with --apply to execute. ***')
  }
}

async function loadPropertyData(
  propertyId: string,
  propertyName: string,
  roomDefs: RoomDef[],
  rules: Array<{ room: string; instruction: string; sortOrder: number }>
): Promise<{ property: string; rooms: number; instructions: number }> {
  console.log(`\n--- Loading: ${propertyName} ---`)

  let roomsCreated = 0
  let instructionsCreated = 0

  if (DRY_RUN) {
    console.log(`  Would create ${roomDefs.length} rooms:`)
    for (const room of roomDefs) {
      console.log(`    [${room.floor}] ${room.name} (${room.type})`)
    }
    console.log(`  Would create ${rules.length} operational instructions`)
    return { property: propertyName, rooms: roomDefs.length, instructions: rules.length }
  }

  // Wipe existing rooms for this property (fresh start)
  console.log(`[LINEN WIPE] Property: ${propertyId}, User: script, Timestamp: ${new Date().toISOString()}`)

  // Delete existing rooms (cascades to instructions, photos, linens linked to rooms)
  await prisma.room.deleteMany({
    where: { propertyId },
  })

  // Wipe legacy linen data
  await prisma.propertyLinenRequirement.deleteMany({
    where: { propertyId },
  })
  await prisma.propertyLinenInventory.deleteMany({
    where: { propertyId },
  })

  // Delete existing property-level instructions (General rules) so we can reload
  await prisma.propertyInstruction.deleteMany({
    where: { propertyId, roomId: null },
  })

  // Create rooms
  for (const roomDef of roomDefs) {
    await prisma.room.create({
      data: {
        propertyId,
        name: roomDef.name,
        type: roomDef.type,
        floor: roomDef.floor,
        beds: roomDef.beds ? (roomDef.beds as Prisma.InputJsonValue) : Prisma.JsonNull,
        pillowCount: roomDef.pillowCount ?? null,
        sheetSet: roomDef.sheetSet || null,
        servesRoom: roomDef.servesRoom || null,
        notes: roomDef.notes || null,
        sortOrder: roomDef.sortOrder,
      },
    })
    roomsCreated++
    console.log(`  Created room: [${roomDef.floor}] ${roomDef.name}`)
  }

  // Create operational rules as property-wide instructions
  for (const rule of rules) {
    await prisma.propertyInstruction.create({
      data: {
        propertyId,
        room: rule.room,
        instruction: rule.instruction,
        sortOrder: rule.sortOrder,
      },
    })
    instructionsCreated++
  }
  console.log(`  Created ${instructionsCreated} operational instructions`)

  return { property: propertyName, rooms: roomsCreated, instructions: instructionsCreated }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
