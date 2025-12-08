import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create admin user
  const hashedPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || 'changeme123',
    10
  )

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
  })

  console.log('Created admin user:', user.email)

  // Create default services
  const defaultServices = [
    { name: 'Standard Clean', basePrice: 100, description: 'Regular cleaning service' },
    { name: 'Deep Clean', basePrice: 200, description: 'Thorough deep cleaning' },
    { name: 'Laundry', basePrice: 50, description: 'Laundry and linen service' },
    { name: 'Window Cleaning', basePrice: 75, description: 'Interior and exterior windows' },
  ]

  for (const service of defaultServices) {
    await prisma.service.upsert({
      where: { id: service.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        name: service.name,
        description: service.description,
        basePrice: service.basePrice,
        active: true,
      },
    })
  }

  console.log('Created default services')

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
