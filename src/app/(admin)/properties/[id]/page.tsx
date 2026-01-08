'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Camera,
  ListChecks,
  Building,
  Save,
  X,
} from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import ImageUpload from '@/components/ui/ImageUpload'
import toast from 'react-hot-toast'

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
  baseRate: number
  bedConfig: string | null
  accessCode: string | null
  accessNotes: string | null
  ownerName: string
  imageUrl: string | null
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

export default function PropertyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [property, setProperty] = useState<Property | null>(null)
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [instructionsByRoom, setInstructionsByRoom] = useState<Record<string, Instruction[]>>({})
  const [photos, setPhotos] = useState<Photo[]>([])
  const [photosByRoom, setPhotosByRoom] = useState<Record<string, Photo[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'instructions' | 'photos'>('info')

  // Instructions form
  const [newInstruction, setNewInstruction] = useState('')
  const [newInstructionRoom, setNewInstructionRoom] = useState('General')
  const [newInstructionLinkedPhoto, setNewInstructionLinkedPhoto] = useState('')
  const [editingInstruction, setEditingInstruction] = useState<Instruction | null>(null)
  const [isSavingInstruction, setIsSavingInstruction] = useState(false)

  // Photos form
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [newPhotoRoom, setNewPhotoRoom] = useState('')
  const [newPhotoCaption, setNewPhotoCaption] = useState('')
  const [newPhotoNotes, setNewPhotoNotes] = useState('')
  const [newPhotoUrl, setNewPhotoUrl] = useState('')
  const [isSavingPhoto, setIsSavingPhoto] = useState(false)

  // Photo detail modal
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [editingPhotoNotes, setEditingPhotoNotes] = useState('')
  const [isSavingPhotoNotes, setIsSavingPhotoNotes] = useState(false)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    try {
      const [propRes, instRes, photoRes] = await Promise.all([
        fetch(`/api/properties/${id}`),
        fetch(`/api/properties/${id}/instructions`),
        fetch(`/api/properties/${id}/photos`),
      ])

      if (propRes.ok) {
        setProperty(await propRes.json())
      }
      if (instRes.ok) {
        const data = await instRes.json()
        setInstructions(data.instructions || data)
        setInstructionsByRoom(data.byRoom || {})
      }
      if (photoRes.ok) {
        const data = await photoRes.json()
        setPhotos(data.photos)
        setPhotosByRoom(data.byRoom)
      }
    } catch (error) {
      console.error('Failed to load property data:', error)
      toast.error('Failed to load property')
    } finally {
      setIsLoading(false)
    }
  }

  // Instruction handlers
  const handleAddInstruction = async () => {
    if (!newInstruction.trim()) return

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
        setInstructions([...instructions, added])
        // Update byRoom
        const updatedByRoom = { ...instructionsByRoom }
        const room = added.room || 'General'
        if (!updatedByRoom[room]) updatedByRoom[room] = []
        updatedByRoom[room].push(added)
        setInstructionsByRoom(updatedByRoom)
        setNewInstruction('')
        setNewInstructionLinkedPhoto('')
        toast.success('Instruction added')
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
        setInstructions(instructions.map(i =>
          i.id === editingInstruction.id ? updated : i
        ))
        // Rebuild byRoom
        const updatedInstructions = instructions.map(i =>
          i.id === editingInstruction.id ? updated : i
        )
        const byRoom: Record<string, Instruction[]> = {}
        for (const inst of updatedInstructions) {
          const room = inst.room || 'General'
          if (!byRoom[room]) byRoom[room] = []
          byRoom[room].push(inst)
        }
        setInstructionsByRoom(byRoom)
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
        // Rebuild byRoom
        const byRoom: Record<string, Instruction[]> = {}
        for (const inst of filtered) {
          const room = inst.room || 'General'
          if (!byRoom[room]) byRoom[room] = []
          byRoom[room].push(inst)
        }
        setInstructionsByRoom(byRoom)
        toast.success('Instruction removed')
      }
    } catch (error) {
      toast.error('Failed to delete instruction')
    }
  }

  // Photo handlers
  const handleAddPhoto = async () => {
    if (!newPhotoUrl || !newPhotoRoom) {
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
          setPhotos(data.photos)
          setPhotosByRoom(data.byRoom)
        }
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
        // Update local state
        const updated = photos.map(p =>
          p.id === selectedPhoto.id ? { ...p, notes: editingPhotoNotes } : p
        )
        setPhotos(updated)
        // Rebuild byRoom
        const byRoom: Record<string, Photo[]> = {}
        for (const photo of updated) {
          if (!byRoom[photo.room]) byRoom[photo.room] = []
          byRoom[photo.room].push(photo)
        }
        setPhotosByRoom(byRoom)
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
        setPhotos(photos.filter(p => p.id !== photoId))
        // Rebuild byRoom
        const updated = photos.filter(p => p.id !== photoId)
        const byRoom: Record<string, Photo[]> = {}
        for (const photo of updated) {
          if (!byRoom[photo.room]) byRoom[photo.room] = []
          byRoom[photo.room].push(photo)
        }
        setPhotosByRoom(byRoom)
        toast.success('Photo removed')
      }
    } catch (error) {
      toast.error('Failed to delete photo')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <AdminHeader title="Property Details" />
        <div className="p-6 text-center text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="min-h-screen">
        <AdminHeader title="Property Not Found" />
        <div className="p-6">
          <Button variant="outline" onClick={() => router.push('/properties')}>
            <ArrowLeft size={16} />
            Back to Properties
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title={property.name} />

      <div className="p-6">
        <Button variant="ghost" onClick={() => router.push('/properties')} className="mb-4">
          <ArrowLeft size={16} />
          Back to Properties
        </Button>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'info' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('info')}
          >
            <Building size={16} />
            Property Info
          </Button>
          <Button
            variant={activeTab === 'instructions' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('instructions')}
          >
            <ListChecks size={16} />
            Cleaning Instructions ({instructions.length})
          </Button>
          <Button
            variant={activeTab === 'photos' ? 'primary' : 'outline'}
            onClick={() => setActiveTab('photos')}
          >
            <Camera size={16} />
            Reference Photos ({photos.length})
          </Button>
        </div>

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {property.imageUrl && (
                  <div className="relative h-48 w-full rounded-lg overflow-hidden">
                    <Image
                      src={property.imageUrl}
                      alt={property.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-500">Address</label>
                  <p className="font-medium">{property.address}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Owner</label>
                  <p className="font-medium">{property.ownerName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Base Rate</label>
                  <p className="font-medium">${property.baseRate.toFixed(2)}</p>
                </div>
                {property.bedConfig && (
                  <div>
                    <label className="text-sm text-gray-500">Bed Configuration</label>
                    <p className="font-medium">{property.bedConfig}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Access Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {property.accessCode && (
                  <div>
                    <label className="text-sm text-gray-500">Access Code</label>
                    <p className="font-mono text-lg font-bold">{property.accessCode}</p>
                  </div>
                )}
                {property.accessNotes && (
                  <div>
                    <label className="text-sm text-gray-500">Access Notes</label>
                    <p className="font-medium">{property.accessNotes}</p>
                  </div>
                )}
                {!property.accessCode && !property.accessNotes && (
                  <p className="text-gray-500">No access information provided</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Instructions Tab */}
        {activeTab === 'instructions' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cleaning Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Add specific cleaning instructions organized by room. Link to photos for visual reference.
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
                                  <Select
                                    value={editingInstruction.room}
                                    onChange={(e) =>
                                      setEditingInstruction({
                                        ...editingInstruction,
                                        room: e.target.value,
                                      })
                                    }
                                    options={[
                                      { value: 'General', label: 'General' },
                                      ...ROOM_OPTIONS.map(r => ({ value: r, label: r })),
                                    ]}
                                  />
                                  <Select
                                    value={editingInstruction.linkedPhotoId || ''}
                                    onChange={(e) =>
                                      setEditingInstruction({
                                        ...editingInstruction,
                                        linkedPhotoId: e.target.value || null,
                                        linkedPhoto: e.target.value
                                          ? photos.find(p => p.id === e.target.value) as LinkedPhoto || null
                                          : null,
                                      })
                                    }
                                    options={[
                                      { value: '', label: 'No photo linked' },
                                      ...photos.map(photo => ({
                                        value: photo.id,
                                        label: `${photo.room}${photo.caption ? ` - ${photo.caption}` : ''}`,
                                      })),
                                    ]}
                                  />
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
                                    <button
                                      onClick={() => {
                                        const photo = photos.find(p => p.id === inst.linkedPhotoId)
                                        if (photo) {
                                          setSelectedPhoto(photo)
                                          setEditingPhotoNotes(photo.notes || '')
                                        }
                                      }}
                                      className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                      <Camera size={12} />
                                      View linked photo
                                    </button>
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
        {activeTab === 'photos' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Reference Photos</CardTitle>
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
            placeholder="Brief description for gallery view"
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
                placeholder="Detailed instructions for this photo (visible to workers)"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setSelectedPhoto(null)}>
                Close
              </Button>
              <Button
                onClick={handleSavePhotoNotes}
                isLoading={isSavingPhotoNotes}
              >
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
