import { type ClassValue, clsx } from 'clsx'

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

export function formatTime(time: string): string {
  return time
}

/**
 * Parse a date string (ISO or YYYY-MM-DD) to a local Date object at noon.
 * This avoids timezone issues where dates shift between days.
 */
export function parseLocalDate(dateStr: string): Date {
  // Extract just the date portion (YYYY-MM-DD) regardless of format
  const datePart = dateStr.substring(0, 10)
  const [year, month, day] = datePart.split('-').map(Number)
  // Create date at noon local time to avoid any day boundary issues
  return new Date(year, month - 1, day, 12, 0, 0)
}

/**
 * Get the YYYY-MM-DD string from any date input
 */
export function getDateKey(date: Date | string): string {
  if (typeof date === 'string') {
    return date.substring(0, 10)
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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
