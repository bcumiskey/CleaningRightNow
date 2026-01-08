'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building, MapPin, Plus, User, Phone, Mail, RefreshCw, Calendar, FileText, Camera } from 'lucide-react'
import Image from 'next/image'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import ImageUpload from '@/components/ui/ImageUpload'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Owner {
  id: string
  name: string
  email: string | null
  phone: string | null
  defaultBaseRate: number | null
  defaultBillingType: string | null
}

interface Property {
  id: string
  name: string
  address: string
  ownerId: string | null
  owner: Owner | null
  ownerName: string
  ownerEmail: string | null
  ownerPhone: string | null
  baseRate: number
  billingType: string
  calendarSource: string | null
  icalUrl: string | null
  accessCode: string | null
  imageUrl: string | null
  notes: { id: string }[]
}

export default function PropertiesPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    fetchProperties()
    fetchOwners()
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

  const fetchOwners = async () => {
    try {
      const response = await fetch('/api/owners')
      if (response.ok) {
        const data = await response.json()
        setOwners(data)
      }
    } catch (error) {
      console.error('Failed to fetch owners:', error)
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

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      const url = editingProperty ? `/api/properties/${editingProperty.id}` : '/api/properties'
      const method = editingProperty ? 'PATCH' : 'POST'

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
        const error = await response.json()
        toast.error(error.error || 'Failed to save property')
      }
    } catch (error) {
      toast.error('Failed to save property')
    }
  }

  const handleSyncAllCalendars = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'PUT',
      })

      if (response.ok) {
        const data = await response.json()
        const totalCreated = data.results.reduce((sum: number, r: { created?: number }) => sum + (r.created || 0), 0)
        toast.success(`Synced ${totalCreated} new jobs from calendars`)
      } else {
        toast.error('Failed to sync calendars')
      }
    } catch (error) {
      toast.error('Failed to sync calendars')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSyncProperty = async (propertyId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to sync calendar')
      }
    } catch (error) {
      toast.error('Failed to sync calendar')
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

  const propertiesWithCalendars = properties.filter(p => p.icalUrl)

  return (
    <div className="min-h-screen">
      <AdminHeader title="Properties" />

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {properties.length} Properties
          </h3>
          <div className="flex gap-3">
            {propertiesWithCalendars.length > 0 && (
              <Button variant="outline" onClick={handleSyncAllCalendars} isLoading={isSyncing}>
                <RefreshCw size={16} />
                Sync All Calendars
              </Button>
            )}
            <Button onClick={handleAdd}>
              <Plus size={16} />
              Add Property
            </Button>
          </div>
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
                className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                onClick={() => handleEdit(property)}
              >
                {/* Property Image */}
                {property.imageUrl && (
                  <div className="relative h-40 w-full">
                    <Image
                      src={property.imageUrl}
                      alt={property.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <CardContent className={property.imageUrl ? 'pt-4' : ''}>
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

                  <div className="mt-3 flex items-center gap-2">
                    {property.icalUrl && (
                      <button
                        onClick={(e) => handleSyncProperty(property.id, e)}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Calendar size={14} />
                        Sync
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/properties/${property.id}`)
                      }}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      <FileText size={14} />
                      Instructions & Photos
                    </button>
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
        owners={owners}
      />
    </div>
  )
}

interface PropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Record<string, unknown>) => void
  property: Property | null
  owners: Owner[]
}

function PropertyModal({ isOpen, onClose, onSave, property, owners }: PropertyModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    ownerId: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    baseRate: '',
    billingType: 'per_job',
    calendarSource: '',
    icalUrl: '',
    accessCode: '',
    accessNotes: '',
    bedConfig: '',
    imageUrl: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleOwnerChange = (ownerId: string) => {
    if (ownerId) {
      const selectedOwner = owners.find(o => o.id === ownerId)
      if (selectedOwner) {
        setFormData({
          ...formData,
          ownerId,
          ownerName: selectedOwner.name,
          ownerEmail: selectedOwner.email || '',
          ownerPhone: selectedOwner.phone || '',
          baseRate: formData.baseRate || (selectedOwner.defaultBaseRate?.toString() || ''),
          billingType: formData.billingType === 'per_job' && selectedOwner.defaultBillingType
            ? selectedOwner.defaultBillingType
            : formData.billingType,
        })
        return
      }
    }
    setFormData({ ...formData, ownerId })
  }

  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name,
        address: property.address,
        ownerId: property.ownerId || '',
        ownerName: property.ownerName,
        ownerEmail: property.ownerEmail || '',
        ownerPhone: property.ownerPhone || '',
        baseRate: property.baseRate.toString(),
        billingType: property.billingType,
        calendarSource: property.calendarSource || '',
        icalUrl: property.icalUrl || '',
        accessCode: property.accessCode || '',
        accessNotes: '',
        bedConfig: '',
        imageUrl: property.imageUrl || '',
      })
    } else {
      setFormData({
        name: '',
        address: '',
        ownerId: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        baseRate: '',
        billingType: 'per_job',
        calendarSource: '',
        icalUrl: '',
        accessCode: '',
        accessNotes: '',
        bedConfig: '',
        imageUrl: '',
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
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Property Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Property Photo</label>
          <ImageUpload
            value={formData.imageUrl}
            onChange={(url) => setFormData({ ...formData, imageUrl: url })}
            onRemove={() => setFormData({ ...formData, imageUrl: '' })}
            folder="properties"
            label="Upload property photo"
            previewSize="lg"
          />
        </div>

        {/* Basic Info */}
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
          placeholder="123 Ocean Drive, Beach City, FL 12345"
          required
        />

        {/* Owner Info */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Owner Information</h4>
          <div className="mb-4">
            <Select
              label="Link to Owner"
              value={formData.ownerId}
              onChange={(e) => handleOwnerChange(e.target.value)}
              options={[
                { value: '', label: 'Enter owner manually' },
                ...owners.map(owner => ({
                  value: owner.id,
                  label: owner.name + (owner.defaultBaseRate ? ` (Default: $${owner.defaultBaseRate})` : ''),
                })),
              ]}
            />
            <p className="text-xs text-gray-500 mt-1">
              Select an existing owner to auto-fill contact info and apply their default rates.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Owner Name"
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              placeholder="John Smith"
              required
              disabled={!!formData.ownerId}
            />
            <Input
              label="Owner Phone"
              value={formData.ownerPhone}
              onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
              placeholder="(555) 123-4567"
              disabled={!!formData.ownerId}
            />
            <Input
              label="Owner Email"
              type="email"
              value={formData.ownerEmail}
              onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
              placeholder="owner@example.com"
              disabled={!!formData.ownerId}
            />
          </div>
        </div>

        {/* Billing & Calendar */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Billing & Calendar</h4>
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
                { value: '', label: 'None (Manual Entry)' },
                { value: 'turno', label: 'Turno' },
                { value: 'airbnb', label: 'Airbnb' },
                { value: 'vrbo', label: 'VRBO' },
                { value: 'google', label: 'Google Calendar' },
                { value: 'other', label: 'Other iCal' },
              ]}
            />
          </div>

          {formData.calendarSource && formData.calendarSource !== '' && (
            <div className="mt-4">
              <Input
                label="iCal/Calendar URL"
                value={formData.icalUrl}
                onChange={(e) => setFormData({ ...formData, icalUrl: e.target.value })}
                placeholder="https://..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Paste the iCal URL from your booking platform. Jobs will be auto-created from checkout dates.
              </p>
            </div>
          )}
        </div>

        {/* Access Info */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Access Information (Visible to Workers)</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Access Code"
              value={formData.accessCode}
              onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
              placeholder="1234 or Lockbox code"
            />
            <Input
              label="Bed Configuration"
              value={formData.bedConfig}
              onChange={(e) => setFormData({ ...formData, bedConfig: e.target.value })}
              placeholder="2 King, 1 Queen, 2 Twin"
            />
          </div>
          <div className="mt-4">
            <Input
              label="Access Notes"
              value={formData.accessNotes}
              onChange={(e) => setFormData({ ...formData, accessNotes: e.target.value })}
              placeholder="Gate code 5678, key under mat, etc."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
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
