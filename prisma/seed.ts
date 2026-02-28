import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')
  console.log('Seeding linen catalog only - no mock data')

  // NOTE: We do NOT delete users, team members, properties, jobs, or invoices
  // This seed only ensures linen catalog data exists

  // Categories
  const sheets = await prisma.linenCategory.upsert({
    where: { name: 'Sheets' },
    update: {},
    create: { name: 'Sheets', sortOrder: 1 },
  })
  const bedding = await prisma.linenCategory.upsert({
    where: { name: 'Bedding' },
    update: {},
    create: { name: 'Bedding', sortOrder: 2 },
  })
  const pillows = await prisma.linenCategory.upsert({
    where: { name: 'Pillows' },
    update: {},
    create: { name: 'Pillows', sortOrder: 3 },
  })
  const towels = await prisma.linenCategory.upsert({
    where: { name: 'Towels' },
    update: {},
    create: { name: 'Towels', sortOrder: 4 },
  })
  console.log('Created linen categories')

  // Linen Items from owner's spreadsheet
  const items = [
    // Sheets (sets = fitted + flat + pillowcases)
    { name: 'King Set', code: 'K-Set', unitCost: 26.66, categoryId: sheets.id },
    { name: 'Queen Set', code: 'Q-Set', unitCost: 23.34, categoryId: sheets.id },
    { name: 'Full Set', code: 'F-Set', unitCost: 20.00, categoryId: sheets.id },
    { name: 'Twin Set', code: 'T-Set', unitCost: 6.66, categoryId: sheets.id },
    // Bedding
    { name: 'King Duvet Cover', code: 'K-Duvet', unitCost: 40.00, categoryId: bedding.id },
    { name: 'Full/Queen Duvet Cover', code: 'FQ-Duvet', unitCost: 35.00, categoryId: bedding.id },
    { name: 'Twin Duvet Cover', code: 'T-Duvet', unitCost: 30.00, categoryId: bedding.id },
    { name: 'King Insert (Comforter)', code: 'K-Insert', unitCost: 99.99, categoryId: bedding.id },
    { name: 'Full/Queen Insert', code: 'FQ-Insert', unitCost: 89.99, categoryId: bedding.id },
    { name: 'Twin Insert', code: 'T-Insert', unitCost: 69.99, categoryId: bedding.id },
    { name: 'King Mattress Pad', code: 'K-MattPad', unitCost: 45.00, categoryId: bedding.id },
    { name: 'Queen Mattress Pad', code: 'Q-MattPad', unitCost: 40.00, categoryId: bedding.id },
    { name: 'Full Mattress Pad', code: 'F-MattPad', unitCost: 35.00, categoryId: bedding.id },
    { name: 'Twin Mattress Pad', code: 'T-MattPad', unitCost: 30.00, categoryId: bedding.id },
    { name: 'King Blanket', code: 'K-Blanket', unitCost: 50.00, categoryId: bedding.id },
    { name: 'Queen Blanket', code: 'Q-Blanket', unitCost: 45.00, categoryId: bedding.id },
    // Pillows
    { name: 'Standard Pillow Case', code: 'Std-PCase', unitCost: 6.67, categoryId: pillows.id },
    { name: 'King Pillow Case', code: 'K-PCase', unitCost: 8.33, categoryId: pillows.id },
    { name: 'Standard Pillow Protector', code: 'Std-PProt', unitCost: 5.00, categoryId: pillows.id },
    { name: 'King Pillow Protector', code: 'K-PProt', unitCost: 6.00, categoryId: pillows.id },
    { name: 'Standard Pillow', code: 'Std-Pillow', unitCost: 19.99, categoryId: pillows.id },
    { name: 'King Pillow', code: 'K-Pillow', unitCost: 24.99, categoryId: pillows.id },
    // Towels
    { name: 'Bath Towel (Big)', code: 'Bath-Big', unitCost: 6.90, categoryId: towels.id },
    { name: 'Hand Towel', code: 'Hand', unitCost: 2.10, categoryId: towels.id },
    { name: 'White Wash Cloth', code: 'White-Wash', unitCost: 0.85, categoryId: towels.id },
    { name: 'Black Wash Cloth', code: 'Black-Wash', unitCost: 0.85, categoryId: towels.id },
    { name: 'Bath Mat', code: 'Bath-Mat', unitCost: 4.50, categoryId: towels.id },
    { name: 'Beach Towel', code: 'Beach', unitCost: 8.00, categoryId: towels.id },
    { name: 'Kitchen Towel', code: 'Kitchen', unitCost: 1.40, categoryId: towels.id },
    { name: 'Makeup Towel (Black)', code: 'Makeup', unitCost: 3.00, categoryId: towels.id },
  ]

  for (const item of items) {
    await prisma.linenItem.upsert({
      where: { code: item.code },
      update: { name: item.name, unitCost: item.unitCost },
      create: item,
    })
  }
  console.log('Created linen items')

  // Vendors
  const vendors = [
    { name: 'Palmetto', notes: 'Imperial Line - bath/hand towels' },
    { name: 'Costco', website: 'https://costco.com', notes: 'Kirkland sheets' },
    { name: 'Amazon', website: 'https://amazon.com', notes: 'Downluxe pillows, Arkwright makeup towels' },
    { name: 'Target', website: 'https://target.com', notes: 'Room Essentials twin sheets' },
    { name: 'Oxford', notes: 'Economy kitchen towels' },
  ]

  for (const v of vendors) {
    await prisma.vendor.upsert({
      where: { name: v.name },
      update: {},
      create: v,
    })
  }
  console.log('Created vendors')

  // Billing presets
  const billingItems = [
    { name: 'Turnover Cleaning', category: 'service' },
    { name: 'Deep Clean', category: 'service' },
    { name: 'Laundry Service', category: 'service' },
    { name: 'Emergency/After-Hours', category: 'service' },
    { name: 'Cleaning Supplies', category: 'supplies' },
    { name: 'Linen Replacement', category: 'supplies' },
    { name: 'Mileage', category: 'expense' },
    { name: 'Miscellaneous', category: 'other' },
  ]

  for (const b of billingItems) {
    await prisma.customBillingItem.upsert({
      where: { name: b.name },
      update: {},
      create: b,
    })
  }
  console.log('Created custom billing items')

  console.log('')
  console.log('Seed completed successfully!')
  console.log('- Linen categories: 4')
  console.log('- Linen items:', items.length)
  console.log('- Vendors:', vendors.length)
  console.log('- Billing presets:', billingItems.length)
  console.log('')
  console.log('NOTE: No users, properties, jobs, or team members were created.')
  console.log('Use /register to create your admin account.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
