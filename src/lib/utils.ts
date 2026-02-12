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
  const expenseAmount = rate * (expensePercent / 100)
  const teamTotal = rate - expenseAmount
  const perPerson = assignmentCount > 0 ? teamTotal / assignmentCount : 0

  return {
    expense: expenseAmount,
    teamTotal: teamTotal,
    perPerson: perPerson,
  }
}

// Clean property names by removing "@BBR" suffix (except for "The Gambrel @ BBR")
export function cleanPropertyName(name: string): string {
  if (!name) return name
  // Keep "The Gambrel @ BBR" as-is
  if (name.toLowerCase().includes('gambrel')) return name
  // Remove @BBR or @ BBR from the end of other property names
  return name.replace(/\s*@\s*BBR\s*$/i, '').trim()
}

// Property color palette - 10 distinct, visually appealing colors
const PROPERTY_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700', hex: '#3B82F6' },
  { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700', hex: '#10B981' },
  { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700', hex: '#F97316' },
  { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700', hex: '#8B5CF6' },
  { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-700', hex: '#14B8A6' },
  { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-700', hex: '#F43F5E' },
  { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-700', hex: '#EC4899' },
  { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', hex: '#F59E0B' },
  { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-700', hex: '#6366F1' },
  { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-700', hex: '#06B6D4' },
] as const

export type PropertyColor = typeof PROPERTY_COLORS[number]

// Get a consistent color for a property based on its ID (deterministic)
export function getPropertyColor(propertyId: string): PropertyColor {
  // Simple hash function to get a consistent index from the property ID
  let hash = 0
  for (let i = 0; i < propertyId.length; i++) {
    const char = propertyId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  const index = Math.abs(hash) % PROPERTY_COLORS.length
  return PROPERTY_COLORS[index]
}

// Get just the hex color for a property (useful for calendars, charts)
export function getPropertyHexColor(propertyId: string): string {
  return getPropertyColor(propertyId).hex
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
