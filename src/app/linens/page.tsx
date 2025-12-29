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
  Shirt,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  Home,
  RefreshCw,
  History,
  DollarSign,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface LinenReplacement {
  id: string
  quantity: number
  reason?: string
  cost?: number
  replacedAt: string
}

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
  replacements: LinenReplacement[]
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

interface ReplacementFormData {
  quantity: string
  reason: string
  cost: string
  resetCondition: boolean
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

  // Edit/Add modal
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

  // Replacement modal
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false)
  const [replacingLinen, setReplacingLinen] = useState<Linen | null>(null)
  const [isRecordingReplacement, setIsRecordingReplacement] = useState(false)
  const [replacementFormData, setReplacementFormData] = useState<ReplacementFormData>({
    quantity: '1',
    reason: '',
    cost: '',
    resetCondition: true,
  })

  // History modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyLinen, setHistoryLinen] = useState<Linen | null>(null)

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

  const handleRecordReplacement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replacingLinen) return
    setIsRecordingReplacement(true)

    try {
      const payload = {
        quantity: parseInt(replacementFormData.quantity) || 1,
        reason: replacementFormData.reason || null,
        cost: replacementFormData.cost ? parseFloat(replacementFormData.cost) : null,
        resetCondition: replacementFormData.resetCondition,
      }

      const response = await fetch(`/api/linens/${replacingLinen.id}/replacements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success('Replacement recorded')
        setIsReplaceModalOpen(false)
        resetReplacementForm()
        fetchLinens()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to record replacement')
      }
    } catch (error) {
      console.error('Failed to record replacement:', error)
      toast.error('Failed to record replacement')
    } finally {
      setIsRecordingReplacement(false)
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

  const openReplaceModal = (linen: Linen) => {
    setReplacingLinen(linen)
    setReplacementFormData({
      quantity: linen.quantity.toString(),
      reason: '',
      cost: '',
      resetCondition: true,
    })
    setIsReplaceModalOpen(true)
  }

  const openHistoryModal = (linen: Linen) => {
    setHistoryLinen(linen)
    setIsHistoryModalOpen(true)
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

  const resetReplacementForm = () => {
    setReplacingLinen(null)
    setReplacementFormData({
      quantity: '1',
      reason: '',
      cost: '',
      resetCondition: true,
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
  )

  // Group linens by property for summary
  const linensByProperty = linens.reduce((acc, linen) => {
    const propId = linen.propertyId
    if (!acc[propId]) {
      acc[propId] = {
        property: linen.property,
        total: 0,
        needsAttention: 0,
        totalReplacements: 0,
        totalCost: 0,
      }
    }
    acc[propId].total += linen.quantity
    if (linen.condition === 'DAMAGED' || linen.condition === 'NEEDS_REPLACEMENT') {
      acc[propId].needsAttention += linen.quantity
    }
    linen.replacements.forEach(r => {
      acc[propId].totalReplacements += r.quantity
      acc[propId].totalCost += r.cost || 0
    })
    return acc
  }, {} as Record<string, { property: { id: string; name: string }; total: number; needsAttention: number; totalReplacements: number; totalCost: number }>)

  return (
    <DashboardLayout>
      <Header title="Linens" />

      <div className="page-container">
        {/* Property Summary Cards */}
        {Object.keys(linensByProperty).length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Object.values(linensByProperty).map((summary) => (
              <Card key={summary.property.id} className={summary.needsAttention > 0 ? 'border-red-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-sm truncate">{summary.property.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Total Items</span>
                      <p className="font-semibold text-lg">{summary.total}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Need Attention</span>
                      <p className={`font-semibold text-lg ${summary.needsAttention > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {summary.needsAttention}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Replacements</span>
                      <p className="font-semibold">{summary.totalReplacements}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Cost</span>
                      <p className="font-semibold">{formatCurrency(summary.totalCost)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Alert for damaged items */}
        {needsAttention.length > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">
                  {needsAttention.length} item{needsAttention.length > 1 ? 's' : ''} need attention
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setConditionFilter('NEEDS_REPLACEMENT')}
                >
                  View Items
                </Button>
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
                    <TableHead align="center">Qty</TableHead>
                    <TableHead align="center">Condition</TableHead>
                    <TableHead align="center">Replacements</TableHead>
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
                          <div>
                            <span className="font-medium text-gray-900">{linen.type}</span>
                            {linen.notes && (
                              <p className="text-xs text-gray-500 truncate max-w-xs">{linen.notes}</p>
                            )}
                          </div>
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
                      <TableCell align="center">
                        {linen.replacements.length > 0 ? (
                          <button
                            onClick={() => openHistoryModal(linen)}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                          >
                            {linen.replacements.length} record{linen.replacements.length > 1 ? 's' : ''}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openReplaceModal(linen)}
                            title="Record Replacement"
                          >
                            <RefreshCw className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openHistoryModal(linen)}
                            title="View History"
                          >
                            <History className="w-4 h-4 text-blue-600" />
                          </Button>
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

      {/* Add/Edit Linen Modal */}
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

      {/* Record Replacement Modal */}
      <Modal
        isOpen={isReplaceModalOpen}
        onClose={() => { setIsReplaceModalOpen(false); resetReplacementForm(); }}
        title="Record Replacement"
        description={replacingLinen ? `Recording replacement for ${replacingLinen.type} at ${replacingLinen.property.name}` : ''}
        size="md"
      >
        <form onSubmit={handleRecordReplacement}>
          <div className="space-y-4">
            <Input
              label="Quantity Replaced"
              type="number"
              min="1"
              value={replacementFormData.quantity}
              onChange={(e) => setReplacementFormData({ ...replacementFormData, quantity: e.target.value })}
              required
            />
            <Input
              label="Cost ($)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={replacementFormData.cost}
              onChange={(e) => setReplacementFormData({ ...replacementFormData, cost: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={2}
                placeholder="Worn out, stained, damaged..."
                value={replacementFormData.reason}
                onChange={(e) => setReplacementFormData({ ...replacementFormData, reason: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="resetCondition"
                checked={replacementFormData.resetCondition}
                onChange={(e) => setReplacementFormData({ ...replacementFormData, resetCondition: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <label htmlFor="resetCondition" className="text-sm text-gray-700">
                Reset condition to &quot;Good&quot; after replacement
              </label>
            </div>
          </div>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => { setIsReplaceModalOpen(false); resetReplacementForm(); }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isRecordingReplacement}>
              <RefreshCw className="w-4 h-4" />
              Record Replacement
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Replacement History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => { setIsHistoryModalOpen(false); setHistoryLinen(null); }}
        title="Replacement History"
        description={historyLinen ? `${historyLinen.type} at ${historyLinen.property.name}` : ''}
        size="lg"
      >
        {historyLinen && (
          <div>
            {historyLinen.replacements.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {historyLinen.replacements.map((replacement) => (
                  <div
                    key={replacement.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {replacement.quantity} item{replacement.quantity > 1 ? 's' : ''} replaced
                      </p>
                      {replacement.reason && (
                        <p className="text-sm text-gray-500">{replacement.reason}</p>
                      )}
                      <p className="text-xs text-gray-400">{formatDate(replacement.replacedAt)}</p>
                    </div>
                    {replacement.cost && (
                      <div className="flex items-center gap-1 text-green-600 font-medium">
                        <DollarSign className="w-4 h-4" />
                        {formatCurrency(replacement.cost)}
                      </div>
                    )}
                  </div>
                ))}
                <div className="pt-3 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Replacements:</span>
                    <span className="font-medium">
                      {historyLinen.replacements.reduce((sum, r) => sum + r.quantity, 0)} items
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">Total Cost:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(historyLinen.replacements.reduce((sum, r) => sum + (r.cost || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No replacement history yet.</p>
            )}
          </div>
        )}

        <ModalFooter>
          <Button variant="outline" onClick={() => { setIsHistoryModalOpen(false); setHistoryLinen(null); }}>
            Close
          </Button>
          {historyLinen && (
            <Button onClick={() => { setIsHistoryModalOpen(false); openReplaceModal(historyLinen); }}>
              <RefreshCw className="w-4 h-4" />
              Record New Replacement
            </Button>
          )}
        </ModalFooter>
      </Modal>
    </DashboardLayout>
  )
}
