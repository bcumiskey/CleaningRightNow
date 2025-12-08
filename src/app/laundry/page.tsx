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
  WashingMachine,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Home,
  Clock,
  CheckCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface LaundryRecord {
  id: string
  propertyId: string
  dropOffDate: string
  pickupDate?: string
  status: string
  cost?: number
  items?: string
  notes?: string
  property: {
    id: string
    name: string
  }
  provider?: {
    id: string
    name: string
  }
}

interface Property {
  id: string
  name: string
}

interface LaundryFormData {
  propertyId: string
  dropOffDate: string
  pickupDate: string
  status: string
  cost: string
  items: string
  notes: string
}

const STATUSES = [
  { value: 'DROPPED_OFF', label: 'Dropped Off' },
  { value: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
  { value: 'PICKED_UP', label: 'Picked Up' },
  { value: 'DELIVERED', label: 'Delivered' },
]

export default function LaundryPage() {
  const [records, setRecords] = useState<LaundryRecord[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<LaundryRecord | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<LaundryFormData>({
    propertyId: '',
    dropOffDate: '',
    pickupDate: '',
    status: 'DROPPED_OFF',
    cost: '',
    items: '',
    notes: '',
  })

  useEffect(() => {
    fetchRecords()
    fetchProperties()
  }, [])

  const fetchRecords = async () => {
    try {
      const response = await fetch('/api/laundry')
      if (response.ok) {
        const data = await response.json()
        setRecords(data)
      }
    } catch (error) {
      console.error('Failed to fetch laundry records:', error)
      toast.error('Failed to load laundry records')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const payload = {
        propertyId: formData.propertyId,
        dropOffDate: formData.dropOffDate,
        pickupDate: formData.pickupDate || null,
        status: formData.status,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        items: formData.items || null,
        notes: formData.notes || null,
      }

      const url = editingRecord ? `/api/laundry/${editingRecord.id}` : '/api/laundry'
      const method = editingRecord ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success(editingRecord ? 'Record updated' : 'Record added')
        setIsModalOpen(false)
        resetForm()
        fetchRecords()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save record')
      }
    } catch (error) {
      console.error('Failed to save record:', error)
      toast.error('Failed to save record')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (record: LaundryRecord) => {
    if (!confirm('Are you sure you want to delete this laundry record?')) return

    try {
      const response = await fetch(`/api/laundry/${record.id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Record deleted')
        fetchRecords()
      } else {
        toast.error('Failed to delete record')
      }
    } catch (error) {
      console.error('Failed to delete record:', error)
      toast.error('Failed to delete record')
    }
  }

  const handleStatusUpdate = async (record: LaundryRecord, newStatus: string) => {
    try {
      const response = await fetch(`/api/laundry/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        toast.success('Status updated')
        fetchRecords()
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('Failed to update status')
    }
  }

  const openEditModal = (record: LaundryRecord) => {
    setEditingRecord(record)
    setFormData({
      propertyId: record.propertyId,
      dropOffDate: record.dropOffDate.split('T')[0],
      pickupDate: record.pickupDate ? record.pickupDate.split('T')[0] : '',
      status: record.status,
      cost: record.cost?.toString() || '',
      items: record.items || '',
      notes: record.notes || '',
    })
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setEditingRecord(null)
    setFormData({
      propertyId: '',
      dropOffDate: new Date().toISOString().split('T')[0],
      pickupDate: '',
      status: 'DROPPED_OFF',
      cost: '',
      items: '',
      notes: '',
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'info' | 'warning' | 'success' | 'default'> = {
      DROPPED_OFF: 'info',
      READY_FOR_PICKUP: 'warning',
      PICKED_UP: 'success',
      DELIVERED: 'success',
    }
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.replace(/_/g, ' ')}
      </Badge>
    )
  }

  const filteredRecords = records.filter((r) => {
    const matchesSearch = r.property.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const pendingCount = records.filter(
    (r) => r.status === 'DROPPED_OFF' || r.status === 'READY_FOR_PICKUP'
  ).length

  return (
    <DashboardLayout>
      <Header title="Laundry" />

      <div className="page-container">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-xl font-bold">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-xl font-bold">
                    {records.filter((r) => r.status === 'DELIVERED').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <WashingMachine className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Records</p>
                  <p className="text-xl font-bold">{records.length}</p>
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
              placeholder="Search by property..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: 'all', label: 'All Status' }, ...STATUSES]}
            className="w-full sm:w-40"
          />
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            New Record
          </Button>
        </div>

        {/* Records List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredRecords.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Drop-off</TableHead>
                    <TableHead>Pickup</TableHead>
                    <TableHead align="center">Status</TableHead>
                    <TableHead align="right">Cost</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Home className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{record.property.name}</p>
                            {record.items && (
                              <p className="text-sm text-gray-500 truncate max-w-xs">{record.items}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(record.dropOffDate)}</TableCell>
                      <TableCell>
                        {record.pickupDate ? formatDate(record.pickupDate) : '-'}
                      </TableCell>
                      <TableCell align="center">{getStatusBadge(record.status)}</TableCell>
                      <TableCell align="right">
                        {record.cost ? formatCurrency(record.cost) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(record)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(record)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={WashingMachine}
                title="No laundry records yet"
                description="Track laundry drop-offs and pickups."
                action={{
                  label: 'Add Record',
                  onClick: () => setIsModalOpen(true),
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Laundry Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingRecord ? 'Edit Record' : 'New Laundry Record'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Select
              label="Property"
              value={formData.propertyId}
              onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
              options={properties.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Select property"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Drop-off Date"
                type="date"
                value={formData.dropOffDate}
                onChange={(e) => setFormData({ ...formData, dropOffDate: e.target.value })}
                required
              />
              <Input
                label="Pickup Date"
                type="date"
                value={formData.pickupDate}
                onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={STATUSES}
              />
              <Input
                label="Cost ($)"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              />
            </div>
            <Input
              label="Items"
              placeholder="Sheets, towels, etc..."
              value={formData.items}
              onChange={(e) => setFormData({ ...formData, items: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
                placeholder="Additional notes..."
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
              {editingRecord ? 'Update' : 'Add'} Record
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
