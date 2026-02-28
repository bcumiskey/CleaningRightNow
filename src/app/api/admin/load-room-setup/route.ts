import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// POST /api/admin/load-room-setup
// Wipes all old room/linen data and loads fresh room setup for Gable, Dutch, Gambrel, Stones.
// Admin only. Hit this endpoint after deploy to load the data.

interface RoomDef {
  name: string
  type: string
  floor: string
  beds?: Array<{ type: string; count: number }>
  pillowCount?: number
  sheetSet?: string
  servesRoom?: string
  notes?: string
  sortOrder: number
}

// ============================================================
// GABLE & DUTCH — identical layout
// ============================================================
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
  // Kitchen
  {
    name: 'Kitchen',
    type: 'kitchen',
    floor: 'Main Floor',
    notes: `Kitchen Towels: 6
Paper Towels: 2 full rolls
Trash Bags: New bag in can + extras under sink
Sponge: Always a new sponge`,
    sortOrder: 6,
  },
  // Upstairs
  {
    name: 'King Bedroom (Upstairs)',
    type: 'bedroom',
    floor: 'Upstairs',
    beds: [{ type: 'King', count: 1 }, { type: 'Crib', count: 1 }],
    sheetSet: 'King Set',
    notes: 'Also has a crib with crib sheet',
    sortOrder: 7,
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
    sortOrder: 8,
  },
  // Basement
  {
    name: 'King Bedroom (Basement)',
    type: 'bedroom',
    floor: 'Basement',
    beds: [{ type: 'King', count: 1 }],
    sheetSet: 'King Set',
    notes: 'Closet: 2 of each towel type',
    sortOrder: 9,
  },
  {
    name: 'Bunk Room',
    type: 'bedroom',
    floor: 'Basement',
    beds: [{ type: 'Twin', count: 2 }, { type: 'Queen', count: 2 }],
    notes: `Sheets: 2 Twin Sets + 2 Queen Sets
Closet: 2 of each towel type`,
    sortOrder: 10,
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
    sortOrder: 11,
  },
  // Garage
  {
    name: 'Garage',
    type: 'outdoor',
    floor: 'Garage',
    notes: `Beach Towels: 14
Cleaning Instructions: Wipe down tables, push chairs in, pick up all toys, vacuum floor (use the vacuum that stays in the garage), make sure poker table is clean`,
    sortOrder: 12,
  },
]

// ============================================================
// GAMBREL (BBR)
// ============================================================
const GAMBREL_ROOMS: RoomDef[] = [
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

// ============================================================
// STONES THOREAU
// ============================================================
const STONES_ROOMS: RoomDef[] = [
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

// ============================================================
// OPERATIONAL RULES
// ============================================================
const OPERATIONAL_RULES = [
  { room: 'General', instruction: 'LAUNDRY — GOES TO DRY CLEANER (ZOOM): White bath towels, white bath mats, sheets. Nothing else unless it\'s a one-off stain.', sortOrder: 1 },
  { room: 'General', instruction: 'LAUNDRY — ON PROPERTY EVERY TURN: Beach towels, kitchen towels, black makeup washcloths, colored blankets on beds, throw blankets. Start laundry when the clean begins. 24-hour gap between guests. If not done when clean ends, tell Michelle and she\'ll finish it.', sortOrder: 2 },
  { room: 'General', instruction: 'DUVET COVERS & MATTRESS PADS (BBR ONLY — Dutch, Gable, Gambrel): Do NOT send to Zoom. Spot treat stains on property. Drop at Michelle\'s house — note which home each item belongs to. She washes and returns them. If Michelle is out of town, they can go to Zoom. This does NOT apply to Cottage or Stones.', sortOrder: 3 },
  { room: 'General', instruction: 'Only wash what is actually dirty. Treat stains on property before sending anything out. Don\'t overload bathrooms with towels — extras go in closets.', sortOrder: 4 },
  { room: 'General', instruction: 'TOWEL DISPLAY: Fewer towels in bathrooms — just what\'s needed. Extra towels in central locations (closets, laundry room, under sinks). Displayed towels (bars/counters) = follow set arrangement (rolled, tri-folded). Stored towels (out of sight) = fold however.', sortOrder: 5 },
  { room: 'General', instruction: 'Blankets on beds must fully cover the duvet. Makeup removal signs coming for bathrooms.', sortOrder: 6 },
  { room: 'General', instruction: 'BATH MATS (BBR — Dutch, Gable, Gambrel): Switching from thick to flat/thin style. Use up existing thick mats, retire old ones to basements. Reorder flat style when needed.', sortOrder: 7 },
  { room: 'General', instruction: 'GUEST CHECKOUT INSTRUCTIONS: Guests are TOLD to: Put everything back where found (remotes, blankets, games). Leave ALL used towels in showers. Strip sheets and pillowcases from beds they used — leave on bedroom floors. Do NOT remove protector covers (comforter, mattress, pillows). Baby items: wipe with Clorox wipes. Take trash to bin in driveway. Dirty dishes in dishwasher — START it. Remove all food/drinks. All lights off. Front door unlocked, keys on entryway bench. If they didn\'t do something on this list, let Alex know.', sortOrder: 8 },
  { room: 'General', instruction: 'REPLACEMENT TRACKING: Note WHY each item is replaced — normal wear and tear vs. guest damage. Michelle needs this to charge the right party. Monthly reports: items in/out, cost, reason, which property.', sortOrder: 9 },
  { room: 'General', instruction: 'SCHEDULING: No same-day turns — 24-hour minimum between guests. Check Turno notes — Michelle puts important info there. Holiday blackouts: Thanksgiving, Christmas, New Year\'s + day before and after.', sortOrder: 10 },
]

const BBR_SPECIFIC_RULES = [
  { room: 'General', instruction: 'BBR RULE: Duvet covers and mattress pads — DO NOT send to Zoom. Drop at Michelle\'s house with a note saying which home. She washes and returns.', sortOrder: 50 },
]

const STONES_SPECIFIC_RULES = [
  { room: 'General', instruction: 'STONES SPECIFIC: This property has robes and slippers — unique to Stones. Replace after each guest. Standard BBR laundry rules do NOT apply for duvet drop-off — Stones is separate from Black Barn Ridge.', sortOrder: 50 },
]

// ============================================================
// Property name matching
// ============================================================
const PROPERTY_ALIASES: Record<string, string[]> = {
  gable: ['gable', 'the gable'],
  dutch: ['dutch', 'the dutch'],
  gambrel: ['gambrel', 'bbr', 'the gambrel', 'black barn ridge'],
  stones: ['stones', 'stones thoreau', 'st'],
}

// ============================================================
// MAIN HANDLER
// ============================================================

async function loadPropertyData(
  propertyId: string,
  propertyName: string,
  roomDefs: RoomDef[],
  rules: Array<{ room: string; instruction: string; sortOrder: number }>
) {
  // Wipe existing rooms (cascades to room-linked instructions, photos, linens)
  await prisma.room.deleteMany({ where: { propertyId } })

  // Wipe legacy linen data
  await prisma.propertyLinenRequirement.deleteMany({ where: { propertyId } })
  await prisma.propertyLinenInventory.deleteMany({ where: { propertyId } })

  // Wipe property-level instructions (General rules) so we can reload
  await prisma.propertyInstruction.deleteMany({ where: { propertyId, roomId: null } })

  let roomsCreated = 0
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
  }

  let instructionsCreated = 0
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

  return { property: propertyName, rooms: roomsCreated, instructions: instructionsCreated }
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

    // Clean up deprecated linen items globally
    // User explicitly wants these removed: pillow protectors, mattress pads, duvets/comforters,
    // sheet splitting (top/bottom), all per-item inventory
    const deprecatedCodes = [
      'Std-PProt', 'K-PProt',                          // Pillow protectors
      'K-MattPad', 'Q-MattPad', 'F-MattPad', 'T-MattPad',  // Mattress pads
      'K-Duvet', 'FQ-Duvet', 'T-Duvet',                // Duvet covers
      'K-Insert', 'FQ-Insert', 'T-Insert',              // Comforter inserts
      'K-Top', 'K-Bottom', 'Q-Top', 'Q-Bottom',        // Split sheets (top/bottom)
      'F-Top', 'F-Bottom', 'T-Top', 'T-Bottom',
    ]
    const deprecatedItems = await prisma.linenItem.findMany({
      where: { code: { in: deprecatedCodes } },
      select: { id: true },
    })
    const deprecatedIds = deprecatedItems.map(i => i.id)
    if (deprecatedIds.length > 0) {
      // Remove any requirements/inventory referencing deprecated items
      await prisma.propertyLinenRequirement.deleteMany({
        where: { linenItemId: { in: deprecatedIds } },
      })
      await prisma.propertyLinenInventory.deleteMany({
        where: { linenItemId: { in: deprecatedIds } },
      })
      // Delete the deprecated items themselves
      await prisma.linenItem.deleteMany({
        where: { id: { in: deprecatedIds } },
      })
    }

    // Also clean up empty categories
    const categoriesWithItems = await prisma.linenCategory.findMany({
      include: { _count: { select: { items: true } } },
    })
    for (const cat of categoriesWithItems) {
      if (cat._count.items === 0 && ['Bedding', 'Pillows'].includes(cat.name)) {
        await prisma.linenCategory.delete({ where: { id: cat.id } })
      }
    }

    // Find all properties
    const properties = await prisma.property.findMany({
      select: { id: true, name: true },
    })

    const propMap = new Map(properties.map(p => [p.name.toLowerCase().trim(), p]))

    // Match properties by aliases
    const findProp = (key: string) => {
      const aliases = PROPERTY_ALIASES[key] || []
      for (const alias of aliases) {
        const match = propMap.get(alias)
        if (match) return match
      }
      return null
    }

    const gable = findProp('gable')
    const dutch = findProp('dutch')
    const gambrel = findProp('gambrel')
    const stones = findProp('stones')

    const results: Array<{ property: string; rooms: number; instructions: number }> = []
    const notFound: string[] = []

    if (gable) {
      results.push(await loadPropertyData(gable.id, gable.name, GABLE_DUTCH_ROOMS, [...OPERATIONAL_RULES, ...BBR_SPECIFIC_RULES]))
    } else {
      notFound.push('Gable')
    }

    if (dutch) {
      results.push(await loadPropertyData(dutch.id, dutch.name, GABLE_DUTCH_ROOMS, [...OPERATIONAL_RULES, ...BBR_SPECIFIC_RULES]))
    } else {
      notFound.push('Dutch')
    }

    if (gambrel) {
      results.push(await loadPropertyData(gambrel.id, gambrel.name, GAMBREL_ROOMS, [...OPERATIONAL_RULES, ...BBR_SPECIFIC_RULES]))
    } else {
      notFound.push('Gambrel')
    }

    if (stones) {
      results.push(await loadPropertyData(stones.id, stones.name, STONES_ROOMS, [...OPERATIONAL_RULES, ...STONES_SPECIFIC_RULES]))
    } else {
      notFound.push('Stones')
    }

    return NextResponse.json({
      success: true,
      message: `Loaded room setup for ${results.length} properties`,
      results,
      notFound: notFound.length > 0 ? notFound : undefined,
      availableProperties: properties.map(p => p.name),
    })
  } catch (error) {
    console.error('Load room setup error:', error)
    return NextResponse.json(
      { error: 'Failed to load room setup', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
