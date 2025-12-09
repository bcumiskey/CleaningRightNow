// Re-export Prisma types with some additional utility types

export type {
  User,
  Property,
  PropertyOwner,
  PropertyGroup,
  PropertyPhoto,
  TeamMember,
  Service,
  Job,
  JobService,
  JobAssignment,
  TeamPayment,
  Linen,
  LinenReplacement,
  Supply,
  PropertySupply,
  SupplyRestock,
  SupplyUsage,
  LaundryProvider,
  LaundryRecord,
  Invoice,
  AuditLog,
  Setting,
} from '@prisma/client'

export {
  JobStatus,
  LinenCondition,
  LaundryStatus,
  InvoiceStatus,
} from '@prisma/client'

// Extended types with relations
export interface JobWithRelations {
  id: string
  propertyId: string
  property: {
    id: string
    name: string
    address: string
    owner?: {
      id: string
      name: string
      email?: string | null
      phone?: string | null
    } | null
  }
  scheduledDate: Date
  scheduledTime?: string | null
  completedAt?: Date | null
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  totalAmount: number
  expensePercent: number
  expenseAmount: number
  teamPayoutTotal: number
  notes?: string | null
  clientPaid: boolean
  clientPaidAt?: Date | null
  teamPaid: boolean
  teamPaidAt?: Date | null
  services: Array<{
    id: string
    service: {
      id: string
      name: string
    }
    price: number
  }>
  teamAssignments: Array<{
    id: string
    teamMember: {
      id: string
      name: string
    }
    payoutAmount: number
    paid: boolean
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
  notes?: string | null
  ownerId?: string | null
  owner?: {
    id: string
    name: string
    phone?: string | null
    email?: string | null
  } | null
  groupId?: string | null
  group?: {
    id: string
    name: string
    color?: string | null
  } | null
  active: boolean
  linens?: Array<{
    id: string
    type: string
    quantity: number
    condition: string
  }>
  propertySupplies?: Array<{
    id: string
    supply: {
      id: string
      name: string
      unit: string
    }
    quantity: number
  }>
  photos?: Array<{
    id: string
    url: string
    description?: string | null
    category?: string | null
  }>
  _count?: {
    jobs: number
    linens: number
    propertySupplies: number
    photos: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface TeamMemberWithRelations {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  active: boolean
  jobAssignments?: Array<{
    id: string
    job: {
      id: string
      scheduledDate: Date
      property: {
        name: string
      }
    }
    payoutAmount: number
    paid: boolean
  }>
  _count?: {
    jobAssignments: number
    payments: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface DashboardMetrics {
  totalRevenue: number
  totalExpenses: number
  pendingPayments: number
  owedToTeam: number
  todayJobs: number
  upcomingJobs: number
  lowStockItems: number
  completedJobsThisMonth: number
}

export interface ChartData {
  name: string
  value: number
}

export interface DateRange {
  from: Date
  to: Date
}
