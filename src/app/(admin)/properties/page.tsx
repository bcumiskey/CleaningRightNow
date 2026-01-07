'use client'

import { useEffect, useState } from 'react'
import { Building, MapPin, Plus, User, Phone, Mail, DollarSign } from 'lucide-react'
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
  ownerName: string
  ownerEmail: string | null
  ownerPhone: string | null
  baseRate: number
  billingType: string
  calendarSource: string | null
  icalUrl: string | null
  accessCode: string | null
  notes: { id: string }[]
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties')
      if (response.ok) {
        const data = await response.json()
        setProperties(data)
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingProperty(null)
    setShowModal(true)
  }

  const handleEdit = (property: Property) => {
    setEditingProperty(property)
    setShowModal(true)
  }

  const handleSave = async (data: any) => {
    try {
      const url = editingProperty ? `/api/properties/${editingProperty.id}` : '/api/properties'
      const method = editingProperty ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success(editingProperty ? 'Property updated' : 'Property created')
        setShowModal(false)
        fetchProperties()
      } else {
        toast.error('Failed to save property')
      }
    } catch (error) {
      toast.error('Failed to save property')
    }
  }

  const getSourceBadge = (source: string | null) => {
    if (!source) return null
    const variants: Record<string, 'purple' | 'success' | 'default'> = {
      turno: 'purple',
      google: 'success',
      manual: 'default',
    }
    return (
      <Badge variant={variants[source] || 'default'} className="ml-2">
        {source}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="Properties" />

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {properties.length} Properties
          </h3>
          <Button onClick={handleAdd}>
            <Plus size={16} />
            Add Property
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : properties.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Building}
                title="No properties yet"
                description="Add your first property to start managing jobs and invoices."
                actionLabel="Add Property"
                onAction={handleAdd}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {properties.map((property) => (
              <Card
                key={property.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleEdit(property)}
              >
                <CardContent>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {property.name}
                        {getSourceBadge(property.calendarSource)}
                      </h4>
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <MapPin size={14} />
                        {property.address}
                      </div>
                    </div>
                    <Badge variant={property.billingType === 'monthly' ? 'warning' : 'info'}>
                      {property.billingType === 'monthly' ? 'Monthly' : 'Per Job'}
                    </Badge>
                  </div>

                  <div className="text-2xl font-bold text-gray-900 mb-4">
                    {formatCurrency(property.baseRate)}
                  </div>

                  <div className="border-t pt-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User size={14} />
                      {property.ownerName}
                    </div>
                    {property.ownerPhone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={14} />
                        {property.ownerPhone}
                      </div>
                    )}
                    {property.ownerEmail && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail size={14} />
                        {property.ownerEmail}
                      </div>
                    )}
                  </div>

                  {property.notes.length > 0 && (
                    <div className="mt-3 p-2 bg-amber-50 rounded-lg text-sm text-amber-700">
                      {property.notes.length} active note{property.notes.length !== 1 && 's'}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <PropertyModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        property={editingProperty}
      />
    </div>
  )
}

interface PropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  property: Property | null
}

function PropertyModal({ isOpen, onClose, onSave, property }: PropertyModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    baseRate: '',
    billingType: 'per_job',
    calendarSource: '',
    icalUrl: '',
    accessCode: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name,
        address: property.address,
        ownerName: property.ownerName,
        ownerEmail: property.ownerEmail || '',
        ownerPhone: property.ownerPhone || '',
        baseRate: property.baseRate.toString(),
        billingType: property.billingType,
        calendarSource: property.calendarSource || '',
        icalUrl: property.icalUrl || '',
        accessCode: property.accessCode || '',
      })
    } else {
      setFormData({
        name: '',
        address: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        baseRate: '',
        billingType: 'per_job',
        calendarSource: '',
        icalUrl: '',
        accessCode: '',
      })
    }
  }, [property, isOpen])

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
      title={property ? 'Edit Property' : 'Add Property'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Property Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Beach House"
            required
          />
          <Input
            label="Base Rate"
            type="number"
            step="0.01"
            value={formData.baseRate}
            onChange={(e) => setFormData({ ...formData, baseRate: e.target.value })}
            placeholder="320.00"
            required
          />
        </div>

        <Input
          label="Address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="123 Ocean Drive"
          required
        />

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Owner Name"
            value={formData.ownerName}
            onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
            placeholder="John Smith"
            required
          />
          <Input
            label="Owner Phone"
            value={formData.ownerPhone}
            onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
            placeholder="(555) 123-4567"
          />
          <Input
            label="Owner Email"
            type="email"
            value={formData.ownerEmail}
            onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
            placeholder="owner@example.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Billing Type"
            value={formData.billingType}
            onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
            options={[
              { value: 'per_job', label: 'Per Job' },
              { value: 'monthly', label: 'Monthly' },
            ]}
          />
          <Select
            label="Calendar Source"
            value={formData.calendarSource}
            onChange={(e) => setFormData({ ...formData, calendarSource: e.target.value })}
            options={[
              { value: '', label: 'None' },
              { value: 'turno', label: 'Turno' },
              { value: 'google', label: 'Google Calendar' },
              { value: 'manual', label: 'Manual' },
            ]}
          />
        </div>

        {formData.calendarSource === 'turno' && (
          <Input
            label="iCal URL"
            value={formData.icalUrl}
            onChange={(e) => setFormData({ ...formData, icalUrl: e.target.value })}
            placeholder="https://turno.com/ical/..."
          />
        )}

        <Input
          label="Access Code"
          value={formData.accessCode}
          onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
          placeholder="1234 or Lockbox code"
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {property ? 'Save Changes' : 'Add Property'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
