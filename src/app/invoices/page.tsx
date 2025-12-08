'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal, { ModalFooter } from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
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
  DollarSign,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Invoice {
  id: string
  invoiceNumber: string
  issueDate: string
  dueDate?: string
  subtotal: number
  tax: number
  total: number
  status: string
  paidAt?: string
  notes?: string
  job: {
    id: string
    scheduledDate: string
    totalAmount: number
    property: {
      id: string
      name: string
      address: string
      owner?: {
        name: string
        email?: string
        phone?: string
      }
    }
    services: Array<{
      service: { name: string }
      price: number
    }>
  }
}

interface Job {
  id: string
  scheduledDate: string
  totalAmount: number
  property: {
    name: string
  }
  invoice?: {
    id: string
  }
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [availableJobs, setAvailableJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    jobId: '',
    dueDate: '',
    tax: '0',
    notes: '',
  })

  useEffect(() => {
    fetchInvoices()
    fetchAvailableJobs()
  }, [])

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

  const fetchAvailableJobs = async () => {
    try {
      const response = await fetch('/api/jobs?status=COMPLETED')
      if (response.ok) {
        const data = await response.json()
        // Filter jobs that don't have invoices
        setAvailableJobs(data.filter((job: Job) => !job.invoice))
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const payload = {
        jobId: formData.jobId,
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
        fetchAvailableJobs()
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

  const handleMarkPaid = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', paidAt: new Date().toISOString() }),
      })

      if (response.ok) {
        toast.success('Invoice marked as paid')
        fetchInvoices()
      }
    } catch (error) {
      console.error('Failed to update invoice:', error)
      toast.error('Failed to update invoice')
    }
  }

  const resetForm = () => {
    setFormData({
      jobId: '',
      dueDate: '',
      tax: '0',
      notes: '',
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
      DRAFT: 'default',
      SENT: 'info',
      UNPAID: 'warning',
      PAID: 'success',
      OVERDUE: 'danger',
      CANCELLED: 'default',
    }
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>
  }

  const filteredInvoices = invoices.filter((i) => {
    const matchesSearch =
      i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      i.job.property.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPaid = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((sum, i) => sum + i.total, 0)

  const totalUnpaid = invoices
    .filter((i) => i.status === 'UNPAID' || i.status === 'SENT')
    .reduce((sum, i) => sum + i.total, 0)

  const printInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsViewModalOpen(true)
  }

  return (
    <DashboardLayout>
      <Header title="Invoices" />

      <div className="page-container">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Paid</p>
                  <p className="text-xl font-bold">{formatCurrency(totalPaid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Outstanding</p>
                  <p className="text-xl font-bold">{formatCurrency(totalUnpaid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Invoices</p>
                  <p className="text-xl font-bold">{invoices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'UNPAID', label: 'Unpaid' },
              { value: 'PAID', label: 'Paid' },
              { value: 'OVERDUE', label: 'Overdue' },
            ]}
            className="w-full sm:w-40"
          />
          <Button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            disabled={availableJobs.length === 0}
          >
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead align="right">Amount</TableHead>
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
                          <p className="font-medium text-gray-900">{invoice.job.property.name}</p>
                          {invoice.job.property.owner && (
                            <p className="text-sm text-gray-500">{invoice.job.property.owner.name}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                      <TableCell align="right">
                        <span className="font-medium">{formatCurrency(invoice.total)}</span>
                      </TableCell>
                      <TableCell align="center">{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => printInvoice(invoice)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {invoice.status !== 'PAID' && (
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
            ) : (
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description={
                  availableJobs.length > 0
                    ? 'Create your first invoice from a completed job.'
                    : 'Complete a job first to create an invoice.'
                }
                action={
                  availableJobs.length > 0
                    ? {
                        label: 'Create Invoice',
                        onClick: () => setIsModalOpen(true),
                      }
                    : undefined
                }
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
            <Select
              label="Job"
              value={formData.jobId}
              onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
              options={availableJobs.map((j) => ({
                value: j.id,
                label: `${j.property.name} - ${formatDate(j.scheduledDate)} (${formatCurrency(j.totalAmount)})`,
              }))}
              placeholder="Select job"
              required
            />
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
                <p className="text-gray-500">{selectedInvoice.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">Cleaning Right Now</p>
                <p className="text-sm text-gray-500">Professional Cleaning Services</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Bill To</p>
                <p className="font-semibold text-gray-900">
                  {selectedInvoice.job.property.owner?.name || 'Property Owner'}
                </p>
                <p className="text-gray-600">{selectedInvoice.job.property.name}</p>
                <p className="text-gray-600">{selectedInvoice.job.property.address}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Issue Date:</span>{' '}
                  {formatDate(selectedInvoice.issueDate)}
                </p>
                {selectedInvoice.dueDate && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Due Date:</span>{' '}
                    {formatDate(selectedInvoice.dueDate)}
                  </p>
                )}
              </div>
            </div>

            <table className="w-full mb-8">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-sm font-medium text-gray-600">Service</th>
                  <th className="text-right py-2 text-sm font-medium text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.job.services.map((s, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-3">{s.service.name}</td>
                    <td className="py-3 text-right">{formatCurrency(s.price)}</td>
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
                <div className="flex justify-between py-2 border-t border-gray-200 font-bold">
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
