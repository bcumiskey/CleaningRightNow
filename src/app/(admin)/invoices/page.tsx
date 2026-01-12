'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Clock, CheckCircle, Send, ChevronDown, ChevronRight, Ban, Building2, User } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Invoice {
  id: string
  invoiceNumber: string
  property: { name: string; ownerName: string }
  invoiceDate: string
  total: number
  status: string
}

type StatusFilter = 'all' | 'draft' | 'sent' | 'paid' | 'voided'

interface OwnerGroup {
  ownerName: string
  invoices: Invoice[]
  totalAmount: number
  unpaidAmount: number
  properties: Set<string>
}

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped')

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices')
      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
        // Auto-expand owners with unpaid invoices
        const ownersWithUnpaid = new Set<string>()
        data.forEach((inv: Invoice) => {
          if (inv.status === 'draft' || inv.status === 'sent') {
            ownersWithUnpaid.add(inv.property?.ownerName || 'Unknown')
          }
        })
        setExpandedOwners(ownersWithUnpaid)
      } else {
        toast.error('Failed to load invoices')
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
      toast.error('Failed to load invoices')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter invoices by status
  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'all') return invoices
    return invoices.filter(inv => inv.status === statusFilter)
  }, [invoices, statusFilter])

  // Group invoices by owner
  const groupedByOwner = useMemo(() => {
    const groups = new Map<string, OwnerGroup>()

    filteredInvoices.forEach(invoice => {
      const ownerName = invoice.property?.ownerName || 'Unknown'

      if (!groups.has(ownerName)) {
        groups.set(ownerName, {
          ownerName,
          invoices: [],
          totalAmount: 0,
          unpaidAmount: 0,
          properties: new Set()
        })
      }

      const group = groups.get(ownerName)!
      group.invoices.push(invoice)
      group.totalAmount += invoice.total
      if (invoice.status !== 'paid' && invoice.status !== 'voided') {
        group.unpaidAmount += invoice.total
      }
      if (invoice.property?.name) {
        group.properties.add(invoice.property.name)
      }
    })

    // Sort groups by unpaid amount (descending) then by name
    return Array.from(groups.values()).sort((a, b) => {
      if (b.unpaidAmount !== a.unpaidAmount) {
        return b.unpaidAmount - a.unpaidAmount
      }
      return a.ownerName.localeCompare(b.ownerName)
    })
  }, [filteredInvoices])

  // Status counts for filter badges
  const statusCounts = useMemo(() => {
    const counts = { all: invoices.length, draft: 0, sent: 0, paid: 0, voided: 0 }
    invoices.forEach(inv => {
      const status = inv.status as keyof typeof counts
      if (status in counts) counts[status]++
    })
    return counts
  }, [invoices])

  const toggleOwner = (ownerName: string) => {
    setExpandedOwners(prev => {
      const next = new Set(prev)
      if (next.has(ownerName)) {
        next.delete(ownerName)
      } else {
        next.add(ownerName)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedOwners(new Set(groupedByOwner.map(g => g.ownerName)))
  }

  const collapseAll = () => {
    setExpandedOwners(new Set())
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
      draft: 'warning',
      sent: 'info',
      paid: 'success',
      voided: 'danger',
    }
    const icons: Record<string, typeof Clock> = {
      draft: Clock,
      sent: Send,
      paid: CheckCircle,
      voided: Ban,
    }
    const Icon = icons[status] || Clock
    return (
      <Badge variant={variants[status] || 'warning'}>
        <Icon size={12} className="mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const FilterTab = ({ status, label }: { status: StatusFilter; label: string }) => (
    <button
      onClick={() => setStatusFilter(status)}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
        statusFilter === status
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      )}
    >
      {label}
      <span className={cn(
        'ml-2 px-2 py-0.5 text-xs rounded-full',
        statusFilter === status ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
      )}>
        {statusCounts[status]}
      </span>
    </button>
  )

  const InvoiceRow = ({ invoice }: { invoice: Invoice }) => (
    <tr
      className="hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
      onClick={() => router.push(`/invoices/${invoice.id}`)}
    >
      <td className="px-4 py-3 font-mono text-sm">{invoice.invoiceNumber}</td>
      <td className="px-4 py-3">{invoice.property?.name || 'Unknown'}</td>
      <td className="px-4 py-3 text-gray-600">{formatDate(invoice.invoiceDate)}</td>
      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(invoice.total)}</td>
      <td className="px-4 py-3 text-center">{getStatusBadge(invoice.status)}</td>
    </tr>
  )

  return (
    <div className="min-h-screen">
      <AdminHeader title="Invoicing" />

      <div className="p-6">
        {/* Header with actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {filteredInvoices.length} Invoice{filteredInvoices.length !== 1 && 's'}
            </h3>
            {/* View mode toggle */}
            <div className="flex rounded-lg overflow-hidden border">
              <button
                onClick={() => setViewMode('grouped')}
                className={cn(
                  'px-3 py-1.5 text-sm',
                  viewMode === 'grouped' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                )}
              >
                <User size={14} className="inline mr-1" />
                By Client
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-3 py-1.5 text-sm border-l',
                  viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                )}
              >
                <FileText size={14} className="inline mr-1" />
                List
              </button>
            </div>
          </div>
          <Button onClick={() => router.push('/invoices/new')}>
            <Plus size={16} />
            Create Invoice
          </Button>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <FilterTab status="all" label="All" />
          <FilterTab status="draft" label="Draft" />
          <FilterTab status="sent" label="Sent" />
          <FilterTab status="paid" label="Paid" />
          <FilterTab status="voided" label="Voided" />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : invoices.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description="Create your first invoice to start billing clients."
                actionLabel="Create Invoice"
                onAction={() => router.push('/invoices/new')}
              />
            </CardContent>
          </Card>
        ) : filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No invoices match the selected filter.
            </CardContent>
          </Card>
        ) : viewMode === 'grouped' ? (
          /* Grouped view by client/owner */
          <div className="space-y-4">
            {/* Expand/Collapse controls */}
            <div className="flex justify-end gap-2">
              <button onClick={expandAll} className="text-sm text-blue-600 hover:underline">
                Expand All
              </button>
              <span className="text-gray-300">|</span>
              <button onClick={collapseAll} className="text-sm text-blue-600 hover:underline">
                Collapse All
              </button>
            </div>

            {groupedByOwner.map((group) => (
              <Card key={group.ownerName} className="overflow-hidden">
                {/* Owner header - clickable to expand/collapse */}
                <button
                  onClick={() => toggleOwner(group.ownerName)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedOwners.has(group.ownerName) ? (
                      <ChevronDown size={20} className="text-gray-500" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-500" />
                    )}
                    <div className="flex items-center gap-2">
                      <User size={18} className="text-gray-400" />
                      <span className="font-semibold text-gray-900">{group.ownerName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Building2 size={14} />
                      <span>{group.properties.size} propert{group.properties.size !== 1 ? 'ies' : 'y'}</span>
                    </div>
                    <span className="text-sm text-gray-400">
                      ({group.invoices.length} invoice{group.invoices.length !== 1 && 's'})
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {group.unpaidAmount > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Outstanding</div>
                        <div className="font-semibold text-amber-600">
                          {formatCurrency(group.unpaidAmount)}
                        </div>
                      </div>
                    )}
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Total</div>
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(group.totalAmount)}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded invoice list */}
                {expandedOwners.has(group.ownerName) && (
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-t border-b">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                            Invoice
                          </th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                            Property
                          </th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                            Amount
                          </th>
                          <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.invoices
                          .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
                          .map((invoice) => (
                            <InvoiceRow key={invoice.id} invoice={invoice} />
                          ))}
                      </tbody>
                    </table>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          /* Flat list view */
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Invoice
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Property
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Client
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/invoices/${invoice.id}`)}
                    >
                      <td className="px-6 py-4 font-mono text-sm">{invoice.invoiceNumber}</td>
                      <td className="px-6 py-4 font-medium">{invoice.property?.name || 'Unknown'}</td>
                      <td className="px-6 py-4 text-gray-600">{invoice.property?.ownerName || '-'}</td>
                      <td className="px-6 py-4 text-gray-600">{formatDate(invoice.invoiceDate)}</td>
                      <td className="px-6 py-4 text-right font-semibold">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="px-6 py-4 text-center">{getStatusBadge(invoice.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
