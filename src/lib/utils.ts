import { type ClassValue, clsx } from 'clsx'
import { PrismaClient } from '@prisma/client'

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ')
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function calculateJobPayments(rate: number, expensePercent: number, assignmentCount: number) {
  const expenseAmount = rate * (expensePercent / 100)
  const teamTotal = rate - expenseAmount
  const perPerson = assignmentCount > 0 ? teamTotal / assignmentCount : 0

  return {
    expense: expenseAmount,
    teamTotal: teamTotal,
    perPerson: perPerson,
  }
}

export async function generateInvoiceNumber(prisma: PrismaClient): Promise<string> {
  const year = new Date().getFullYear()
  const lastInvoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: `INV-${year}-` } },
    orderBy: { invoiceNumber: 'desc' },
  })

  let sequence = 1
  if (lastInvoice) {
    const lastSeq = parseInt(lastInvoice.invoiceNumber.split('-')[2])
    sequence = lastSeq + 1
  }

  return `INV-${year}-${sequence.toString().padStart(3, '0')}`
}
