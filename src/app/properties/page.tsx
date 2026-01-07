'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  Home,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  Edit,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Property {
  id: string
  name: string
  address: string
  baseRate: number
  billingType: 'per_job' | 'monthly'
  monthlyBillingDay?: number
  autoSendInvoice: boolean
  calendarSource?: string
  ownerName: string
  ownerEmail?: string
  ownerPhone?: string
  accessCode?: string
  accessNotes?: string
  _count: {
    jobs: number
    notes: number
    photos: number
    standingInstructions: number
  }
}

interface PropertyFormData {
  name: string
  address: string
  baseRate: string
  billingType: 'per_job' | 'monthly'
  monthlyBillingDay: string
  autoSendInvoice: boolean
  calendarSource: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  accessCode: string
  accessNotes: string
}

function PropertiesPageContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [billingFilter, setBillingFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    address: '',
    baseRate: '',
    billingType: 'per_job',
    monthlyBillingDay: '',
    autoSendInvoice: false,
    calendarSource: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    accessCode: '',
    accessNotes: '',
  })

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProperties()
    }
  }, [status])

  useEffect(() => {
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
        baseRate: formData.baseRate ? parseFloat(formData.baseRate) : 0,
        billingType: formData.billingType,
        monthlyBillingDay: formData.monthlyBillingDay ? parseInt(formData.monthlyBillingDay) : null,
        autoSendInvoice: formData.autoSendInvoice,
        calendarSource: formData.calendarSource || null,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail || null,
        ownerPhone: formData.ownerPhone || null,
        accessCode: formData.accessCode || null,
        accessNotes: formData.accessNotes || null,
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
      baseRate: property.baseRate.toString(),
      billingType: property.billingType,
      monthlyBillingDay: property.monthlyBillingDay?.toString() || '',
      autoSendInvoice: property.autoSendInvoice,
      calendarSource: property.calendarSource || '',
      ownerName: property.ownerName,
      ownerEmail: property.ownerEmail || '',
      ownerPhone: property.ownerPhone || '',
      accessCode: property.accessCode || '',
      accessNotes: property.accessNotes || '',
    })
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setEditingProperty(null)
    setFormData({
      name: '',
      address: '',
      baseRate: '',
      billingType: 'per_job',
      monthlyBillingDay: '',
      autoSendInvoice: false,
      calendarSource: '',
      ownerName: '',
      ownerEmail: '',
      ownerPhone: '',
      accessCode: '',
      accessNotes: '',
    })
  }

  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase()) ||
      p.ownerName.toLowerCase().includes(search.toLowerCase())
    const matchesBilling =
      billingFilter === 'all' || p.billingType === billingFilter
    return matchesSearch && matchesBilling
  })

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

  const getSourceBadge = (source?: string) => {
    if (!source) return null
    const colors: Record<string, string> = {
      turno: 'bg-purple-100 text-purple-800',
      google: 'bg-green-100 text-green-800',
      manual: 'bg-gray-100 text-gray-800',
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[source] || colors.manual}`}>
        {source}
      </span>
    )
  }

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
          <Select
            value={billingFilter}
            onChange={(e) => setBillingFilter(e.target.value)}
            className="w-full sm:w-40"
          >
            <option value="all">All Billing</option>
            <option value="per_job">Per Job</option>
            <option value="monthly">Monthly</option>
          </Select>
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead align="right">Rate</TableHead>
                      <TableHead align="center">Billing</TableHead>
                      <TableHead align="center">Jobs</TableHead>
                      <TableHead align="center">Notes</TableHead>
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
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/properties/${property.id}`}
                                  className="font-medium text-gray-900 hover:text-indigo-600"
                                >
                                  {property.name}
                                </Link>
                                {getSourceBadge(property.calendarSource)}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{property.address}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">{property.ownerName}</p>
                            {property.ownerPhone && (
                              <p className="text-gray-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {property.ownerPhone}
                              </p>
                            )}
                            {property.ownerEmail && (
                              <p className="text-gray-500 flex items-center gap-1 truncate max-w-[150px]">
                                <Mail className="w-3 h-3" /> {property.ownerEmail}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell align="right">
                          <span className="font-medium">{formatCurrency(property.baseRate)}</span>
                        </TableCell>
                        <TableCell align="center">
                          <Badge variant={property.billingType === 'monthly' ? 'info' : 'default'}>
                            {property.billingType === 'monthly' ? 'Monthly' : 'Per Job'}
                          </Badge>
                        </TableCell>
                        <TableCell align="center">
                          <Badge variant="info">{property._count.jobs}</Badge>
                        </TableCell>
                        <TableCell align="center">
                          {property._count.notes > 0 ? (
                            <Badge variant="warning">
                              <AlertCircle className="w-3 h-3" />
                              {property._count.notes}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
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
              </div>
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
        size="xl"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Property Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Property Information</h4>
              <div className="space-y-4">
                <Input
                  label="Property Name *"
                  placeholder="Beach House, Downtown Condo..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />

                <Input
                  label="Address *"
                  placeholder="123 Main St, City, State 12345"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Owner Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Owner Information</h4>
              <div className="space-y-4">
                <Input
                  label="Owner Name *"
                  placeholder="John Smith"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Owner Email"
                    type="email"
                    placeholder="owner@email.com"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  />
                  <Input
                    label="Owner Phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Billing Config */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Billing Configuration</h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Base Rate ($) *"
                  type="number"
                  step="0.01"
                  placeholder="150.00"
                  value={formData.baseRate}
                  onChange={(e) => setFormData({ ...formData, baseRate: e.target.value })}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Type
                  </label>
                  <Select
                    value={formData.billingType}
                    onChange={(e) => setFormData({ ...formData, billingType: e.target.value as 'per_job' | 'monthly' })}
                  >
                    <option value="per_job">Per Job</option>
                    <option value="monthly">Monthly</option>
                  </Select>
                </div>
              </div>

              {formData.billingType === 'monthly' && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Input
                    label="Billing Day of Month"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="1"
                    value={formData.monthlyBillingDay}
                    onChange={(e) => setFormData({ ...formData, monthlyBillingDay: e.target.value })}
                  />
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="autoSend"
                      checked={formData.autoSendInvoice}
                      onChange={(e) => setFormData({ ...formData, autoSendInvoice: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="autoSend" className="text-sm text-gray-700">
                      Auto-send invoices
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Access Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Access Information</h4>
              <div className="space-y-4">
                <Input
                  label="Access Code"
                  placeholder="1234, Gate code, etc."
                  value={formData.accessCode}
                  onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Access Notes
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows={2}
                    placeholder="Key under mat, ring doorbell, etc."
                    value={formData.accessNotes}
                    onChange={(e) => setFormData({ ...formData, accessNotes: e.target.value })}
                  />
                </div>
              </div>
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

export default function PropertiesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    }>
      <PropertiesPageContent />
    </Suspense>
  )
}
