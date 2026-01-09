'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Camera,
  ListChecks,
  Building,
  Save,
  X,
  User,
  Key,
  DollarSign,
} from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import ImageUpload from '@/components/ui/ImageUpload'
import toast from 'react-hot-toast'

interface Owner {
  id: string
  name: string
  email: string | null
  phone: string | null
  defaultBaseRate: number | null
  defaultBillingType: string | null
}

interface LinkedPhoto {
  id: string
  url: string
  caption: string | null
  notes: string | null
  room: string
}

interface Instruction {
  id: string
  instruction: string
  room: string
  sortOrder: number
  linkedPhotoId: string | null
  linkedPhoto: LinkedPhoto | null
}

interface Photo {
  id: string
  room: string
  caption: string | null
  notes: string | null
  url: string
  addedBy?: { name: string }
}

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
  billingFrequency: string
  accessCode: string | null
  accessNotes: string | null
  bedConfig: string | null
  imageUrl: string | null
  keywords: string | null
}

const ROOM_OPTIONS = [
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

type TabType = 'details' | 'worker' | 'instructions' | 'photos'

export default function PropertyEditPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const isNew = id === 'new'

  const [activeTab, setActiveTab] = useState<TabType>('details')
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [owners, setOwners] = useState<Owner[]>([])

  // Property form data
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    ownerId: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    baseRate: '',
    expensePercent: '12',
    billingType: 'per_job',
    billingFrequency: 'per_job',
    accessCode: '',
    accessNotes: '',
    bedConfig: '',
    imageUrl: '',
    keywords: '',
  })

  // Instructions state
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [instructionsByRoom, setInstructionsByRoom] = useState<Record<string, Instruction[]>>({})
  const [newInstruction, setNewInstruction] = useState('')
  const [newInstructionRoom, setNewInstructionRoom] = useState('General')
  const [newInstructionLinkedPhoto, setNewInstructionLinkedPhoto] = useState('')
  const [editingInstruction, setEditingInstruction] = useState<Instruction | null>(null)
  const [isSavingInstruction, setIsSavingInstruction] = useState(false)

  // Photos state
  const [photos, setPhotos] = useState<Photo[]>([])
  const [photosByRoom, setPhotosByRoom] = useState<Record<string, Photo[]>>({})
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [newPhotoRoom, setNewPhotoRoom] = useState('')
  const [newPhotoCaption, setNewPhotoCaption] = useState('')
  const [newPhotoNotes, setNewPhotoNotes] = useState('')
  const [newPhotoUrl, setNewPhotoUrl] = useState('')
  const [isSavingPhoto, setIsSavingPhoto] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [editingPhotoNotes, setEditingPhotoNotes] = useState('')
  const [isSavingPhotoNotes, setIsSavingPhotoNotes] = useState(false)

  useEffect(() => {
    fetchOwners()
    if (!isNew) {
      loadPropertyData()
    }
  }, [id, isNew])

  const fetchOwners = async () => {
    try {
      const res = await fetch('/api/owners')
      if (res.ok) {
        setOwners(await res.json())
      }
    } catch (error) {
      console.error('Failed to fetch owners:', error)
    }
  }

  const loadPropertyData = async () => {
    try {
      const [propRes, instRes, photoRes] = await Promise.all([
        fetch(`/api/properties/${id}`),
        fetch(`/api/properties/${id}/instructions`),
        fetch(`/api/properties/${id}/photos`),
      ])

      if (propRes.ok) {
        const prop: Property = await propRes.json()
        setFormData({
          name: prop.name,
          address: prop.address,
          ownerId: prop.ownerId || '',
          ownerName: prop.ownerName,
          ownerEmail: prop.ownerEmail || '',
          ownerPhone: prop.ownerPhone || '',
          baseRate: prop.baseRate.toString(),
          expensePercent: prop.expensePercent?.toString() || '12',
          billingType: prop.billingType,
          billingFrequency: prop.billingFrequency || 'per_job',
          accessCode: prop.accessCode || '',
          accessNotes: prop.accessNotes || '',
          bedConfig: prop.bedConfig || '',
          imageUrl: prop.imageUrl || '',
          keywords: prop.keywords || '',
        })
      } else {
        toast.error('Property not found')
        router.push('/properties')
        return
      }

      if (instRes.ok) {
        const data = await instRes.json()
        setInstructions(data.instructions || data || [])
        setInstructionsByRoom(data.byRoom || {})
      }

      if (photoRes.ok) {
        const data = await photoRes.json()
        setPhotos(data.photos || [])
        setPhotosByRoom(data.byRoom || {})
      }
    } catch (error) {
      console.error('Failed to load property:', error)
      toast.error('Failed to load property')
    } finally {
      setIsLoading(false)
    }
  }

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

  const handleSaveProperty = async () => {
    if (!formData.name || !formData.address || !formData.ownerName || !formData.baseRate) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    try {
      const url = isNew ? '/api/properties' : `/api/properties/${id}`
      const method = isNew ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ownerId: formData.ownerId || null,
        }),
      })

      if (res.ok) {
        const savedProperty = await res.json()
        toast.success(isNew ? 'Property created!' : 'Property saved!')
        if (isNew) {
          router.push(`/properties/${savedProperty.id}/edit`)
        }
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save property')
      }
    } catch (error) {
      toast.error('Failed to save property')
    } finally {
      setIsSaving(false)
    }
  }

  // Instruction handlers
  const handleAddInstruction = async () => {
    if (!newInstruction.trim() || isNew) return

    setIsSavingInstruction(true)
    try {
      const res = await fetch(`/api/properties/${id}/instructions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: newInstruction,
          room: newInstructionRoom,
          linkedPhotoId: newInstructionLinkedPhoto || null,
        }),
      })

      if (res.ok) {
        const added = await res.json()
        const updatedInstructions = [...instructions, added]
        setInstructions(updatedInstructions)
        rebuildInstructionsByRoom(updatedInstructions)
        setNewInstruction('')
        setNewInstructionLinkedPhoto('')
        toast.success('Instruction added')
      } else {
        toast.error('Failed to add instruction')
      }
    } catch (error) {
      toast.error('Failed to add instruction')
    } finally {
      setIsSavingInstruction(false)
    }
  }

  const handleUpdateInstruction = async () => {
    if (!editingInstruction) return

    try {
      const res = await fetch(`/api/properties/${id}/instructions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingInstruction.id,
          instruction: editingInstruction.instruction,
          room: editingInstruction.room,
          linkedPhotoId: editingInstruction.linkedPhotoId,
        }),
      })

      if (res.ok) {
        const updated = await res.json()
        const updatedInstructions = instructions.map(i =>
          i.id === editingInstruction.id ? updated : i
        )
        setInstructions(updatedInstructions)
        rebuildInstructionsByRoom(updatedInstructions)
        setEditingInstruction(null)
        toast.success('Instruction updated')
      }
    } catch (error) {
      toast.error('Failed to update instruction')
    }
  }

  const handleDeleteInstruction = async (instructionId: string) => {
    try {
      const res = await fetch(`/api/properties/${id}/instructions?instructionId=${instructionId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const filtered = instructions.filter(i => i.id !== instructionId)
        setInstructions(filtered)
        rebuildInstructionsByRoom(filtered)
        toast.success('Instruction removed')
      }
    } catch (error) {
      toast.error('Failed to delete instruction')
    }
  }

  const rebuildInstructionsByRoom = (instList: Instruction[]) => {
    const byRoom: Record<string, Instruction[]> = {}
    for (const inst of instList) {
      const room = inst.room || 'General'
      if (!byRoom[room]) byRoom[room] = []
      byRoom[room].push(inst)
    }
    setInstructionsByRoom(byRoom)
  }

  // Photo handlers
  const handleAddPhoto = async () => {
    if (!newPhotoUrl || !newPhotoRoom || isNew) {
      toast.error('Please upload a photo and select a room')
      return
    }

    setIsSavingPhoto(true)
    try {
      const res = await fetch(`/api/properties/${id}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newPhotoUrl,
          room: newPhotoRoom,
          caption: newPhotoCaption,
          notes: newPhotoNotes,
        }),
      })

      if (res.ok) {
        toast.success('Photo added')
        setShowPhotoModal(false)
        setNewPhotoUrl('')
        setNewPhotoRoom('')
        setNewPhotoCaption('')
        setNewPhotoNotes('')
        // Refresh photos
        const photoRes = await fetch(`/api/properties/${id}/photos`)
        if (photoRes.ok) {
          const data = await photoRes.json()
          setPhotos(data.photos || [])
          setPhotosByRoom(data.byRoom || {})
        }
      } else {
        toast.error('Failed to add photo')
      }
    } catch (error) {
      toast.error('Failed to add photo')
    } finally {
      setIsSavingPhoto(false)
    }
  }

  const handleSavePhotoNotes = async () => {
    if (!selectedPhoto) return

    setIsSavingPhotoNotes(true)
    try {
      const res = await fetch(`/api/properties/${id}/photos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPhoto.id,
          notes: editingPhotoNotes,
        }),
      })

      if (res.ok) {
        const updated = photos.map(p =>
          p.id === selectedPhoto.id ? { ...p, notes: editingPhotoNotes } : p
        )
        setPhotos(updated)
        rebuildPhotosByRoom(updated)
        setSelectedPhoto({ ...selectedPhoto, notes: editingPhotoNotes })
        toast.success('Photo notes saved')
      }
    } catch (error) {
      toast.error('Failed to save notes')
    } finally {
      setIsSavingPhotoNotes(false)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const res = await fetch(`/api/properties/${id}/photos?photoId=${photoId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const updated = photos.filter(p => p.id !== photoId)
        setPhotos(updated)
        rebuildPhotosByRoom(updated)
        toast.success('Photo removed')
      }
    } catch (error) {
      toast.error('Failed to delete photo')
    }
  }

  const rebuildPhotosByRoom = (photoList: Photo[]) => {
    const byRoom: Record<string, Photo[]> = {}
    for (const photo of photoList) {
      if (!byRoom[photo.room]) byRoom[photo.room] = []
      byRoom[photo.room].push(photo)
    }
    setPhotosByRoom(byRoom)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <AdminHeader title="Loading..." />
        <div className="p-6 text-center text-gray-500">Loading property...</div>
      </div>
    )
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'details', label: 'Details', icon: <Building size={16} /> },
    { id: 'worker', label: 'Worker Info', icon: <Key size={16} /> },
    { id: 'instructions', label: `Instructions (${instructions.length})`, icon: <ListChecks size={16} /> },
    { id: 'photos', label: `Photos (${photos.length})`, icon: <Camera size={16} /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader title={isNew ? 'New Property' : `Edit: ${formData.name}`} />

      <div className="p-6">
        {/* Header with back and save */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => router.push('/properties')}>
            <ArrowLeft size={16} />
            Back to Properties
          </Button>
          <Button onClick={handleSaveProperty} isLoading={isSaving}>
            <Save size={16} />
            Save Property
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b pb-4">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'primary' : 'outline'}
              onClick={() => setActiveTab(tab.id)}
              disabled={isNew && (tab.id === 'instructions' || tab.id === 'photos')}
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>

        {isNew && (activeTab === 'instructions' || activeTab === 'photos') && (
          <div className="text-center py-8 text-gray-500">
            Save the property first to add {activeTab}.
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building size={18} />
                  Property Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ImageUpload
                  value={formData.imageUrl}
                  onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                  onRemove={() => setFormData({ ...formData, imageUrl: '' })}
                  folder="properties"
                  label="Property Photo"
                  previewSize="lg"
                />
                <Input
                  label="Property Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Beach House"
                  required
                />
                <Input
                  label="Address *"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Ocean Drive, Beach City, FL 12345"
                  required
                />
                <Input
                  label="Calendar Keywords"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="beach house, smith, oceanview"
                />
                <p className="text-xs text-gray-500 -mt-2">
                  Comma-separated keywords to help match calendar events to this property
                </p>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User size={18} />
                    Owner Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                  <div className="grid grid-cols-1 gap-3">
                    <Input
                      label="Owner Name *"
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign size={18} />
                    Billing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Base Rate *"
                      type="number"
                      step="0.01"
                      value={formData.baseRate}
                      onChange={(e) => setFormData({ ...formData, baseRate: e.target.value })}
                      placeholder="320.00"
                      required
                    />
                    <Input
                      label="Expense %"
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={formData.expensePercent}
                      onChange={(e) => setFormData({ ...formData, expensePercent: e.target.value })}
                      placeholder="12"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                      label="Invoice Frequency"
                      value={formData.billingFrequency}
                      onChange={(e) => setFormData({ ...formData, billingFrequency: e.target.value })}
                      options={[
                        { value: 'per_job', label: 'Per Job' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'biweekly', label: 'Bi-Weekly' },
                        { value: 'monthly', label: 'Monthly' },
                      ]}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Worker Info Tab */}
        {activeTab === 'worker' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key size={18} />
                Information Visible to Workers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-gray-500">
                This information is shown to workers when they view job details or the property reference.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Input
                    label="Access Code"
                    value={formData.accessCode}
                    onChange={(e) => setFormData({ ...formData, accessCode: e.target.value })}
                    placeholder="1234 or Lockbox code"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Access Notes
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      value={formData.accessNotes}
                      onChange={(e) => setFormData({ ...formData, accessNotes: e.target.value })}
                      placeholder="Gate code 5678, key under mat, etc."
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <Input
                    label="Bed Configuration"
                    value={formData.bedConfig}
                    onChange={(e) => setFormData({ ...formData, bedConfig: e.target.value })}
                    placeholder="2 King, 1 Queen, 2 Twin"
                  />
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">What workers see:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Property name and address</li>
                      <li>• Access code and notes</li>
                      <li>• Bed configuration</li>
                      <li>• Cleaning instructions</li>
                      <li>• Reference photos</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions Tab */}
        {activeTab === 'instructions' && !isNew && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks size={18} />
                Cleaning Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Add specific cleaning instructions organized by room. Link to reference photos for visual guidance.
              </p>

              {/* Add new instruction */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <Select
                    label="Room"
                    value={newInstructionRoom}
                    onChange={(e) => setNewInstructionRoom(e.target.value)}
                    options={[
                      { value: 'General', label: 'General' },
                      ...ROOM_OPTIONS.map(room => ({ value: room, label: room })),
                    ]}
                  />
                  <Select
                    label="Link to Photo (optional)"
                    value={newInstructionLinkedPhoto}
                    onChange={(e) => setNewInstructionLinkedPhoto(e.target.value)}
                    options={[
                      { value: '', label: 'No photo linked' },
                      ...photos.map(photo => ({
                        value: photo.id,
                        label: `${photo.room}${photo.caption ? ` - ${photo.caption}` : ''}`,
                      })),
                    ]}
                  />
                  <div></div>
                </div>
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    value={newInstruction}
                    onChange={(e) => setNewInstruction(e.target.value)}
                    placeholder="Enter a cleaning instruction..."
                    onKeyDown={(e) => e.key === 'Enter' && handleAddInstruction()}
                  />
                  <Button
                    onClick={handleAddInstruction}
                    isLoading={isSavingInstruction}
                    disabled={!newInstruction.trim()}
                  >
                    <Plus size={16} />
                    Add
                  </Button>
                </div>
              </div>

              {/* Instructions list by room */}
              {instructions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No instructions yet. Add your first instruction above.
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(instructionsByRoom).map(([room, roomInstructions]) => (
                    <div key={room}>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <ListChecks size={16} />
                        {room}
                      </h4>
                      <div className="space-y-2 pl-6">
                        {roomInstructions.map((inst, index) => (
                          <div
                            key={inst.id}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg group"
                          >
                            <span className="text-gray-400 font-mono text-sm mt-1">
                              {index + 1}.
                            </span>
                            {editingInstruction?.id === inst.id ? (
                              <div className="flex-1 space-y-2">
                                <Input
                                  value={editingInstruction.instruction}
                                  onChange={(e) =>
                                    setEditingInstruction({
                                      ...editingInstruction,
                                      instruction: e.target.value,
                                    })
                                  }
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={handleUpdateInstruction}>
                                    <Save size={14} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingInstruction(null)}
                                  >
                                    <X size={14} />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex-1">
                                  <p
                                    className="cursor-pointer hover:text-blue-600"
                                    onClick={() => setEditingInstruction(inst)}
                                  >
                                    {inst.instruction}
                                  </p>
                                  {inst.linkedPhoto && (
                                    <span className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                                      <Camera size={12} />
                                      Photo linked
                                    </span>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="opacity-0 group-hover:opacity-100"
                                  onClick={() => handleDeleteInstruction(inst.id)}
                                >
                                  <Trash2 size={14} className="text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Photos Tab */}
        {activeTab === 'photos' && !isNew && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Camera size={18} />
                Reference Photos
              </CardTitle>
              <Button onClick={() => setShowPhotoModal(true)}>
                <Plus size={16} />
                Add Photo
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Add reference photos showing how each room should look after cleaning.
              </p>

              {photos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No photos yet. Add reference photos to help cleaning staff.
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(photosByRoom).map(([room, roomPhotos]) => (
                    <div key={room}>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Camera size={16} />
                        {room}
                      </h4>
                      <div className="grid grid-cols-4 gap-4">
                        {roomPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="relative group rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                            onClick={() => {
                              setSelectedPhoto(photo)
                              setEditingPhotoNotes(photo.notes || '')
                            }}
                          >
                            <div className="relative h-32 w-full">
                              <Image
                                src={photo.url}
                                alt={photo.caption || room}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="p-2">
                              {photo.caption && (
                                <div className="text-xs text-gray-600 font-medium">
                                  {photo.caption}
                                </div>
                              )}
                              {photo.notes && (
                                <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                  <ListChecks size={10} />
                                  Has notes
                                </div>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeletePhoto(photo.id)
                              }}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Photo Modal */}
      <Modal
        isOpen={showPhotoModal}
        onClose={() => {
          setShowPhotoModal(false)
          setNewPhotoUrl('')
          setNewPhotoRoom('')
          setNewPhotoCaption('')
          setNewPhotoNotes('')
        }}
        title="Add Reference Photo"
      >
        <div className="space-y-4">
          <ImageUpload
            value={newPhotoUrl}
            onChange={setNewPhotoUrl}
            onRemove={() => setNewPhotoUrl('')}
            folder={`properties/${id}/reference`}
            label="Upload photo"
          />
          <Select
            label="Room"
            value={newPhotoRoom}
            onChange={(e) => setNewPhotoRoom(e.target.value)}
            options={[
              { value: '', label: 'Select a room...' },
              ...ROOM_OPTIONS.map(room => ({ value: room, label: room })),
            ]}
          />
          <Input
            label="Caption (optional)"
            value={newPhotoCaption}
            onChange={(e) => setNewPhotoCaption(e.target.value)}
            placeholder="Brief description"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Detailed Notes (optional)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              value={newPhotoNotes}
              onChange={(e) => setNewPhotoNotes(e.target.value)}
              placeholder="Detailed instructions shown when worker clicks on this photo"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowPhotoModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddPhoto}
              isLoading={isSavingPhoto}
              disabled={!newPhotoUrl || !newPhotoRoom}
            >
              Add Photo
            </Button>
          </div>
        </div>
      </Modal>

      {/* Photo Detail Modal */}
      <Modal
        isOpen={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        title={selectedPhoto ? `${selectedPhoto.room}${selectedPhoto.caption ? ` - ${selectedPhoto.caption}` : ''}` : 'Photo Details'}
      >
        {selectedPhoto && (
          <div className="space-y-4">
            <div className="relative w-full h-64 rounded-lg overflow-hidden">
              <Image
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || selectedPhoto.room}
                fill
                className="object-contain bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Photo Notes
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={editingPhotoNotes}
                onChange={(e) => setEditingPhotoNotes(e.target.value)}
                placeholder="Detailed instructions for this photo"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setSelectedPhoto(null)}>
                Close
              </Button>
              <Button onClick={handleSavePhotoNotes} isLoading={isSavingPhotoNotes}>
                <Save size={16} />
                Save Notes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
