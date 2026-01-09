import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Debug endpoint to check database connectivity
// Access at /api/debug
export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    tests: {},
  }

  // Test 1: Basic Prisma connection
  try {
    await prisma.$queryRaw`SELECT 1 as test`
    results.tests = { ...results.tests as object, connection: 'OK' }
  } catch (e) {
    results.tests = { ...results.tests as object, connection: `FAILED: ${e}` }
  }

  // Test 2: List all tables
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    ` as Array<{ table_name: string }>
    results.tests = { ...results.tests as object, tables: tables.map(t => t.table_name) }
  } catch (e) {
    results.tests = { ...results.tests as object, tables: `FAILED: ${e}` }
  }

  // Test 3: Count properties using raw SQL
  try {
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "Property"
    ` as Array<{ count: bigint }>
    results.tests = { ...results.tests as object, propertyCount: Number(count[0]?.count || 0) }
  } catch (e) {
    results.tests = { ...results.tests as object, propertyCount: `FAILED: ${e}` }
  }

  // Test 4: Get first property using raw SQL
  try {
    const properties = await prisma.$queryRaw`
      SELECT id, name FROM "Property" LIMIT 1
    ` as Array<{ id: string; name: string }>
    results.tests = { ...results.tests as object, firstProperty: properties[0] || null }
  } catch (e) {
    results.tests = { ...results.tests as object, firstProperty: `FAILED: ${e}` }
  }

  // Test 5: Try Prisma ORM query
  try {
    const count = await prisma.property.count()
    results.tests = { ...results.tests as object, prismaPropertyCount: count }
  } catch (e) {
    results.tests = { ...results.tests as object, prismaPropertyCount: `FAILED: ${e}` }
  }

  // Test 6: Try Prisma ORM findMany
  try {
    const properties = await prisma.property.findMany({ take: 1, select: { id: true, name: true } })
    results.tests = { ...results.tests as object, prismaFirstProperty: properties[0] || null }
  } catch (e) {
    results.tests = { ...results.tests as object, prismaFirstProperty: `FAILED: ${e}` }
  }

  return NextResponse.json(results)
}
