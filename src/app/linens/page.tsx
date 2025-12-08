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
import {
  Shirt,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  Home,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Linen {
  id: string
  propertyId: string
  type: string
  quantity: number
  condition: string
  notes?: string
  property: {
    id: string
    name: string
  }
  replacements: Array<{
    id: string
    quantity: number
    reason?: string
    replacedAt: string
  }>
}

interface Property {
  id: string
  name: string
}

interface LinenFormData {
  propertyId: string
  type: string
  quantity: string
  condition: string
  notes: string
}

const LINEN_TYPES = [
  'Sheet Set (King)',
  'Sheet Set (Queen)',
  'Sheet Set (Full)',
  'Sheet Set (Twin)',
  'Bath Towel',
  'Hand Towel',
  'Washcloth',
  'Bath Mat',
  'Kitchen Towel',
  'Pillow Case',
  'Duvet Cover',
  'Blanket',
  'Other',
]

const CONDITIONS = [
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'NEEDS_REPLACEMENT', label: 'Needs Replacement' },
]

export default function LinensPage() {
  const [linens, setLinens] = useState<Linen[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('all')
  const [conditionFilter, setConditionFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLinen, setEditingLinen] = useState<Linen | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<LinenFormData>({
    propertyId: '',
    type: '',
    quantity: '1',
    condition: 'GOOD',
    notes: '',
  })

  useEffect(() => {
    fetchLinens()
    fetchProperties()
  }, [])

  const fetchLinens = async () => {
    try {
      const response = await fetch('/api/linens')
      if (response.ok) {
        const data = await response.json()
        setLinens(data)
      }
    } catch (error) {
      console.error('Failed to fetch linens:', error)
      toast.error('Failed to load linens')
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
        type: formData.type,
        quantity: parseInt(formData.quantity) || 0,
        condition: formData.condition,
        notes: formData.notes || null,
      }

      const url = editingLinen ? `/api/linens/${editingLinen.id}` : '/api/linens'
      const method = editingLinen ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success(editingLinen ? 'Linen updated' : 'Linen added')
        setIsModalOpen(false)
        resetForm()
        fetchLinens()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save linen')
      }
    } catch (error) {
      console.error('Failed to save linen:', error)
      toast.error('Failed to save linen')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (linen: Linen) => {
    if (!confirm(`Are you sure you want to delete this ${linen.type}?`)) return

    try {
      const response = await fetch(`/api/linens/${linen.id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Linen deleted')
        fetchLinens()
      } else {
        toast.error('Failed to delete linen')
      }
    } catch (error) {
      console.error('Failed to delete linen:', error)
      toast.error('Failed to delete linen')
    }
  }

  const openEditModal = (linen: Linen) => {
    setEditingLinen(linen)
    setFormData({
      propertyId: linen.propertyId,
      type: linen.type,
      quantity: linen.quantity.toString(),
      condition: linen.condition,
      notes: linen.notes || '',
    })
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setEditingLinen(null)
    setFormData({
      propertyId: '',
      type: '',
      quantity: '1',
      condition: 'GOOD',
      notes: '',
    })
  }

  const getConditionBadge = (condition: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
      GOOD: 'success',
      FAIR: 'warning',
      DAMAGED: 'danger',
      NEEDS_REPLACEMENT: 'danger',
    }
    return (
      <Badge variant={variants[condition] || 'default'}>
        {condition.replace('_', ' ')}
      </Badge>
    )
  }

  const filteredLinens = linens.filter((l) => {
    const matchesSearch = l.type.toLowerCase().includes(search.toLowerCase())
    const matchesProperty = propertyFilter === 'all' || l.propertyId === propertyFilter
    const matchesCondition = conditionFilter === 'all' || l.condition === conditionFilter
    return matchesSearch && matchesProperty && matchesCondition
  })

  const needsAttention = linens.filter(
    (l) => l.condition === 'DAMAGED' || l.condition === 'NEEDS_REPLACEMENT'
  ).length

  return (
    <DashboardLayout>
      <Header title="Linens" />

      <div className="page-container">
        {/* Alert for damaged items */}
        {needsAttention > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">
                  {needsAttention} item{needsAttention > 1 ? 's' : ''} need attention
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search linens..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Properties' },
              ...properties.map((p) => ({ value: p.id, label: p.name })),
            ]}
            className="w-full sm:w-40"
          />
          <Select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            options={[{ value: 'all', label: 'All Conditions' }, ...CONDITIONS]}
            className="w-full sm:w-40"
          />
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Add Linen
          </Button>
        </div>

        {/* Linens List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredLinens.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead align="center">Quantity</TableHead>
                    <TableHead align="center">Condition</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLinens.map((linen) => (
                    <TableRow key={linen.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Shirt className="w-5 h-5 text-indigo-600" />
                          </div>
                          <span className="font-medium text-gray-900">{linen.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Home className="w-4 h-4 text-gray-400" />
                          {linen.property.name}
                        </div>
                      </TableCell>
                      <TableCell align="center">
                        <span className="font-medium">{linen.quantity}</span>
                      </TableCell>
                      <TableCell align="center">{getConditionBadge(linen.condition)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500 truncate max-w-xs block">
                          {linen.notes || '-'}
                        </span>
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(linen)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(linen)}>
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
                icon={Shirt}
                title="No linens yet"
                description="Add linens for each property to track inventory."
                action={{
                  label: 'Add Linen',
                  onClick: () => setIsModalOpen(true),
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linen Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingLinen ? 'Edit Linen' : 'Add Linen'}
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
            <Select
              label="Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              options={LINEN_TYPES.map((t) => ({ value: t, label: t }))}
              placeholder="Select type"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
              <Select
                label="Condition"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                options={CONDITIONS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
                placeholder="Stains, damage, etc..."
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
              {editingLinen ? 'Update' : 'Add'} Linen
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
