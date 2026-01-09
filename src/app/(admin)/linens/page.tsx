'use client'

import { useEffect, useState } from 'react'
import { Package, Plus, Building, ShoppingCart, Save, Pencil, Trash2, X, Check, Sparkles } from 'lucide-react'
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

interface Category {
  id: string
  name: string
  items: Item[]
}

interface Item {
  id: string
  name: string
  code: string
  brand?: string
  unitCost: number
  scope?: string
  owner?: { id: string; name: string }
}

interface Property {
  id: string
  name: string
}

interface PropertyItem {
  itemId: string
  itemName: string
  itemCode: string
  brand?: string
  category: string
  defaultCost: number
  perFlip: number
  unitCost: number | null
  onHand?: number
  room: string
}

interface AvailableItem {
  itemId: string
  itemName: string
  itemCode: string
  brand?: string
  category: string
  defaultCost: number
  onHand?: number
  scope?: string
  ownerName?: string
}

interface ShoppingItem {
  itemId: string
  itemName: string
  itemCode: string
  category: string
  properties: {
    propertyId: string
    propertyName: string
    perFlip: number
    onHand: number
    needed: number
    unitCost: number
    flipsRemaining: number
  }[]
  totalNeeded: number
  totalCost: number
}

type MainTabType = 'catalog' | 'property' | 'shopping'
type CatalogSubTabType = 'linens' | 'supplies'

const ROOM_OPTIONS = [
  'General',
  'Living Room',
  'Kitchen',
  'Master Bedroom',
  'Bedroom 2',
  'Bedroom 3',
  'Bedroom 4',
  'Master Bathroom',
  'Bathroom 2',
  'Bathroom 3',
  'Dining Room',
  'Patio/Deck',
  'Pool Area',
  'Garage',
  'Laundry Room',
  'Entry',
  'Hallway',
  'Other',
]

export default function LinensPage() {
  const [activeTab, setActiveTab] = useState<MainTabType>('catalog')
  const [catalogSubTab, setCatalogSubTab] = useState<CatalogSubTabType>('linens')

  // Linens state
  const [linenCategories, setLinenCategories] = useState<Category[]>([])
  const [isLoadingLinens, setIsLoadingLinens] = useState(true)

  // Supplies state
  const [supplyCategories, setSupplyCategories] = useState<Category[]>([])
  const [isLoadingSupplies, setIsLoadingSupplies] = useState(true)

  const [properties, setProperties] = useState<Property[]>([])

  // Catalog editing states
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editingItemData, setEditingItemData] = useState({ name: '', code: '', brand: '' })

  // Modal states
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [addToCategoryId, setAddToCategoryId] = useState<string>('')

  // Property tab state
  const [propertySubTab, setPropertySubTab] = useState<CatalogSubTabType>('linens')
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [propertyLinens, setPropertyLinens] = useState<PropertyItem[]>([])
  const [propertyLinensByRoom, setPropertyLinensByRoom] = useState<Record<string, PropertyItem[]>>({})
  const [propertySupplies, setPropertySupplies] = useState<PropertyItem[]>([])
  const [propertySuppliesByRoom, setPropertySuppliesByRoom] = useState<Record<string, PropertyItem[]>>({})
  const [availableLinens, setAvailableLinens] = useState<AvailableItem[]>([])
  const [availableSupplies, setAvailableSupplies] = useState<AvailableItem[]>([])
  const [isLoadingProperty, setIsLoadingProperty] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)

  // Shopping list state
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([])
  const [shoppingStats, setShoppingStats] = useState({ totalItems: 0, totalCost: 0 })
  const [targetFlips, setTargetFlips] = useState('5')
  const [isLoadingShopping, setIsLoadingShopping] = useState(false)

  useEffect(() => {
    fetchLinenCategories()
    fetchSupplyCategories()
    fetchProperties()
  }, [])

  const fetchLinenCategories = async () => {
    try {
      const response = await fetch('/api/linens')
      if (response.ok) {
        setLinenCategories(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch linens:', error)
    } finally {
      setIsLoadingLinens(false)
    }
  }

  const fetchSupplyCategories = async () => {
    try {
      const response = await fetch('/api/supplies')
      if (response.ok) {
        setSupplyCategories(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch supplies:', error)
    } finally {
      setIsLoadingSupplies(false)
    }
  }

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties')
      if (response.ok) {
        setProperties(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error)
    }
  }

  // Category CRUD
  const handleAddCategory = async (name: string) => {
    const apiPath = catalogSubTab === 'linens' ? '/api/linens' : '/api/supplies'
    try {
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'category', name }),
      })
      if (response.ok) {
        toast.success('Category added')
        setShowAddCategory(false)
        catalogSubTab === 'linens' ? fetchLinenCategories() : fetchSupplyCategories()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add category')
      }
    } catch (error) {
      toast.error('Failed to add category')
    }
  }

  const handleUpdateCategory = async (categoryId: string) => {
    if (!editingCategoryName.trim()) return
    const apiPath = catalogSubTab === 'linens'
      ? `/api/linens/categories/${categoryId}`
      : `/api/supplies/categories/${categoryId}`
    try {
      const response = await fetch(apiPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCategoryName }),
      })
      if (response.ok) {
        toast.success('Category updated')
        setEditingCategory(null)
        catalogSubTab === 'linens' ? fetchLinenCategories() : fetchSupplyCategories()
      } else {
        toast.error('Failed to update category')
      }
    } catch (error) {
      toast.error('Failed to update category')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Delete this category and all its items?')) return
    const apiPath = catalogSubTab === 'linens'
      ? `/api/linens/categories/${categoryId}`
      : `/api/supplies/categories/${categoryId}`
    try {
      const response = await fetch(apiPath, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Category deleted')
        catalogSubTab === 'linens' ? fetchLinenCategories() : fetchSupplyCategories()
      } else {
        toast.error('Failed to delete category')
      }
    } catch (error) {
      toast.error('Failed to delete category')
    }
  }

  // Item CRUD
  const handleAddItem = async (data: { categoryId: string; name: string; code: string; brand?: string }) => {
    const apiPath = catalogSubTab === 'linens' ? '/api/linens' : '/api/supplies'
    try {
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, unitCost: '0' }),
      })
      if (response.ok) {
        toast.success('Item added')
        setShowAddItem(false)
        catalogSubTab === 'linens' ? fetchLinenCategories() : fetchSupplyCategories()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add item')
      }
    } catch (error) {
      toast.error('Failed to add item')
    }
  }

  const handleUpdateItem = async (itemId: string) => {
    if (!editingItemData.name.trim() || !editingItemData.code.trim()) return
    const apiPath = catalogSubTab === 'linens'
      ? `/api/linens/items/${itemId}`
      : `/api/supplies/items/${itemId}`
    try {
      const response = await fetch(apiPath, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItemData),
      })
      if (response.ok) {
        toast.success('Item updated')
        setEditingItem(null)
        catalogSubTab === 'linens' ? fetchLinenCategories() : fetchSupplyCategories()
      } else {
        toast.error('Failed to update item')
      }
    } catch (error) {
      toast.error('Failed to update item')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this item?')) return
    const apiPath = catalogSubTab === 'linens'
      ? `/api/linens/items/${itemId}`
      : `/api/supplies/items/${itemId}`
    try {
      const response = await fetch(apiPath, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Item deleted')
        catalogSubTab === 'linens' ? fetchLinenCategories() : fetchSupplyCategories()
      } else {
        toast.error('Failed to delete item')
      }
    } catch (error) {
      toast.error('Failed to delete item')
    }
  }

  // Property tab functions
  const fetchPropertyData = async (propertyId: string) => {
    if (!propertyId) return
    setIsLoadingProperty(true)
    try {
      const [linensRes, suppliesRes] = await Promise.all([
        fetch(`/api/linens/property/${propertyId}`),
        fetch(`/api/supplies/property/${propertyId}`),
      ])

      if (linensRes.ok) {
        const data = await linensRes.json()
        setPropertyLinens(data.linens || [])
        setPropertyLinensByRoom(data.byRoom || {})
        setAvailableLinens(data.allItems || [])
      }

      if (suppliesRes.ok) {
        const data = await suppliesRes.json()
        setPropertySupplies(data.supplies || [])
        setPropertySuppliesByRoom(data.byRoom || {})
        setAvailableSupplies(data.allItems || [])
      }

      setHasChanges(false)
    } catch (error) {
      console.error('Failed to fetch property data:', error)
      toast.error('Failed to load property data')
    } finally {
      setIsLoadingProperty(false)
    }
  }

  const handleSelectProperty = (propertyId: string) => {
    setSelectedPropertyId(propertyId)
    if (propertyId) {
      fetchPropertyData(propertyId)
    } else {
      setPropertyLinens([])
      setPropertyLinensByRoom({})
      setPropertySupplies([])
      setPropertySuppliesByRoom({})
      setAvailableLinens([])
      setAvailableSupplies([])
    }
  }

  const updatePropertyItem = (itemId: string, room: string, field: 'perFlip' | 'onHand' | 'unitCost', value: string, type: 'linens' | 'supplies') => {
    const setter = type === 'linens' ? setPropertyLinens : setPropertySupplies
    const byRoomSetter = type === 'linens' ? setPropertyLinensByRoom : setPropertySuppliesByRoom

    setter(prev =>
      prev.map(item =>
        item.itemId === itemId && item.room === room
          ? { ...item, [field]: field === 'unitCost' ? (value ? parseFloat(value) : null) : (parseInt(value) || 0) }
          : item
      )
    )
    byRoomSetter(prev => {
      const newByRoom = { ...prev }
      if (newByRoom[room]) {
        newByRoom[room] = newByRoom[room].map(item =>
          item.itemId === itemId
            ? { ...item, [field]: field === 'unitCost' ? (value ? parseFloat(value) : null) : (parseInt(value) || 0) }
            : item
        )
      }
      return newByRoom
    })
    setHasChanges(true)
  }

  const handleAddItemToRoom = async (itemId: string, room: string, perFlip: number, type: 'linens' | 'supplies') => {
    if (!selectedPropertyId) return
    const apiPath = type === 'linens'
      ? `/api/linens/property/${selectedPropertyId}`
      : `/api/supplies/property/${selectedPropertyId}`
    const bodyKey = type === 'linens' ? 'linens' : 'supplies'

    try {
      const response = await fetch(apiPath, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [bodyKey]: [{ itemId, room, perFlip }],
        }),
      })
      if (response.ok) {
        toast.success(`${type === 'linens' ? 'Linen' : 'Supply'} added to room`)
        fetchPropertyData(selectedPropertyId)
      } else {
        toast.error('Failed to add item')
      }
    } catch (error) {
      toast.error('Failed to add item')
    }
  }

  const handleDeleteItemFromRoom = async (itemId: string, room: string, type: 'linens' | 'supplies') => {
    if (!selectedPropertyId) return
    const apiPath = type === 'linens'
      ? `/api/linens/property/${selectedPropertyId}?itemId=${itemId}&room=${encodeURIComponent(room)}`
      : `/api/supplies/property/${selectedPropertyId}?itemId=${itemId}&room=${encodeURIComponent(room)}`

    try {
      const response = await fetch(apiPath, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Item removed from room')
        fetchPropertyData(selectedPropertyId)
      } else {
        toast.error('Failed to remove item')
      }
    } catch (error) {
      toast.error('Failed to remove item')
    }
  }

  const savePropertyChanges = async () => {
    if (!selectedPropertyId) return
    try {
      const [linensRes, suppliesRes] = await Promise.all([
        fetch(`/api/linens/property/${selectedPropertyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            linens: propertyLinens.map(l => ({
              itemId: l.itemId,
              perFlip: l.perFlip,
              onHand: l.onHand,
              unitCost: l.unitCost,
              room: l.room,
            })),
          }),
        }),
        fetch(`/api/supplies/property/${selectedPropertyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplies: propertySupplies.map(s => ({
              itemId: s.itemId,
              perFlip: s.perFlip,
              unitCost: s.unitCost,
              room: s.room,
            })),
          }),
        }),
      ])

      if (linensRes.ok && suppliesRes.ok) {
        toast.success('Saved')
        setHasChanges(false)
      } else {
        toast.error('Failed to save some changes')
      }
    } catch (error) {
      toast.error('Failed to save')
    }
  }

  // Shopping list
  const fetchShoppingList = async () => {
    const flips = parseInt(targetFlips) || 5
    setIsLoadingShopping(true)
    try {
      const response = await fetch(`/api/linens/shopping-list?targetFlips=${flips}`)
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

  useEffect(() => {
    if (activeTab === 'shopping') {
      fetchShoppingList()
    }
  }, [activeTab])

  const categories = catalogSubTab === 'linens' ? linenCategories : supplyCategories
  const isLoadingCatalog = catalogSubTab === 'linens' ? isLoadingLinens : isLoadingSupplies

  const mainTabs = [
    { id: 'catalog' as MainTabType, label: 'Item Catalog', icon: Package },
    { id: 'property' as MainTabType, label: 'Property Setup', icon: Building },
    { id: 'shopping' as MainTabType, label: 'Shopping List', icon: ShoppingCart },
  ]

  return (
    <div className="min-h-screen">
      <AdminHeader title="Linens & Supplies" />

      <div className="p-6">
        {/* Main Tabs */}
        <div className="flex gap-2 mb-6">
          {mainTabs.map(tab => (
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

        {/* Catalog Tab */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            {/* Sub-tabs for Linens vs Supplies */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setCatalogSubTab('linens')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    catalogSubTab === 'linens'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Package size={16} className="inline mr-2" />
                  Linens
                </button>
                <button
                  onClick={() => setCatalogSubTab('supplies')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    catalogSubTab === 'supplies'
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Sparkles size={16} className="inline mr-2" />
                  Supplies
                </button>
              </div>
              <Button onClick={() => setShowAddCategory(true)}>
                <Plus size={16} />
                Add Category
              </Button>
            </div>

            <p className="text-gray-600 text-sm">
              {catalogSubTab === 'linens'
                ? 'Manage your linen catalog (sheets, towels, pillowcases, etc.). These are reusable textiles.'
                : 'Manage your supply catalog (cleaning products, toiletries, etc.). These are consumable items.'
              }
            </p>

            {isLoadingCatalog ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : categories.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={catalogSubTab === 'linens' ? Package : Sparkles}
                    title={`No ${catalogSubTab} categories yet`}
                    description={`Create categories to organize your ${catalogSubTab}.`}
                    actionLabel="Add Category"
                    onAction={() => setShowAddCategory(true)}
                  />
                </CardContent>
              </Card>
            ) : (
              categories.map(category => (
                <Card key={category.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    {editingCategory === category.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          className="w-48"
                          autoFocus
                        />
                        <Button size="sm" onClick={() => handleUpdateCategory(category.id)}>
                          <Check size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingCategory(null)}>
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                        <button
                          onClick={() => {
                            setEditingCategory(category.id)
                            setEditingCategoryName(category.name)
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAddToCategoryId(category.id)
                        setShowAddItem(true)
                      }}
                    >
                      <Plus size={14} />
                      Add Item
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Item Name</th>
                          <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                          {catalogSubTab === 'supplies' && (
                            <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Brand</th>
                          )}
                          <th className="w-24"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {category.items.map(item => (
                          <tr key={item.id} className="hover:bg-gray-50 group">
                            {editingItem === item.id ? (
                              <>
                                <td className="px-6 py-2">
                                  <Input
                                    value={editingItemData.name}
                                    onChange={(e) => setEditingItemData({ ...editingItemData, name: e.target.value })}
                                    className="w-full"
                                  />
                                </td>
                                <td className="px-6 py-2">
                                  <Input
                                    value={editingItemData.code}
                                    onChange={(e) => setEditingItemData({ ...editingItemData, code: e.target.value.toUpperCase() })}
                                    className="w-24"
                                  />
                                </td>
                                {catalogSubTab === 'supplies' && (
                                  <td className="px-6 py-2">
                                    <Input
                                      value={editingItemData.brand}
                                      onChange={(e) => setEditingItemData({ ...editingItemData, brand: e.target.value })}
                                      className="w-32"
                                      placeholder="Brand"
                                    />
                                  </td>
                                )}
                                <td className="px-6 py-2">
                                  <div className="flex gap-1">
                                    <Button size="sm" onClick={() => handleUpdateItem(item.id)}>
                                      <Check size={14} />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>
                                      <X size={14} />
                                    </Button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-6 py-3">
                                  <span className="font-medium">{item.name}</span>
                                  {item.scope === 'owner' && item.owner && (
                                    <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                                      {item.owner.name}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-3 text-gray-500 font-mono text-sm">{item.code}</td>
                                {catalogSubTab === 'supplies' && (
                                  <td className="px-6 py-3 text-gray-500 text-sm">{item.brand || '-'}</td>
                                )}
                                <td className="px-6 py-3">
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                    <button
                                      onClick={() => {
                                        setEditingItem(item.id)
                                        setEditingItemData({ name: item.name, code: item.code, brand: item.brand || '' })
                                      }}
                                      className="p-1 text-gray-400 hover:text-gray-600"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="p-1 text-gray-400 hover:text-red-600"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                        {category.items.length === 0 && (
                          <tr>
                            <td colSpan={catalogSubTab === 'supplies' ? 4 : 3} className="px-6 py-8 text-center text-gray-500">
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

        {/* Property Setup Tab */}
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
                {hasChanges && <Badge variant="warning">Unsaved changes</Badge>}
              </div>
              <div className="flex gap-2">
                {selectedPropertyId && (
                  <>
                    <Button variant="outline" onClick={() => setShowAddItemModal(true)}>
                      <Plus size={16} />
                      Add Item to Room
                    </Button>
                    <Button onClick={savePropertyChanges} disabled={!hasChanges}>
                      <Save size={16} />
                      Save Changes
                    </Button>
                  </>
                )}
              </div>
            </div>

            {selectedPropertyId && (
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setPropertySubTab('linens')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    propertySubTab === 'linens'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Linens ({propertyLinens.length})
                </button>
                <button
                  onClick={() => setPropertySubTab('supplies')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    propertySubTab === 'supplies'
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Supplies ({propertySupplies.length})
                </button>
              </div>
            )}

            {!selectedPropertyId ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Select a property to configure its room-based requirements.
                </CardContent>
              </Card>
            ) : isLoadingProperty ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">Loading...</CardContent>
              </Card>
            ) : (
              <>
                {/* Linens View */}
                {propertySubTab === 'linens' && (
                  propertyLinens.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Package size={48} className="mx-auto mb-4 text-gray-300" />
                        <h3 className="font-semibold text-gray-900 mb-2">No linens assigned</h3>
                        <p className="text-gray-500 mb-4">Add linens to specific rooms for this property.</p>
                        <Button onClick={() => setShowAddItemModal(true)}>
                          <Plus size={16} />
                          Add Linen to Room
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(propertyLinensByRoom).map(([room, roomItems]) => (
                        <PropertyRoomCard
                          key={room}
                          room={room}
                          items={roomItems}
                          type="linens"
                          showOnHand={true}
                          onUpdate={(itemId, field, value) => updatePropertyItem(itemId, room, field, value, 'linens')}
                          onDelete={(itemId) => handleDeleteItemFromRoom(itemId, room, 'linens')}
                        />
                      ))}
                    </div>
                  )
                )}

                {/* Supplies View */}
                {propertySubTab === 'supplies' && (
                  propertySupplies.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Sparkles size={48} className="mx-auto mb-4 text-gray-300" />
                        <h3 className="font-semibold text-gray-900 mb-2">No supplies assigned</h3>
                        <p className="text-gray-500 mb-4">Add supplies to specific rooms for this property.</p>
                        <Button onClick={() => setShowAddItemModal(true)}>
                          <Plus size={16} />
                          Add Supply to Room
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(propertySuppliesByRoom).map(([room, roomItems]) => (
                        <PropertyRoomCard
                          key={room}
                          room={room}
                          items={roomItems}
                          type="supplies"
                          showOnHand={false}
                          onUpdate={(itemId, field, value) => updatePropertyItem(itemId, room, field, value, 'supplies')}
                          onDelete={(itemId) => handleDeleteItemFromRoom(itemId, room, 'supplies')}
                        />
                      ))}
                    </div>
                  )
                )}
              </>
            )}
          </div>
        )}

        {/* Add Item to Room Modal */}
        <AddItemToRoomModal
          isOpen={showAddItemModal}
          onClose={() => setShowAddItemModal(false)}
          onSave={handleAddItemToRoom}
          availableLinens={availableLinens}
          availableSupplies={availableSupplies}
          existingLinens={propertyLinens}
          existingSupplies={propertySupplies}
          defaultType={propertySubTab}
        />

        {/* Shopping List Tab */}
        {activeTab === 'shopping' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600">Target flips per property:</label>
                <Input
                  type="number"
                  min="1"
                  value={targetFlips}
                  onChange={(e) => setTargetFlips(e.target.value)}
                  className="w-20"
                />
                <Button variant="outline" onClick={fetchShoppingList}>
                  Generate List
                </Button>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Items Needed</div>
                  <div className="text-xl font-bold">{shoppingStats.totalItems}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Est. Cost</div>
                  <div className="text-xl font-bold text-green-600">{formatCurrency(shoppingStats.totalCost)}</div>
                </div>
              </div>
            </div>

            {isLoadingShopping ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">Generating shopping list...</CardContent>
              </Card>
            ) : shoppingList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingCart size={48} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="font-semibold text-gray-900 mb-2">All stocked up!</h3>
                  <p className="text-gray-500">All properties have enough for {targetFlips} flips.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Properties Needing</th>
                        <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Est. Total</th>
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
                                    p.flipsRemaining <= 1 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                  }`}
                                  title={`Need ${p.needed} @ ${formatCurrency(p.unitCost)} each`}
                                >
                                  {p.propertyName}: {p.needed}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center font-semibold">{item.totalNeeded}</td>
                          <td className="px-6 py-3 text-right font-semibold">{formatCurrency(item.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t">
                      <tr>
                        <td colSpan={2} className="px-6 py-3 font-semibold text-right">Total:</td>
                        <td className="px-6 py-3 text-center font-bold">{shoppingStats.totalItems}</td>
                        <td className="px-6 py-3 text-right font-bold text-green-600">{formatCurrency(shoppingStats.totalCost)}</td>
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
        type={catalogSubTab}
      />

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        onSave={handleAddItem}
        categoryId={addToCategoryId}
        categories={categories}
        type={catalogSubTab}
      />
    </div>
  )
}

// Property Room Card Component
function PropertyRoomCard({ room, items, type, showOnHand, onUpdate, onDelete }: {
  room: string
  items: PropertyItem[]
  type: 'linens' | 'supplies'
  showOnHand: boolean
  onUpdate: (itemId: string, field: 'perFlip' | 'onHand' | 'unitCost', value: string) => void
  onDelete: (itemId: string) => void
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          {type === 'linens' ? <Package size={18} className="text-blue-600" /> : <Sparkles size={18} className="text-emerald-600" />}
          {room}
          <span className="text-sm font-normal text-gray-500">
            ({items.length} {items.length === 1 ? 'item' : 'items'})
          </span>
        </h3>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Item</th>
              <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase w-20">Qty/Flip</th>
              <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase w-24">Unit Cost</th>
              {showOnHand && (
                <>
                  <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase w-20">On Hand</th>
                  <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase w-16">Flips</th>
                  <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase w-16">Status</th>
                </>
              )}
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map(item => {
              const flipsLeft = showOnHand && item.perFlip > 0 ? Math.floor((item.onHand || 0) / item.perFlip) : 0
              const isLow = showOnHand && item.perFlip > 0 && flipsLeft < 3

              return (
                <tr key={`${item.itemId}-${room}`} className={isLow ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-sm">{item.itemName}</div>
                    <div className="text-xs text-gray-500">{item.category}</div>
                  </td>
                  <td className="px-4 py-1">
                    <input
                      type="number"
                      min="1"
                      value={item.perFlip}
                      onChange={(e) => onUpdate(item.itemId, 'perFlip', e.target.value)}
                      className="w-full px-2 py-1 border rounded text-center text-sm"
                    />
                  </td>
                  <td className="px-4 py-1">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost ?? ''}
                        onChange={(e) => onUpdate(item.itemId, 'unitCost', e.target.value)}
                        placeholder={item.defaultCost?.toFixed(2) || '0.00'}
                        className="w-full px-2 py-1 pl-5 border rounded text-center text-sm"
                      />
                    </div>
                  </td>
                  {showOnHand && (
                    <>
                      <td className="px-4 py-1">
                        <input
                          type="number"
                          min="0"
                          value={item.onHand || 0}
                          onChange={(e) => onUpdate(item.itemId, 'onHand', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-center text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-center font-medium text-sm">
                        {flipsLeft}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {isLow ? (
                          <Badge variant="danger">Low</Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-2">
                    <button
                      onClick={() => onDelete(item.itemId)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Remove from room"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function AddCategoryModal({ isOpen, onClose, onSave, type }: {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string) => void
  type: 'linens' | 'supplies'
}) {
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) setName('')
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave(name)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add ${type === 'linens' ? 'Linen' : 'Supply'} Category`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Category Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === 'linens' ? 'e.g., Sheets, Towels, Pillowcases' : 'e.g., Cleaning Products, Toiletries, Paper Goods'}
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

function AddItemModal({ isOpen, onClose, onSave, categoryId, categories, type }: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { categoryId: string; name: string; code: string; brand?: string }) => void
  categoryId: string
  categories: Category[]
  type: 'linens' | 'supplies'
}) {
  const [formData, setFormData] = useState({ categoryId: '', name: '', code: '', brand: '' })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({ categoryId: categoryId || categories[0]?.id || '', name: '', code: '', brand: '' })
    }
  }, [isOpen, categoryId, categories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave(formData)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add ${type === 'linens' ? 'Linen' : 'Supply'} Item`}>
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
          placeholder={type === 'linens' ? 'e.g., King Fitted Sheet' : 'e.g., All-Purpose Cleaner'}
          required
        />
        <Input
          label="Item Code"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          placeholder="e.g., KFS"
          required
        />
        {type === 'supplies' && (
          <Input
            label="Brand (optional)"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            placeholder="e.g., Method, Mrs. Meyer's"
          />
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSaving}>Add Item</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddItemToRoomModal({ isOpen, onClose, onSave, availableLinens, availableSupplies, existingLinens, existingSupplies, defaultType }: {
  isOpen: boolean
  onClose: () => void
  onSave: (itemId: string, room: string, perFlip: number, type: 'linens' | 'supplies') => void
  availableLinens: AvailableItem[]
  availableSupplies: AvailableItem[]
  existingLinens: PropertyItem[]
  existingSupplies: PropertyItem[]
  defaultType: 'linens' | 'supplies'
}) {
  const [itemType, setItemType] = useState<'linens' | 'supplies'>(defaultType)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [selectedRoom, setSelectedRoom] = useState('General')
  const [perFlip, setPerFlip] = useState('1')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setItemType(defaultType)
      setSelectedItemId('')
      setSelectedRoom('General')
      setPerFlip('1')
    }
  }, [isOpen, defaultType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItemId || !selectedRoom) return

    setIsSaving(true)
    try {
      await onSave(selectedItemId, selectedRoom, parseInt(perFlip) || 1, itemType)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const availableItems = itemType === 'linens' ? availableLinens : availableSupplies
  const existingItems = itemType === 'linens' ? existingLinens : existingSupplies

  // Filter out items already in the selected room
  const itemsNotInRoom = availableItems.filter(
    item => !existingItems.some(l => l.itemId === item.itemId && l.room === selectedRoom)
  )

  // Group by category
  const itemsByCategory = itemsNotInRoom.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, AvailableItem[]>)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Item to Room">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => { setItemType('linens'); setSelectedItemId('') }}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              itemType === 'linens'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Linen
          </button>
          <button
            type="button"
            onClick={() => { setItemType('supplies'); setSelectedItemId('') }}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              itemType === 'supplies'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Supply
          </button>
        </div>

        <Select
          label="Room"
          value={selectedRoom}
          onChange={(e) => {
            setSelectedRoom(e.target.value)
            setSelectedItemId('')
          }}
          options={ROOM_OPTIONS.map(room => ({ value: room, label: room }))}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {itemType === 'linens' ? 'Linen' : 'Supply'} Item
          </label>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select an item...</option>
            {Object.entries(itemsByCategory).map(([category, items]) => (
              <optgroup key={category} label={category}>
                {items.map(item => (
                  <option key={item.itemId} value={item.itemId}>
                    {item.itemName} ({item.itemCode})
                    {item.ownerName && ` - ${item.ownerName}`}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {itemsNotInRoom.length === 0 && (
            <p className="text-sm text-amber-600 mt-1">
              All {itemType} are already assigned to {selectedRoom}
            </p>
          )}
        </div>

        <Input
          label="Quantity per Flip"
          type="number"
          min="1"
          value={perFlip}
          onChange={(e) => setPerFlip(e.target.value)}
          required
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            isLoading={isSaving}
            disabled={!selectedItemId || itemsNotInRoom.length === 0}
          >
            Add to Room
          </Button>
        </div>
      </form>
    </Modal>
  )
}
