// Local type definitions for the Cleaning Right Now app
// These match the Prisma schema but are defined locally to avoid generation issues

// ============================================================
// BASE TYPES
// ============================================================

export interface User {
  id: string
  email: string
  password: string
  name?: string | null
  businessName?: string | null
  businessPhone?: string | null
  businessEmail?: string | null
  businessAddress?: string | null
  expensePercentage: number
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  id: string
  sessionToken: string
  userId: string
  expires: Date
}

export interface Property {
  id: string
  name: string
  address: string
  ownerName: string
  ownerEmail?: string | null
  ownerPhone?: string | null
  baseRate: number
  billingType: string
  monthlyBillingDay?: number | null
  autoSendInvoice: boolean
  calendarSource?: string | null
  icalUrl?: string | null
  accessCode?: string | null
  accessNotes?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface TeamMember {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  role: string
  isActive: boolean
  passwordHash?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Job {
  id: string
  date: Date
  time?: string | null
  propertyId: string
  rate: number
  expensePercent: number
  completed: boolean
  completedAt?: Date | null
  clientPaid: boolean
  clientPaidAt?: Date | null
  teamPaid: boolean
  teamPaidAt?: Date | null
  source: string
  externalId?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface JobAssignment {
  id: string
  jobId: string
  teamMemberId: string
  amountEarned?: number | null
}

export interface Invoice {
  id: string
  invoiceNumber: string
  propertyId: string
  type: string
  billingPeriod?: string | null
  invoiceDate: Date
  dueDate?: Date | null
  paymentTerms: string
  subtotal: number
  discount: number
  total: number
  status: string
  sentAt?: Date | null
  paidAt?: Date | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface InvoiceLineItem {
  id: string
  invoiceId: string
  date?: Date | null
  description: string
  amount: number
  jobId?: string | null
  itemType: string
  sortOrder: number
  createdAt: Date
}

export interface CustomBillingItem {
  id: string
  name: string
  category: string
  defaultAmount?: number | null
  createdAt: Date
}

export interface PropertyNote {
  id: string
  propertyId: string
  type: string
  content: string
  status: string
  resolvedAt?: Date | null
  addedById: string
  createdAt: Date
  updatedAt: Date
}

export interface PropertyInstruction {
  id: string
  propertyId: string
  instruction: string
  sortOrder: number
  createdAt: Date
}

export interface PropertyPhoto {
  id: string
  propertyId: string
  room: string
  caption?: string | null
  url: string
  addedById: string
  sortOrder: number
  createdAt: Date
}

export interface LinenCategory {
  id: string
  name: string
  sortOrder: number
}

export interface LinenItem {
  id: string
  name: string
  code: string
  unitCost: number
  categoryId: string
  createdAt: Date
  updatedAt: Date
}

export interface PropertyLinenRequirement {
  id: string
  propertyId: string
  linenItemId: string
  perFlip: number
}

export interface PropertyLinenInventory {
  id: string
  propertyId: string
  linenItemId: string
  onHand: number
  updatedAt: Date
}

export interface Vendor {
  id: string
  name: string
  website?: string | null
  notes?: string | null
  createdAt: Date
}

export interface VendorProduct {
  id: string
  vendorId: string
  linenItemId: string
  productName: string
  packSize: number
  costPerPack: number
  link?: string | null
  notes?: string | null
  updatedAt: Date
}

export interface ReplacementLog {
  id: string
  date: Date
  propertyId: string
  linenItemId: string
  quantity: number
  unitCost: number
  totalCost: number
  reason: string
  replaced: boolean
  replacedAt?: Date | null
  notes?: string | null
  createdAt: Date
}

export interface Supply {
  id: string
  name: string
  category: string
  unit: string
  minStock: number
  createdAt: Date
  updatedAt: Date
}

export interface PropertySupply {
  id: string
  propertyId: string
  supplyId: string
  currentStock: number
  updatedAt: Date
}

export interface SupplyRestock {
  id: string
  supplyId: string
  quantity: number
  cost: number
  notes?: string | null
  createdAt: Date
}

export interface SupplyUsage {
  id: string
  propertyId: string
  supplyId: string
  quantity: number
  jobId?: string | null
  createdAt: Date
}

export interface LaundryProvider {
  id: string
  name: string
  contactInfo?: string | null
  createdAt: Date
}

export interface LaundryRecord {
  id: string
  providerId: string
  propertyId: string
  date: Date
  status: string
  notes?: string | null
  createdAt: Date
}

export interface AuditLog {
  id: string
  userId?: string | null
  action: string
  entityType: string
  entityId: string
  oldValues?: unknown
  newValues?: unknown
  description?: string | null
  ipAddress?: string | null
  createdAt: Date
}

export interface Setting {
  id: string
  key: string
  value: string
  createdAt: Date
  updatedAt: Date
}

// String enum-like types for consistency
export type LinenCondition = 'new' | 'good' | 'fair' | 'poor' | 'damaged'
export type LaundryStatus = 'pending' | 'in_progress' | 'completed'
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'PAID' | 'SEND' | 'COMPLETE' | 'PAY'

// ============================================================
// EXTENDED TYPES WITH RELATIONS
// ============================================================

export interface JobWithRelations {
  id: string
  propertyId: string
  property: {
    id: string
    name: string
    address: string
    ownerName: string
    ownerEmail?: string | null
    ownerPhone?: string | null
  }
  date: Date
  time?: string | null
  source: 'manual' | 'turno' | 'google'
  completed: boolean
  completedAt?: Date | null
  rate: number
  expensePercent: number
  notes?: string | null
  clientPaid: boolean
  teamPaid: boolean
  assignments: Array<{
    id: string
    teamMember: {
      id: string
      name: string
    }
  }>
  createdAt: Date
  updatedAt: Date
}

export interface PropertyWithRelations {
  id: string
  name: string
  address: string
  squareFootage?: number | null
  baseRate: number
  billingType: 'per_job' | 'monthly'
  ownerName: string
  ownerEmail?: string | null
  ownerPhone?: string | null
  notes?: string | null
  active: boolean
  photos?: Array<{
    id: string
    url: string
    description?: string | null
    category?: string | null
  }>
  instructions?: Array<{
    id: string
    title: string
    content: string
    category?: string | null
    sortOrder: number
  }>
  linenRequirements?: Array<{
    id: string
    linenItem: {
      id: string
      name: string
      code: string
    }
    perFlip: number
  }>
  linenInventory?: Array<{
    id: string
    linenItem: {
      id: string
      name: string
      code: string
    }
    onHand: number
  }>
  _count?: {
    jobs: number
    notes: number
    photos: number
    instructions: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface TeamMemberWithRelations {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  role: 'admin' | 'worker'
  active: boolean
  balance: number
  assignments?: Array<{
    id: string
    job: {
      id: string
      date: Date
      property: {
        name: string
      }
    }
  }>
  payments?: Array<{
    id: string
    amount: number
    method?: string | null
    paidAt: Date
  }>
  _count?: {
    assignments: number
    payments: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface InvoiceWithRelations {
  id: string
  invoiceNumber: string
  propertyId: string
  property: {
    id: string
    name: string
    address: string
    ownerName: string
    ownerEmail?: string | null
  }
  periodStart: Date
  periodEnd: Date
  dueDate?: Date | null
  subtotal: number
  tax: number
  total: number
  status: 'draft' | 'sent' | 'paid'
  sentAt?: Date | null
  paidAt?: Date | null
  notes?: string | null
  lineItems: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    total: number
    jobId?: string | null
    job?: {
      id: string
      date: Date
    } | null
  }>
  _count?: {
    lineItems: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface DashboardMetrics {
  monthlyRevenue: number
  pendingFromClients: number
  owedToTeam: number
  draftInvoices: number
  lowStockCount: number
}

export interface ChartData {
  name: string
  value: number
}

export interface DateRange {
  from: Date
  to: Date
}

// Payment calculation utility type
export interface PaymentBreakdown {
  rate: number
  expensePercent: number
  expenseAmount: number
  teamPayoutTotal: number
  perPersonPayout: number
  workerCount: number
}
