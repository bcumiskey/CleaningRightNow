import { type ClassValue, clsx } from 'clsx'
import { parseISO } from 'date-fns'

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
  // Use parseISO for strings to avoid timezone issues
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatTime(time: string): string {
  return time
}

export function calculateJobPayments(rate: number, expensePercent: number, assignmentCount: number) {
  const expenseAmount = Math.round(rate * (expensePercent / 100) * 100) / 100
  const teamTotal = Math.round((rate - expenseAmount) * 100) / 100
  const perPerson = assignmentCount > 0 ? Math.round((teamTotal / assignmentCount) * 100) / 100 : 0

  return {
    expense: expenseAmount,
    teamTotal: teamTotal,
    perPerson: perPerson,
  }
}

export async function generateInvoiceNumber(prisma: any): Promise<string> {
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
