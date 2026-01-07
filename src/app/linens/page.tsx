'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import StatCard from '@/components/ui/StatCard'
import { formatCurrency } from '@/lib/utils'
import {
  Package,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ShoppingCart,
  Home,
  Minus,
  Plus,
  Save,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface LinenCategory {
  id: string
  name: string
  sortOrder: number
  items: LinenItem[]
}

interface LinenItem {
  id: string
  name: string
  code: string
  unitCost: number
  perFlip: number
  target: number
  onHand: number
  status: 'ok' | 'low' | 'not-required'
  deficit: number
}

interface Property {
  id: string
  name: string
}

interface ShoppingListItem {
  linenItem: {
    id: string
    name: string
    code: string
    unitCost: number
    category: string
  }
  totalNeeded: number
  totalCost: number
  properties: Array<{
    property: { id: string; name: string }
    needed: number
  }>
}

interface ShoppingListData {
  byItem: ShoppingListItem[]
  grandTotal: number
  itemCount: number
}

export default function LinensPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'inventory' | 'shopping'>('inventory')
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedProperty, setSelectedProperty] = useState('')
  const [categories, setCategories] = useState<LinenCategory[]>([])
  const [shoppingList, setShoppingList] = useState<ShoppingListData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editedItems, setEditedItems] = useState<Record<string, { perFlip?: number; onHand?: number }>>({})

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProperties()
    }
  }, [status])

  useEffect(() => {
    if (status === 'authenticated' && activeTab === 'shopping') {
      fetchShoppingList()
    }
  }, [activeTab, status])

  useEffect(() => {
    if (selectedProperty) {
      fetchPropertyLinens()
    }
  }, [selectedProperty])

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties')
      if (response.ok) {
        const data = await response.json()
        setProperties(data)
        if (data.length > 0) {
          setSelectedProperty(data[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPropertyLinens = async () => {
    if (!selectedProperty) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/properties/${selectedProperty}/linens`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
        setEditedItems({})
      }
    } catch (error) {
      console.error('Failed to fetch linens:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchShoppingList = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/linens/shopping-list')
      if (response.ok) {
        const data = await response.json()
        setShoppingList(data)
      }
    } catch (error) {
      console.error('Failed to fetch shopping list:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemChange = (itemId: string, field: 'perFlip' | 'onHand', value: number) => {
    setEditedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }))
  }

  const incrementValue = (itemId: string, field: 'perFlip' | 'onHand', currentValue: number) => {
    handleItemChange(itemId, field, currentValue + 1)
  }

  const decrementValue = (itemId: string, field: 'perFlip' | 'onHand', currentValue: number) => {
    if (currentValue > 0) {
      handleItemChange(itemId, field, currentValue - 1)
    }
  }

  const handleSave = async () => {
    if (!selectedProperty || Object.keys(editedItems).length === 0) return

    setIsSaving(true)
    try {
      const requirements: { linenItemId: string; perFlip: number }[] = []
      const inventory: { linenItemId: string; onHand: number }[] = []

      for (const [itemId, changes] of Object.entries(editedItems)) {
        if (changes.perFlip !== undefined) {
          requirements.push({ linenItemId: itemId, perFlip: changes.perFlip })
        }
        if (changes.onHand !== undefined) {
          inventory.push({ linenItemId: itemId, onHand: changes.onHand })
        }
      }

      const response = await fetch(`/api/properties/${selectedProperty}/linens`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements, inventory }),
      })

      if (response.ok) {
        toast.success('Linen inventory updated')
        setEditedItems({})
        fetchPropertyLinens()
      } else {
        toast.error('Failed to update inventory')
      }
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error('Failed to update inventory')
    } finally {
      setIsSaving(false)
    }
  }

  const getItemValue = (item: LinenItem, field: 'perFlip' | 'onHand') => {
    if (editedItems[item.id]?.[field] !== undefined) {
      return editedItems[item.id][field]!
    }
    return item[field]
  }

  const getTotalItems = () => categories.reduce((sum, cat) => sum + cat.items.length, 0)
  const getLowStockCount = () => categories.reduce((sum, cat) =>
    sum + cat.items.filter((item) => item.status === 'low').length, 0)

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
      <Header title="Linen Inventory" />

      <div className="page-container">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 -mb-px font-medium text-sm ${
              activeTab === 'inventory'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('shopping')}
            className={`px-4 py-2 -mb-px font-medium text-sm ${
              activeTab === 'shopping'
                ? 'border-b-2 border-indigo-500 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4 inline mr-2" />
            Shopping List
          </button>
        </div>

        {activeTab === 'inventory' ? (
          <>
            {/* Property Selector and Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
              <Card className="lg:col-span-2">
                <CardContent className="p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Property
                  </label>
                  <Select
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </CardContent>
              </Card>
              <StatCard
                title="Total Items"
                value={String(getTotalItems())}
                icon={Package}
                iconColor="text-blue-600 bg-blue-100"
              />
              <StatCard
                title="Low Stock"
                value={String(getLowStockCount())}
                icon={AlertTriangle}
                iconColor="text-yellow-600 bg-yellow-100"
              />
            </div>

            {/* Save Button */}
            {Object.keys(editedItems).length > 0 && (
              <div className="mb-4 flex justify-end">
                <Button onClick={handleSave} isLoading={isSaving}>
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            )}

            {/* Inventory Matrix */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="space-y-6">
                {categories.map((category) => (
                  <Card key={category.id}>
                    <CardHeader>
                      <CardTitle>{category.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b">
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Item</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Code</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Per Flip</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Target (2x)</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">On Hand</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {category.items.map((item) => {
                              const perFlip = getItemValue(item, 'perFlip')
                              const onHand = getItemValue(item, 'onHand')
                              const target = perFlip * 2
                              const currentStatus = target === 0 ? 'not-required' : (onHand >= target ? 'ok' : 'low')

                              return (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3">
                                    <span className="font-medium text-gray-900">{item.name}</span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="text-sm text-gray-500">{item.code}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => decrementValue(item.id, 'perFlip', perFlip)}
                                        className="p-1 rounded hover:bg-gray-200"
                                      >
                                        <Minus className="w-4 h-4 text-gray-500" />
                                      </button>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={perFlip}
                                        onChange={(e) => handleItemChange(item.id, 'perFlip', parseInt(e.target.value) || 0)}
                                        className="w-16 text-center"
                                      />
                                      <button
                                        onClick={() => incrementValue(item.id, 'perFlip', perFlip)}
                                        className="p-1 rounded hover:bg-gray-200"
                                      >
                                        <Plus className="w-4 h-4 text-gray-500" />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="font-medium text-gray-700">{target}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => decrementValue(item.id, 'onHand', onHand)}
                                        className="p-1 rounded hover:bg-gray-200"
                                      >
                                        <Minus className="w-4 h-4 text-gray-500" />
                                      </button>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={onHand}
                                        onChange={(e) => handleItemChange(item.id, 'onHand', parseInt(e.target.value) || 0)}
                                        className="w-16 text-center"
                                      />
                                      <button
                                        onClick={() => incrementValue(item.id, 'onHand', onHand)}
                                        className="p-1 rounded hover:bg-gray-200"
                                      >
                                        <Plus className="w-4 h-4 text-gray-500" />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {currentStatus === 'ok' && (
                                      <Badge variant="success">
                                        <CheckCircle className="w-3 h-3" />
                                        OK
                                      </Badge>
                                    )}
                                    {currentStatus === 'low' && (
                                      <Badge variant="warning">
                                        <AlertTriangle className="w-3 h-3" />
                                        Low
                                      </Badge>
                                    )}
                                    {currentStatus === 'not-required' && (
                                      <span className="text-gray-400 text-sm">-</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {categories.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Select a property to view linen inventory</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Shopping List View */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : shoppingList ? (
              <>
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <StatCard
                    title="Items to Buy"
                    value={String(shoppingList.itemCount)}
                    icon={Package}
                    iconColor="text-blue-600 bg-blue-100"
                  />
                  <StatCard
                    title="Properties Affected"
                    value={String(new Set(shoppingList.byItem.flatMap((i) => i.properties.map((p) => p.property.id))).size)}
                    icon={Home}
                    iconColor="text-purple-600 bg-purple-100"
                  />
                  <StatCard
                    title="Estimated Cost"
                    value={formatCurrency(shoppingList.grandTotal)}
                    icon={ShoppingCart}
                    iconColor="text-green-600 bg-green-100"
                  />
                </div>

                {/* Shopping List Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Shopping List</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {shoppingList.byItem.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b">
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Item</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Category</th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Total Needed</th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Unit Cost</th>
                              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Total Cost</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Properties</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {shoppingList.byItem.map((item) => (
                              <tr key={item.linenItem.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                  <div>
                                    <span className="font-medium text-gray-900">{item.linenItem.name}</span>
                                    <span className="text-sm text-gray-500 ml-2">({item.linenItem.code})</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-gray-600">{item.linenItem.category}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge variant="warning">{item.totalNeeded}</Badge>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-sm text-gray-600">{formatCurrency(item.linenItem.unitCost)}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="font-medium text-gray-900">{formatCurrency(item.totalCost)}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-wrap gap-1">
                                    {item.properties.map((p) => (
                                      <Badge key={p.property.id} variant="default" size="sm">
                                        {p.property.name} ({p.needed})
                                      </Badge>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50 border-t-2">
                              <td colSpan={4} className="px-4 py-3 text-right font-medium text-gray-900">
                                Grand Total:
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-green-600">
                                {formatCurrency(shoppingList.grandTotal)}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
                        <p>All linen inventory is fully stocked!</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Loading shopping list...</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
