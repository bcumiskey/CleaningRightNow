'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, Mail, Phone, Building, ChevronRight, Trash2 } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Property {
  id: string
  name: string
  address: string
  baseRate: number
}

interface Owner {
  id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  defaultBaseRate: number | null
  defaultBillingType: string | null
  preferredContactMethod: string | null
  properties: Property[]
  _count: { properties: number }
}

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null)
  const [expandedOwner, setExpandedOwner] = useState<string | null>(null)

  useEffect(() => {
    fetchOwners()
  }, [])

  const fetchOwners = async () => {
    try {
      const response = await fetch('/api/owners')
      if (response.ok) {
        const data = await response.json()
        setOwners(data)
      }
    } catch (error) {
      console.error('Failed to fetch owners:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingOwner(null)
    setShowModal(true)
  }

  const handleEdit = (owner: Owner, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingOwner(owner)
    setShowModal(true)
  }

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      const url = editingOwner ? `/api/owners/${editingOwner.id}` : '/api/owners'
      const method = editingOwner ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success(editingOwner ? 'Owner updated' : 'Owner created')
        setShowModal(false)
        fetchOwners()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save owner')
      }
    } catch (error) {
      toast.error('Failed to save owner')
    }
  }

  const handleDelete = async (owner: Owner, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete owner "${owner.name}"? This cannot be undone.`)) return

    try {
      const response = await fetch(`/api/owners/${owner.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Owner deleted')
        fetchOwners()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete owner')
      }
    } catch (error) {
      toast.error('Failed to delete owner')
    }
  }

  const toggleExpand = (ownerId: string) => {
    setExpandedOwner(expandedOwner === ownerId ? null : ownerId)
  }

  const totalProperties = owners.reduce((sum, o) => sum + o._count.properties, 0)

  return (
    <div className="min-h-screen">
      <AdminHeader title="Property Owners" />

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {owners.length} Owners
            </h3>
            <p className="text-sm text-gray-500">
              Managing {totalProperties} properties
            </p>
          </div>
          <Button onClick={handleAdd}>
            <Plus size={16} />
            Add Owner
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : owners.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Users}
                title="No owners yet"
                description="Add property owners to group and manage multiple properties together."
                actionLabel="Add Owner"
                onAction={handleAdd}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {owners.map((owner) => (
              <Card key={owner.id} className="overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(owner.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{owner.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {owner.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} />
                            {owner.email}
                          </span>
                        )}
                        {owner.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} />
                            {owner.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge variant="info">
                      {owner._count.properties} {owner._count.properties === 1 ? 'property' : 'properties'}
                    </Badge>
                    {owner.defaultBaseRate && (
                      <span className="text-sm text-gray-600">
                        Default: {formatCurrency(owner.defaultBaseRate)}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleEdit(owner, e)}
                      >
                        Edit
                      </Button>
                      {owner._count.properties === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(owner, e)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                    <ChevronRight
                      size={20}
                      className={`text-gray-400 transition-transform ${
                        expandedOwner === owner.id ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded Properties List */}
                {expandedOwner === owner.id && (
                  <div className="border-t bg-gray-50 p-4">
                    {owner.properties.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No properties linked to this owner yet.
                        <br />
                        Link properties from the Properties page.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {owner.properties.map((property) => (
                          <div
                            key={property.id}
                            className="bg-white p-3 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-start gap-2">
                              <Building size={16} className="text-gray-400 mt-0.5" />
                              <div>
                                <p className="font-medium text-gray-900 text-sm">
                                  {property.name}
                                </p>
                                <p className="text-xs text-gray-500">{property.address}</p>
                                <p className="text-sm font-medium text-gray-700 mt-1">
                                  {formatCurrency(property.baseRate)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {owner.notes && (
                      <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                        <p className="text-sm text-amber-800">
                          <strong>Notes:</strong> {owner.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <OwnerModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        owner={editingOwner}
      />
    </div>
  )
}

interface OwnerModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  owner: Owner | null
}

function OwnerModal({ isOpen, onClose, onSave, owner }: OwnerModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    defaultBaseRate: '',
    defaultBillingType: '',
    preferredContactMethod: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (owner) {
      setFormData({
        name: owner.name,
        email: owner.email || '',
        phone: owner.phone || '',
        notes: owner.notes || '',
        defaultBaseRate: owner.defaultBaseRate?.toString() || '',
        defaultBillingType: owner.defaultBillingType || '',
        preferredContactMethod: owner.preferredContactMethod || '',
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        notes: '',
        defaultBaseRate: '',
        defaultBillingType: '',
        preferredContactMethod: '',
      })
    }
  }, [owner, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    await onSave(formData)
    setIsSaving(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={owner ? 'Edit Owner' : 'Add Owner'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Owner Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="John Smith"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="owner@example.com"
          />
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(555) 123-4567"
          />
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Default Preferences</h4>
          <p className="text-sm text-gray-500 mb-3">
            These defaults will be suggested when creating new properties for this owner.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Default Rate"
              type="number"
              step="0.01"
              value={formData.defaultBaseRate}
              onChange={(e) => setFormData({ ...formData, defaultBaseRate: e.target.value })}
              placeholder="320.00"
            />
            <Select
              label="Default Billing"
              value={formData.defaultBillingType}
              onChange={(e) => setFormData({ ...formData, defaultBillingType: e.target.value })}
              options={[
                { value: '', label: 'No default' },
                { value: 'per_job', label: 'Per Job' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
            <Select
              label="Preferred Contact"
              value={formData.preferredContactMethod}
              onChange={(e) => setFormData({ ...formData, preferredContactMethod: e.target.value })}
              options={[
                { value: '', label: 'No preference' },
                { value: 'email', label: 'Email' },
                { value: 'phone', label: 'Phone' },
                { value: 'text', label: 'Text Message' },
              ]}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Internal notes about this owner..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {owner ? 'Save Changes' : 'Add Owner'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
