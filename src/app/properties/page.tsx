'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal, { ModalFooter } from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { formatCurrency } from '@/lib/utils'
import {
  Home,
  Plus,
  Search,
  MapPin,
  Phone,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Square,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Property {
  id: string
  name: string
  address: string
  squareFootage?: number
  baseRate: number
  notes?: string
  active: boolean
  owner?: {
    id: string
    name: string
    phone?: string
    email?: string
  }
  group?: {
    id: string
    name: string
    color?: string
  }
  _count: {
    jobs: number
    linens: number
    propertySupplies: number
    photos: number
  }
}

interface PropertyFormData {
  name: string
  address: string
  squareFootage: string
  baseRate: string
  notes: string
  active: boolean
}

export default function PropertiesPage() {
  const searchParams = useSearchParams()
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    address: '',
    squareFootage: '',
    baseRate: '',
    notes: '',
    active: true,
  })

  useEffect(() => {
    fetchProperties()
    if (searchParams.get('action') === 'new') {
      setIsModalOpen(true)
    }
  }, [searchParams])

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties')
      if (response.ok) {
        const data = await response.json()
        setProperties(data)
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error)
      toast.error('Failed to load properties')
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
        address: formData.address,
        squareFootage: formData.squareFootage ? parseInt(formData.squareFootage) : null,
        baseRate: formData.baseRate ? parseFloat(formData.baseRate) : 0,
        notes: formData.notes || null,
        active: formData.active,
      }

      const url = editingProperty
        ? `/api/properties/${editingProperty.id}`
        : '/api/properties'
      const method = editingProperty ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success(editingProperty ? 'Property updated' : 'Property created')
        setIsModalOpen(false)
        resetForm()
        fetchProperties()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save property')
      }
    } catch (error) {
      console.error('Failed to save property:', error)
      toast.error('Failed to save property')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (property: Property) => {
    if (!confirm(`Are you sure you want to delete "${property.name}"?`)) return

    try {
      const response = await fetch(`/api/properties/${property.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Property deleted')
        fetchProperties()
      } else {
        toast.error('Failed to delete property')
      }
    } catch (error) {
      console.error('Failed to delete property:', error)
      toast.error('Failed to delete property')
    }
  }

  const openEditModal = (property: Property) => {
    setEditingProperty(property)
    setFormData({
      name: property.name,
      address: property.address,
      squareFootage: property.squareFootage?.toString() || '',
      baseRate: property.baseRate.toString(),
      notes: property.notes || '',
      active: property.active,
    })
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setEditingProperty(null)
    setFormData({
      name: '',
      address: '',
      squareFootage: '',
      baseRate: '',
      notes: '',
      active: true,
    })
  }

  const filteredProperties = properties.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout>
      <Header title="Properties" />

      <div className="page-container">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search properties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Add Property
          </Button>
        </div>

        {/* Properties List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredProperties.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead align="right">Base Rate</TableHead>
                    <TableHead align="center">Jobs</TableHead>
                    <TableHead align="center">Status</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Home className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/properties/${property.id}`}
                              className="font-medium text-gray-900 hover:text-indigo-600"
                            >
                              {property.name}
                            </Link>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{property.address}</span>
                            </div>
                            {property.squareFootage && (
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Square className="w-3 h-3" />
                                {property.squareFootage.toLocaleString()} sq ft
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {property.owner ? (
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">{property.owner.name}</p>
                            {property.owner.phone && (
                              <p className="text-gray-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {property.owner.phone}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">No owner</span>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <span className="font-medium">{formatCurrency(property.baseRate)}</span>
                      </TableCell>
                      <TableCell align="center">
                        <Badge variant="info">{property._count.jobs}</Badge>
                      </TableCell>
                      <TableCell align="center">
                        <Badge variant={property.active ? 'success' : 'default'}>
                          {property.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/properties/${property.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(property)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(property)}
                          >
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
                icon={Home}
                title="No properties yet"
                description="Add your first property to start managing your cleaning business."
                action={{
                  label: 'Add Property',
                  onClick: () => setIsModalOpen(true),
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Property Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingProperty ? 'Edit Property' : 'Add Property'}
        description="Enter the property details below."
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Property Name"
              placeholder="Beach House, Downtown Condo..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              label="Address"
              placeholder="123 Main St, City, State 12345"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Square Footage"
                type="number"
                placeholder="1500"
                value={formData.squareFootage}
                onChange={(e) => setFormData({ ...formData, squareFootage: e.target.value })}
              />

              <Input
                label="Base Rate ($)"
                type="number"
                step="0.01"
                placeholder="150.00"
                value={formData.baseRate}
                onChange={(e) => setFormData({ ...formData, baseRate: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notes
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
                placeholder="Special instructions, access codes, etc."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <label htmlFor="active" className="text-sm text-gray-700">
                Active property
              </label>
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingProperty ? 'Update' : 'Create'} Property
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
