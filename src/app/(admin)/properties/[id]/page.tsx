'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
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

interface Instruction {
  id: string
  instruction: string
  sortOrder: number
}

interface Photo {
  id: string
  room: string
  caption: string | null
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

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()

  const [property, setProperty] = useState<Property | null>(null)
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [photosByRoom, setPhotosByRoom] = useState<Record<string, Photo[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'instructions' | 'photos'>('info')

  // Instructions form
  const [newInstruction, setNewInstruction] = useState('')
  const [editingInstruction, setEditingInstruction] = useState<Instruction | null>(null)
  const [isSavingInstruction, setIsSavingInstruction] = useState(false)

  // Photos form
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [newPhotoRoom, setNewPhotoRoom] = useState('')
  const [newPhotoCaption, setNewPhotoCaption] = useState('')
  const [newPhotoUrl, setNewPhotoUrl] = useState('')
  const [isSavingPhoto, setIsSavingPhoto] = useState(false)

  useEffect(() => {
    loadData()
  }, [resolvedParams.id])

  const loadData = async () => {
    try {
      const [propRes, instRes, photoRes] = await Promise.all([
        fetch(`/api/properties/${resolvedParams.id}`),
        fetch(`/api/properties/${resolvedParams.id}/instructions`),
        fetch(`/api/properties/${resolvedParams.id}/photos`),
      ])

      if (propRes.ok) {
        setProperty(await propRes.json())
      }
      if (instRes.ok) {
        setInstructions(await instRes.json())
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
      const res = await fetch(`/api/properties/${resolvedParams.id}/instructions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: newInstruction }),
      })

      if (res.ok) {
        const added = await res.json()
        setInstructions([...instructions, added])
        setNewInstruction('')
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
      const res = await fetch(`/api/properties/${resolvedParams.id}/instructions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingInstruction.id,
          instruction: editingInstruction.instruction,
        }),
      })

      if (res.ok) {
        setInstructions(instructions.map(i =>
          i.id === editingInstruction.id ? editingInstruction : i
        ))
        setEditingInstruction(null)
        toast.success('Instruction updated')
      }
    } catch (error) {
      toast.error('Failed to update instruction')
    }
  }

  const handleDeleteInstruction = async (id: string) => {
    try {
      const res = await fetch(`/api/properties/${resolvedParams.id}/instructions?instructionId=${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setInstructions(instructions.filter(i => i.id !== id))
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
      const res = await fetch(`/api/properties/${resolvedParams.id}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newPhotoUrl,
          room: newPhotoRoom,
          caption: newPhotoCaption,
        }),
      })

      if (res.ok) {
        toast.success('Photo added')
        setShowPhotoModal(false)
        setNewPhotoUrl('')
        setNewPhotoRoom('')
        setNewPhotoCaption('')
        // Refresh photos
        const photoRes = await fetch(`/api/properties/${resolvedParams.id}/photos`)
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

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const res = await fetch(`/api/properties/${resolvedParams.id}/photos?photoId=${photoId}`, {
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
                Add specific cleaning instructions for this property. These will be visible to cleaning staff.
              </p>

              {/* Add new instruction */}
              <div className="flex gap-2 mb-6">
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

              {/* Instructions list */}
              {instructions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No instructions yet. Add your first instruction above.
                </div>
              ) : (
                <div className="space-y-2">
                  {instructions.map((inst, index) => (
                    <div
                      key={inst.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg group"
                    >
                      <span className="text-gray-400 font-mono text-sm mt-1">
                        {index + 1}.
                      </span>
                      {editingInstruction?.id === inst.id ? (
                        <>
                          <Input
                            className="flex-1"
                            value={editingInstruction.instruction}
                            onChange={(e) =>
                              setEditingInstruction({
                                ...editingInstruction,
                                instruction: e.target.value,
                              })
                            }
                            autoFocus
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
                        </>
                      ) : (
                        <>
                          <p
                            className="flex-1 cursor-pointer"
                            onClick={() => setEditingInstruction(inst)}
                          >
                            {inst.instruction}
                          </p>
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
                      <h4 className="font-medium text-gray-900 mb-3">{room}</h4>
                      <div className="grid grid-cols-4 gap-4">
                        {roomPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="relative group rounded-lg overflow-hidden"
                          >
                            <div className="relative h-32 w-full">
                              <Image
                                src={photo.url}
                                alt={photo.caption || room}
                                fill
                                className="object-cover"
                              />
                            </div>
                            {photo.caption && (
                              <div className="p-2 text-xs text-gray-600">
                                {photo.caption}
                              </div>
                            )}
                            <button
                              onClick={() => handleDeletePhoto(photo.id)}
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
        }}
        title="Add Reference Photo"
      >
        <div className="space-y-4">
          <ImageUpload
            value={newPhotoUrl}
            onChange={setNewPhotoUrl}
            onRemove={() => setNewPhotoUrl('')}
            folder={`properties/${resolvedParams.id}/reference`}
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
            placeholder="Description of how this should look"
          />
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
    </div>
  )
}
