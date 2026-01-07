// prisma/seed.ts
// Run with: npx prisma db seed

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // ============================================================
  // ADMIN USER (for authentication)
  // ============================================================
  const hashedPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || 'changeme123',
    10
  );

  const user = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@cleaningrightnow.com' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@cleaningrightnow.com',
      password: hashedPassword,
      name: 'Admin',
      businessName: 'Cleaning Right Now',
      expensePercentage: 12,
    },
  });

  console.log('Created admin user:', user.email);

  // ============================================================
  // LINEN CATEGORIES
  // ============================================================
  const categories = await Promise.all([
    prisma.linenCategory.upsert({
      where: { name: 'Sheets' },
      update: {},
      create: { name: 'Sheets', sortOrder: 1 },
    }),
    prisma.linenCategory.upsert({
      where: { name: 'Bedding' },
      update: {},
      create: { name: 'Bedding', sortOrder: 2 },
    }),
    prisma.linenCategory.upsert({
      where: { name: 'Pillows' },
      update: {},
      create: { name: 'Pillows', sortOrder: 3 },
    }),
    prisma.linenCategory.upsert({
      where: { name: 'Towels' },
      update: {},
      create: { name: 'Towels', sortOrder: 4 },
    }),
  ]);

  const [sheets, bedding, pillows, towels] = categories;
  console.log('Created linen categories');

  // ============================================================
  // LINEN ITEMS (from spreadsheet)
  // ============================================================

  // Sheets
  const sheetItems = [
    { name: 'King Top', code: 'K-Top', unitCost: 13.33 },
    { name: 'King Bottom', code: 'K-Bottom', unitCost: 13.33 },
    { name: 'Queen Top', code: 'Q-Top', unitCost: 11.67 },
    { name: 'Queen Bottom', code: 'Q-Bottom', unitCost: 11.67 },
    { name: 'Full Top', code: 'F-Top', unitCost: 10.00 },
    { name: 'Full Bottom', code: 'F-Bottom', unitCost: 10.00 },
    { name: 'Twin Top', code: 'T-Top', unitCost: 3.33 },
    { name: 'Twin Bottom', code: 'T-Bottom', unitCost: 3.33 },
  ];

  // Bedding
  const beddingItems = [
    { name: 'King Duvet Cover', code: 'K-Duvet', unitCost: 40.00 },
    { name: 'Full/Queen Duvet Cover', code: 'FQ-Duvet', unitCost: 35.00 },
    { name: 'Twin Duvet Cover', code: 'T-Duvet', unitCost: 30.00 },
    { name: 'King Insert (Comforter)', code: 'K-Insert', unitCost: 99.99 },
    { name: 'Full/Queen Insert (Comforter)', code: 'FQ-Insert', unitCost: 89.99 },
    { name: 'Twin Insert (Comforter)', code: 'T-Insert', unitCost: 69.99 },
    { name: 'King Mattress Pad', code: 'K-MattPad', unitCost: 45.00 },
    { name: 'Queen Mattress Pad', code: 'Q-MattPad', unitCost: 40.00 },
    { name: 'Full Mattress Pad', code: 'F-MattPad', unitCost: 35.00 },
    { name: 'Twin Mattress Pad', code: 'T-MattPad', unitCost: 30.00 },
    { name: 'King Blanket', code: 'K-Blanket', unitCost: 50.00 },
    { name: 'Queen Blanket', code: 'Q-Blanket', unitCost: 45.00 },
  ];

  // Pillows
  const pillowItems = [
    { name: 'Standard Pillow Case', code: 'Std-PCase', unitCost: 6.67 },
    { name: 'King Pillow Case', code: 'K-PCase', unitCost: 8.33 },
    { name: 'Standard Pillow Protector', code: 'Std-PProt', unitCost: 5.00 },
    { name: 'King Pillow Protector', code: 'K-PProt', unitCost: 6.00 },
    { name: 'Standard Pillow (Downluxe)', code: 'Std-Pillow', unitCost: 19.99 },
    { name: 'King Pillow (Downluxe)', code: 'K-Pillow', unitCost: 24.99 },
  ];

  // Towels
  const towelItems = [
    { name: 'Bath Towel (Big)', code: 'Bath-Big', unitCost: 6.90 },
    { name: 'Hand Towel', code: 'Hand', unitCost: 2.10 },
    { name: 'White Wash Cloth', code: 'White-Wash', unitCost: 0.85 },
    { name: 'Black Wash Cloth', code: 'Black-Wash', unitCost: 0.85 },
    { name: 'Bath Mat/Rug', code: 'Bath-Mat', unitCost: 4.50 },
    { name: 'Beach Towel', code: 'Beach', unitCost: 8.00 },
    { name: 'Kitchen Towel', code: 'Kitchen', unitCost: 1.40 },
    { name: 'Makeup Towel (Black)', code: 'Makeup', unitCost: 3.00 },
  ];

  // Insert all items
  for (const item of sheetItems) {
    await prisma.linenItem.upsert({
      where: { code: item.code },
      update: { unitCost: item.unitCost },
      create: { ...item, categoryId: sheets.id },
    });
  }

  for (const item of beddingItems) {
    await prisma.linenItem.upsert({
      where: { code: item.code },
      update: { unitCost: item.unitCost },
      create: { ...item, categoryId: bedding.id },
    });
  }

  for (const item of pillowItems) {
    await prisma.linenItem.upsert({
      where: { code: item.code },
      update: { unitCost: item.unitCost },
      create: { ...item, categoryId: pillows.id },
    });
  }

  for (const item of towelItems) {
    await prisma.linenItem.upsert({
      where: { code: item.code },
      update: { unitCost: item.unitCost },
      create: { ...item, categoryId: towels.id },
    });
  }

  console.log('Created linen items');

  // ============================================================
  // VENDORS
  // ============================================================
  const vendors = [
    { name: 'Palmetto', website: null, notes: 'Imperial Line towels' },
    { name: 'Costco', website: 'https://costco.com', notes: 'Kirkland sheets, Hotel Grand bedding' },
    { name: 'Amazon', website: 'https://amazon.com', notes: 'Arkwright makeup towels, Downluxe pillows' },
    { name: 'Target', website: 'https://target.com', notes: 'Room Essentials microfiber sheets' },
    { name: 'Oxford', website: null, notes: 'Economy kitchen towels' },
  ];

  for (const vendor of vendors) {
    await prisma.vendor.upsert({
      where: { name: vendor.name },
      update: {},
      create: vendor,
    });
  }

  console.log('Created vendors');

  // ============================================================
  // CUSTOM BILLING ITEMS (presets)
  // ============================================================
  const billingItems = [
    { name: 'Turnover Cleaning', category: 'service' },
    { name: 'Deep Clean', category: 'service' },
    { name: 'Laundry Service', category: 'service' },
    { name: 'Emergency/After-Hours', category: 'service' },
    { name: 'Cleaning Supplies', category: 'supplies' },
    { name: 'Linen Replacement', category: 'supplies' },
    { name: 'Mileage', category: 'expense' },
    { name: 'Miscellaneous', category: 'other' },
  ];

  for (const item of billingItems) {
    await prisma.customBillingItem.upsert({
      where: { id: item.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: { id: item.name.toLowerCase().replace(/\s+/g, '-'), ...item },
    });
  }

  console.log('Created custom billing items');

  // ============================================================
  // ADMIN TEAM MEMBER
  // ============================================================
  await prisma.teamMember.upsert({
    where: { email: 'admin@cleaningrightnow.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@cleaningrightnow.com',
      role: 'admin',
      isActive: true,
    },
  });

  console.log('Created admin team member');

  console.log('Seed data inserted successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
