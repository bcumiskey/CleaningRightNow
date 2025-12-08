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
import { formatCurrency } from '@/lib/utils'
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Supply {
  id: string
  name: string
  description?: string
  unit: string
  quantity: number
  costPerUnit: number
  lowStockThreshold: number
  category?: string
  _count: {
    restocks: number
    usage: number
  }
}

interface SupplyFormData {
  name: string
  description: string
  unit: string
  quantity: string
  costPerUnit: string
  lowStockThreshold: string
  category: string
}

export default function SuppliesPage() {
  const [supplies, setSupplies] = useState<Supply[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false)
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null)
  const [restockingSupply, setRestockingSupply] = useState<Supply | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [restockAmount, setRestockAmount] = useState('')
  const [formData, setFormData] = useState<SupplyFormData>({
    name: '',
    description: '',
    unit: 'unit',
    quantity: '0',
    costPerUnit: '0',
    lowStockThreshold: '5',
    category: '',
  })

  useEffect(() => {
    fetchSupplies()
  }, [])

  const fetchSupplies = async () => {
    try {
      const response = await fetch('/api/supplies')
      if (response.ok) {
        const data = await response.json()
        setSupplies(data)
      }
    } catch (error) {
      console.error('Failed to fetch supplies:', error)
      toast.error('Failed to load supplies')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        unit: formData.unit,
        quantity: parseFloat(formData.quantity) || 0,
        costPerUnit: parseFloat(formData.costPerUnit) || 0,
        lowStockThreshold: parseFloat(formData.lowStockThreshold) || 5,
        category: formData.category || null,
      }

      const url = editingSupply ? `/api/supplies/${editingSupply.id}` : '/api/supplies'
      const method = editingSupply ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success(editingSupply ? 'Supply updated' : 'Supply added')
        setIsModalOpen(false)
        resetForm()
        fetchSupplies()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save supply')
      }
    } catch (error) {
      console.error('Failed to save supply:', error)
      toast.error('Failed to save supply')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRestock = async () => {
    if (!restockingSupply || !restockAmount) return
    setIsSaving(true)

    try {
      const newQuantity = restockingSupply.quantity + parseFloat(restockAmount)
      const response = await fetch(`/api/supplies/${restockingSupply.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
      })

      if (response.ok) {
        toast.success('Supply restocked')
        setIsRestockModalOpen(false)
        setRestockingSupply(null)
        setRestockAmount('')
        fetchSupplies()
      }
    } catch (error) {
      console.error('Failed to restock supply:', error)
      toast.error('Failed to restock supply')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (supply: Supply) => {
    if (!confirm(`Are you sure you want to delete "${supply.name}"?`)) return

    try {
      const response = await fetch(`/api/supplies/${supply.id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Supply deleted')
        fetchSupplies()
      } else {
        toast.error('Failed to delete supply')
      }
    } catch (error) {
      console.error('Failed to delete supply:', error)
      toast.error('Failed to delete supply')
    }
  }

  const openEditModal = (supply: Supply) => {
    setEditingSupply(supply)
    setFormData({
      name: supply.name,
      description: supply.description || '',
      unit: supply.unit,
      quantity: supply.quantity.toString(),
      costPerUnit: supply.costPerUnit.toString(),
      lowStockThreshold: supply.lowStockThreshold.toString(),
      category: supply.category || '',
    })
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setEditingSupply(null)
    setFormData({
      name: '',
      description: '',
      unit: 'unit',
      quantity: '0',
      costPerUnit: '0',
      lowStockThreshold: '5',
      category: '',
    })
  }

  const categories = [...new Set(supplies.map((s) => s.category).filter(Boolean))]

  const filteredSupplies = supplies.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const lowStockCount = supplies.filter((s) => s.quantity <= s.lowStockThreshold).length

  return (
    <DashboardLayout>
      <Header title="Supplies" />

      <div className="page-container">
        {/* Low Stock Alert */}
        {lowStockCount > 0 && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="text-yellow-800">
                  {lowStockCount} item{lowStockCount > 1 ? 's' : ''} running low on stock
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
              placeholder="Search supplies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {categories.length > 0 && (
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Categories' },
                ...categories.map((c) => ({ value: c!, label: c! })),
              ]}
              className="w-full sm:w-40"
            />
          )}
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Add Supply
          </Button>
        </div>

        {/* Supplies List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredSupplies.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supply</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead align="center">Quantity</TableHead>
                    <TableHead align="right">Cost/Unit</TableHead>
                    <TableHead align="right">Total Value</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSupplies.map((supply) => {
                    const isLowStock = supply.quantity <= supply.lowStockThreshold
                    return (
                      <TableRow key={supply.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isLowStock ? 'bg-yellow-100' : 'bg-indigo-100'
                            }`}>
                              <Package className={`w-5 h-5 ${
                                isLowStock ? 'text-yellow-600' : 'text-indigo-600'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{supply.name}</p>
                              {supply.description && (
                                <p className="text-sm text-gray-500">{supply.description}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {supply.category ? (
                            <Badge>{supply.category}</Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <div className="flex items-center justify-center gap-2">
                            <span className={isLowStock ? 'text-yellow-600 font-medium' : ''}>
                              {supply.quantity} {supply.unit}
                            </span>
                            {isLowStock && (
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell align="right">{formatCurrency(supply.costPerUnit)}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(supply.quantity * supply.costPerUnit)}
                        </TableCell>
                        <TableCell align="right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRestockingSupply(supply)
                                setIsRestockModalOpen(true)
                              }}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(supply)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(supply)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={Package}
                title="No supplies yet"
                description="Add your cleaning supplies to track inventory."
                action={{
                  label: 'Add Supply',
                  onClick: () => setIsModalOpen(true),
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supply Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingSupply ? 'Edit Supply' : 'Add Supply'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Name"
              placeholder="Supply name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Description"
              placeholder="Optional description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
              <Input
                label="Unit"
                placeholder="bottle, pack, roll..."
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Cost per Unit ($)"
                type="number"
                step="0.01"
                value={formData.costPerUnit}
                onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
              />
              <Input
                label="Low Stock Threshold"
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
              />
            </div>
            <Input
              label="Category"
              placeholder="Cleaning, Paper Goods..."
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingSupply ? 'Update' : 'Add'} Supply
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Restock Modal */}
      <Modal
        isOpen={isRestockModalOpen}
        onClose={() => { setIsRestockModalOpen(false); setRestockingSupply(null); setRestockAmount(''); }}
        title={`Restock ${restockingSupply?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Current quantity: {restockingSupply?.quantity} {restockingSupply?.unit}
          </p>
          <Input
            label="Amount to Add"
            type="number"
            step="0.01"
            value={restockAmount}
            onChange={(e) => setRestockAmount(e.target.value)}
            placeholder="0"
          />
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => { setIsRestockModalOpen(false); setRestockingSupply(null); setRestockAmount(''); }}
          >
            Cancel
          </Button>
          <Button onClick={handleRestock} isLoading={isSaving}>
            Restock
          </Button>
        </ModalFooter>
      </Modal>
    </DashboardLayout>
  )
}
