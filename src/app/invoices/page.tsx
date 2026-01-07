'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal, { ModalFooter } from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import StatCard from '@/components/ui/StatCard'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  FileText,
  Plus,
  Search,
  Loader2,
  Eye,
  Printer,
  CheckCircle,
  Clock,
  Send,
  DollarSign,
  Trash2,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Invoice {
  id: string
  invoiceNumber: string
  periodStart: string
  periodEnd: string
  dueDate?: string
  subtotal: number
  tax: number
  total: number
  status: string
  sentAt?: string
  paidAt?: string
  notes?: string
  property: {
    id: string
    name: string
    address: string
    ownerName: string
    ownerEmail?: string
  }
  lineItems: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    total: number
    jobId?: string
    job?: {
      date: string
    }
  }>
  _count: {
    lineItems: number
  }
}

interface Property {
  id: string
  name: string
  billingType: 'per_job' | 'monthly'
  ownerName: string
}

interface CustomBillingItem {
  id: string
  name: string
  defaultPrice: number
}

export default function InvoicesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [billingItems, setBillingItems] = useState<CustomBillingItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [propertyFilter, setPropertyFilter] = useState('')

  // Create Invoice Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    propertyId: '',
    periodStart: '',
    periodEnd: '',
    dueDate: '',
    tax: '0',
    notes: '',
  })

  useEffect(() => {
    if (status === 'authenticated') {
      fetchInvoices()
      fetchProperties()
      fetchBillingItems()
    }
  }, [status])

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices')
      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
      toast.error('Failed to load invoices')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties')
      if (response.ok) {
        const data = await response.json()
        setProperties(data)
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error)
    }
  }

  const fetchBillingItems = async () => {
    try {
      const response = await fetch('/api/billing-items')
      if (response.ok) {
        const data = await response.json()
        setBillingItems(data)
      }
    } catch (error) {
      console.error('Failed to fetch billing items:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const payload = {
        propertyId: formData.propertyId,
        periodStart: formData.periodStart,
        periodEnd: formData.periodEnd,
        dueDate: formData.dueDate || null,
        tax: parseFloat(formData.tax) || 0,
        notes: formData.notes || null,
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success('Invoice created')
        setIsModalOpen(false)
        resetForm()
        fetchInvoices()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create invoice')
      }
    } catch (error) {
      console.error('Failed to create invoice:', error)
      toast.error('Failed to create invoice')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendInvoice = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Invoice sent')
        fetchInvoices()
      } else {
        toast.error('Failed to send invoice')
      }
    } catch (error) {
      console.error('Failed to send invoice:', error)
      toast.error('Failed to send invoice')
    }
  }

  const handleMarkPaid = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/mark-paid`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Invoice marked as paid')
        fetchInvoices()
      } else {
        toast.error('Failed to update invoice')
      }
    } catch (error) {
      console.error('Failed to update invoice:', error)
      toast.error('Failed to update invoice')
    }
  }

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) return

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Invoice deleted')
        fetchInvoices()
      } else {
        toast.error('Failed to delete invoice')
      }
    } catch (error) {
      console.error('Failed to delete invoice:', error)
      toast.error('Failed to delete invoice')
    }
  }

  const resetForm = () => {
    setFormData({
      propertyId: '',
      periodStart: '',
      periodEnd: '',
      dueDate: '',
      tax: '0',
      notes: '',
    })
  }

  const getStatusBadge = (invoice: Invoice) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
      draft: 'default',
      sent: 'info',
      paid: 'success',
      overdue: 'danger',
    }

    // Check if overdue
    let effectiveStatus = invoice.status
    if (invoice.status === 'sent' && invoice.dueDate) {
      const dueDate = new Date(invoice.dueDate)
      if (dueDate < new Date()) {
        effectiveStatus = 'overdue'
      }
    }

    return <Badge variant={variants[effectiveStatus] || 'default'}>{effectiveStatus}</Badge>
  }

  const filteredInvoices = invoices.filter((i) => {
    const matchesSearch =
      i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      i.property.name.toLowerCase().includes(search.toLowerCase()) ||
      i.property.ownerName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter
    const matchesProperty = !propertyFilter || i.property.id === propertyFilter
    return matchesSearch && matchesStatus && matchesProperty
  })

  const draftCount = invoices.filter((i) => i.status === 'draft').length
  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.total, 0)
  const totalOutstanding = invoices
    .filter((i) => i.status === 'sent')
    .reduce((sum, i) => sum + i.total, 0)

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!session) {
    router.push('/login')
    return null
  }

  return (
    <DashboardLayout>
      <Header title="Invoices" />

      <div className="page-container">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Draft Invoices"
            value={String(draftCount)}
            icon={FileText}
            iconColor="text-gray-600 bg-gray-100"
          />
          <StatCard
            title="Outstanding"
            value={formatCurrency(totalOutstanding)}
            icon={Clock}
            iconColor="text-yellow-600 bg-yellow-100"
          />
          <StatCard
            title="Total Paid"
            value={formatCurrency(totalPaid)}
            icon={CheckCircle}
            iconColor="text-green-600 bg-green-100"
          />
          <StatCard
            title="Total Invoices"
            value={String(invoices.length)}
            icon={FileText}
            iconColor="text-indigo-600 bg-indigo-100"
          />
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-32"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
          </Select>
          <Select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="w-full sm:w-40"
          >
            <option value="">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Create Invoice
          </Button>
        </div>

        {/* Invoices List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredInvoices.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead align="center">Items</TableHead>
                      <TableHead align="right">Total</TableHead>
                      <TableHead align="center">Status</TableHead>
                      <TableHead align="right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <span className="font-mono font-medium text-gray-900">
                            {invoice.invoiceNumber}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{invoice.property.name}</p>
                            <p className="text-sm text-gray-500">{invoice.property.ownerName}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                          </span>
                        </TableCell>
                        <TableCell align="center">
                          <Badge variant="default">{invoice._count.lineItems}</Badge>
                        </TableCell>
                        <TableCell align="right">
                          <span className="font-medium">{formatCurrency(invoice.total)}</span>
                        </TableCell>
                        <TableCell align="center">{getStatusBadge(invoice)}</TableCell>
                        <TableCell align="right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setIsViewModalOpen(true)
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {invoice.status === 'draft' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSendInvoice(invoice)}
                                >
                                  <Send className="w-4 h-4 text-blue-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(invoice)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            {invoice.status === 'sent' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkPaid(invoice)}
                              >
                                <DollarSign className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description="Create your first invoice to start billing clients."
                action={{
                  label: 'Create Invoice',
                  onClick: () => setIsModalOpen(true),
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title="Create Invoice"
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property *</label>
              <Select
                value={formData.propertyId}
                onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
              >
                <option value="">Select property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.billingType === 'monthly' ? 'Monthly' : 'Per Job'})
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Period Start *"
                type="date"
                value={formData.periodStart}
                onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                required
              />
              <Input
                label="Period End *"
                type="date"
                value={formData.periodEnd}
                onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Due Date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
              <Input
                label="Tax ($)"
                type="number"
                step="0.01"
                value={formData.tax}
                onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
                placeholder="Invoice notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Jobs will be automatically added</p>
                  <p>All completed jobs within the period will be added as line items.</p>
                </div>
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Create Invoice
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* View Invoice Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => { setIsViewModalOpen(false); setSelectedInvoice(null); }}
        title="Invoice Preview"
        size="lg"
      >
        {selectedInvoice && (
          <div className="print:p-8" id="invoice-content">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
                <p className="text-gray-500 font-mono">{selectedInvoice.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">Cleaning Right Now</p>
                <p className="text-sm text-gray-500">Professional Cleaning Services</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Bill To</p>
                <p className="font-semibold text-gray-900">{selectedInvoice.property.ownerName}</p>
                <p className="text-gray-600">{selectedInvoice.property.name}</p>
                <p className="text-gray-600">{selectedInvoice.property.address}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Period:</span>{' '}
                  {formatDate(selectedInvoice.periodStart)} - {formatDate(selectedInvoice.periodEnd)}
                </p>
                {selectedInvoice.dueDate && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Due Date:</span>{' '}
                    {formatDate(selectedInvoice.dueDate)}
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Status:</span>{' '}
                  {selectedInvoice.status.toUpperCase()}
                </p>
              </div>
            </div>

            <table className="w-full mb-8">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Description</th>
                  <th className="text-center py-2 text-sm font-medium text-gray-600">Qty</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600">Unit Price</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3">
                      {item.description}
                      {item.job && (
                        <span className="text-sm text-gray-500 ml-2">({formatDate(item.job.date)})</span>
                      )}
                    </td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 text-right">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Tax</span>
                  <span>{formatCurrency(selectedInvoice.tax)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-gray-200 font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div className="mt-8 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-1">Notes</p>
                <p className="text-sm text-gray-600">{selectedInvoice.notes}</p>
              </div>
            )}
          </div>
        )}

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => { setIsViewModalOpen(false); setSelectedInvoice(null); }}
          >
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </ModalFooter>
      </Modal>
    </DashboardLayout>
  )
}
