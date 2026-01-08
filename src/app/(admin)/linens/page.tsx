'use client'

import { useEffect, useState } from 'react'
import { Package, Plus, Building, ShoppingCart, Save } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface LinenCategory {
  id: string
  name: string
  items: LinenItem[]
}

interface LinenItem {
  id: string
  name: string
  code: string
  unitCost: number
}

interface Property {
  id: string
  name: string
}

interface PropertyLinen {
  itemId: string
  itemName: string
  itemCode: string
  category: string
  unitCost: number
  perFlip: number
  onHand: number
}

interface ShoppingItem {
  itemId: string
  itemName: string
  itemCode: string
  category: string
  unitCost: number
  properties: {
    propertyId: string
    propertyName: string
    perFlip: number
    onHand: number
    needed: number
    flipsRemaining: number
  }[]
  totalNeeded: number
  totalCost: number
}

type TabType = 'inventory' | 'property' | 'shopping'

export default function LinensPage() {
  const [activeTab, setActiveTab] = useState<TabType>('inventory')
  const [categories, setCategories] = useState<LinenCategory[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal states
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)

  // Property tab state
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [propertyLinens, setPropertyLinens] = useState<PropertyLinen[]>([])
  const [isLoadingProperty, setIsLoadingProperty] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Shopping list state
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([])
  const [shoppingStats, setShoppingStats] = useState({ totalItems: 0, totalCost: 0 })
  const [targetFlips, setTargetFlips] = useState(5)
  const [isLoadingShopping, setIsLoadingShopping] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchProperties()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/linens')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to fetch linens:', error)
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

  const fetchPropertyLinens = async (propertyId: string) => {
    if (!propertyId) return
    setIsLoadingProperty(true)
    try {
      const response = await fetch(`/api/linens/property/${propertyId}`)
      if (response.ok) {
        const data = await response.json()
        setPropertyLinens(data.linens)
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Failed to fetch property linens:', error)
      toast.error('Failed to load property linens')
    } finally {
      setIsLoadingProperty(false)
    }
  }

  const fetchShoppingList = async () => {
    setIsLoadingShopping(true)
    try {
      const response = await fetch(`/api/linens/shopping-list?targetFlips=${targetFlips}`)
      if (response.ok) {
        const data = await response.json()
        setShoppingList(data.items)
        setShoppingStats(data.summary)
      }
    } catch (error) {
      console.error('Failed to fetch shopping list:', error)
      toast.error('Failed to generate shopping list')
    } finally {
      setIsLoadingShopping(false)
    }
  }

  const handleSelectProperty = (propertyId: string) => {
    setSelectedPropertyId(propertyId)
    if (propertyId) {
      fetchPropertyLinens(propertyId)
    } else {
      setPropertyLinens([])
    }
  }

  const updatePropertyLinen = (itemId: string, field: 'perFlip' | 'onHand', value: string) => {
    setPropertyLinens(prev =>
      prev.map(item =>
        item.itemId === itemId
          ? { ...item, [field]: parseInt(value) || 0 }
          : item
      )
    )
    setHasChanges(true)
  }

  const savePropertyLinens = async () => {
    if (!selectedPropertyId) return

    try {
      const response = await fetch(`/api/linens/property/${selectedPropertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linens: propertyLinens.map(l => ({
            itemId: l.itemId,
            perFlip: l.perFlip,
            onHand: l.onHand,
          })),
        }),
      })

      if (response.ok) {
        toast.success('Linen settings saved')
        setHasChanges(false)
      } else {
        toast.error('Failed to save')
      }
    } catch (error) {
      toast.error('Failed to save')
    }
  }

  const handleAddCategory = async (name: string) => {
    try {
      const response = await fetch('/api/linens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'category', name }),
      })

      if (response.ok) {
        toast.success('Category added')
        setShowAddCategory(false)
        fetchCategories()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add category')
      }
    } catch (error) {
      toast.error('Failed to add category')
    }
  }

  const handleAddItem = async (data: { categoryId: string; name: string; code: string; unitCost: string }) => {
    try {
      const response = await fetch('/api/linens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success('Item added')
        setShowAddItem(false)
        fetchCategories()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add item')
      }
    } catch (error) {
      toast.error('Failed to add item')
    }
  }

  // Tab change handler
  useEffect(() => {
    if (activeTab === 'shopping') {
      fetchShoppingList()
    }
  }, [activeTab, targetFlips])

  const tabs = [
    { id: 'inventory' as TabType, label: 'Master Inventory', icon: Package },
    { id: 'property' as TabType, label: 'Per Property', icon: Building },
    { id: 'shopping' as TabType, label: 'Shopping List', icon: ShoppingCart },
  ]

  return (
    <div className="min-h-screen">
      <AdminHeader title="Linen Management" />

      <div className="p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Master Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-gray-600">
                Manage your linen item catalog and pricing.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAddCategory(true)}>
                  <Plus size={16} />
                  Add Category
                </Button>
                <Button onClick={() => setShowAddItem(true)}>
                  <Plus size={16} />
                  Add Item
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : categories.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={Package}
                    title="No linen items"
                    description="Add categories and items to start tracking linens."
                    actionLabel="Add Category"
                    onAction={() => setShowAddCategory(true)}
                  />
                </CardContent>
              </Card>
            ) : (
              categories.map(category => (
                <Card key={category.id}>
                  <CardHeader>
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                          <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {category.items.map(item => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium">{item.name}</td>
                            <td className="px-6 py-3 text-gray-500 font-mono text-sm">{item.code}</td>
                            <td className="px-6 py-3 text-right">{formatCurrency(item.unitCost)}</td>
                          </tr>
                        ))}
                        {category.items.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                              No items in this category
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Per Property Tab */}
        {activeTab === 'property' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Select
                  label=""
                  value={selectedPropertyId}
                  onChange={(e) => handleSelectProperty(e.target.value)}
                  options={[
                    { value: '', label: 'Select a property...' },
                    ...properties.map(p => ({ value: p.id, label: p.name })),
                  ]}
                  className="w-64"
                />
                {hasChanges && (
                  <Badge variant="warning">Unsaved changes</Badge>
                )}
              </div>
              {selectedPropertyId && (
                <Button onClick={savePropertyLinens} disabled={!hasChanges}>
                  <Save size={16} />
                  Save Changes
                </Button>
              )}
            </div>

            {!selectedPropertyId ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Select a property to manage its linen requirements and inventory.
                </CardContent>
              </Card>
            ) : isLoadingProperty ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Loading...
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Per Flip</th>
                        <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">On Hand</th>
                        <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Flips Left</th>
                        <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {propertyLinens.map(linen => {
                        const flipsLeft = linen.perFlip > 0 ? Math.floor(linen.onHand / linen.perFlip) : 0
                        const isLow = linen.perFlip > 0 && flipsLeft < 3

                        return (
                          <tr key={linen.itemId} className={isLow ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="px-6 py-3">
                              <div className="font-medium">{linen.itemName}</div>
                              <div className="text-xs text-gray-500">{linen.category}</div>
                            </td>
                            <td className="px-6 py-3">
                              <input
                                type="number"
                                min="0"
                                value={linen.perFlip}
                                onChange={(e) => updatePropertyLinen(linen.itemId, 'perFlip', e.target.value)}
                                className="w-20 px-2 py-1 border rounded text-center mx-auto block"
                              />
                            </td>
                            <td className="px-6 py-3">
                              <input
                                type="number"
                                min="0"
                                value={linen.onHand}
                                onChange={(e) => updatePropertyLinen(linen.itemId, 'onHand', e.target.value)}
                                className="w-20 px-2 py-1 border rounded text-center mx-auto block"
                              />
                            </td>
                            <td className="px-6 py-3 text-center">
                              {linen.perFlip > 0 ? flipsLeft : '-'}
                            </td>
                            <td className="px-6 py-3 text-center">
                              {linen.perFlip === 0 ? (
                                <span className="text-gray-400">-</span>
                              ) : isLow ? (
                                <Badge variant="danger">Low Stock</Badge>
                              ) : (
                                <Badge variant="success">OK</Badge>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Shopping List Tab */}
        {activeTab === 'shopping' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600">Target flips per property:</label>
                <select
                  value={targetFlips}
                  onChange={(e) => setTargetFlips(parseInt(e.target.value))}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value={3}>3 flips</option>
                  <option value={5}>5 flips</option>
                  <option value={10}>10 flips</option>
                </select>
                <Button variant="outline" onClick={fetchShoppingList}>
                  Refresh
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total Items Needed</div>
                  <div className="text-xl font-bold">{shoppingStats.totalItems}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Estimated Cost</div>
                  <div className="text-xl font-bold text-green-600">{formatCurrency(shoppingStats.totalCost)}</div>
                </div>
              </div>
            </div>

            {isLoadingShopping ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Generating shopping list...
                </CardContent>
              </Card>
            ) : shoppingList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingCart size={48} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="font-semibold text-gray-900 mb-2">All stocked up!</h3>
                  <p className="text-gray-500">
                    All properties have enough linens for {targetFlips} flips.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Properties</th>
                        <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Qty Needed</th>
                        <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                        <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {shoppingList.map(item => (
                        <tr key={item.itemId} className="hover:bg-gray-50">
                          <td className="px-6 py-3">
                            <div className="font-medium">{item.itemName}</div>
                            <div className="text-xs text-gray-500">{item.category} • {item.itemCode}</div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex flex-wrap gap-1">
                              {item.properties.map(p => (
                                <span
                                  key={p.propertyId}
                                  className={`px-2 py-0.5 text-xs rounded ${
                                    p.flipsRemaining <= 1
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}
                                  title={`${p.onHand} on hand, ${p.perFlip} per flip, ${p.flipsRemaining} flips left`}
                                >
                                  {p.propertyName}: {p.needed}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center font-semibold">
                            {item.totalNeeded}
                          </td>
                          <td className="px-6 py-3 text-right text-gray-500">
                            {formatCurrency(item.unitCost)}
                          </td>
                          <td className="px-6 py-3 text-right font-semibold">
                            {formatCurrency(item.totalCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t">
                      <tr>
                        <td colSpan={2} className="px-6 py-3 font-semibold text-right">Total:</td>
                        <td className="px-6 py-3 text-center font-bold">{shoppingStats.totalItems}</td>
                        <td></td>
                        <td className="px-6 py-3 text-right font-bold text-green-600">
                          {formatCurrency(shoppingStats.totalCost)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onSave={handleAddCategory}
      />

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        onSave={handleAddItem}
        categories={categories}
      />
    </div>
  )
}

function AddCategoryModal({ isOpen, onClose, onSave }: {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string) => void
}) {
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) setName('')
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    await onSave(name)
    setIsSaving(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Category">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Sheets, Towels, Pillows"
          required
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSaving}>Add Category</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddItemModal({ isOpen, onClose, onSave, categories }: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { categoryId: string; name: string; code: string; unitCost: string }) => void
  categories: LinenCategory[]
}) {
  const [formData, setFormData] = useState({
    categoryId: '',
    name: '',
    code: '',
    unitCost: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        categoryId: categories[0]?.id || '',
        name: '',
        code: '',
        unitCost: '',
      })
    }
  }, [isOpen, categories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    await onSave(formData)
    setIsSaving(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Linen Item">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Category"
          value={formData.categoryId}
          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
          options={categories.map(c => ({ value: c.id, label: c.name }))}
          required
        />
        <Input
          label="Item Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., King Fitted Sheet"
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Item Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="e.g., KFS"
            required
          />
          <Input
            label="Unit Cost"
            type="number"
            step="0.01"
            value={formData.unitCost}
            onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
            placeholder="0.00"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSaving}>Add Item</Button>
        </div>
      </form>
    </Modal>
  )
}
