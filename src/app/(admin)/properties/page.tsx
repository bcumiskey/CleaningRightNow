'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building, MapPin, Plus, User, Phone, Mail, Pencil, Trash2 } from 'lucide-react'
import Image from 'next/image'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Property {
  id: string
  name: string
  address: string
  ownerId: string | null
  ownerName: string
  ownerEmail: string | null
  ownerPhone: string | null
  baseRate: number
  expensePercent: number
  billingType: string
  imageUrl: string | null
  notes: { id: string }[]
}

export default function PropertiesPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
    router.push('/properties/new/edit')
  }

  const handleEdit = (propertyId: string) => {
    router.push(`/properties/${propertyId}/edit`)
  }

  const handleDelete = async (property: Property, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete "${property.name}"? This will also delete all associated jobs and invoices.`)) return

    try {
      const response = await fetch(`/api/properties/${property.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success(`${property.name} deleted`)
        fetchProperties()
      } else {
        toast.error('Failed to delete property')
      }
    } catch (error) {
      toast.error('Failed to delete property')
    }
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((property) => (
              <Card
                key={property.id}
                className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                onClick={() => handleEdit(property.id)}
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
                      <h4 className="font-semibold text-gray-900">{property.name}</h4>
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

                  {property.notes && property.notes.length > 0 && (
                    <div className="mt-3 p-2 bg-amber-50 rounded-lg text-sm text-amber-700">
                      {property.notes.length} active note{property.notes.length !== 1 && 's'}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-3 pt-3 border-t flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(property.id)
                      }}
                    >
                      <Pencil size={14} />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={(e) => handleDelete(property, e)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
