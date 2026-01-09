'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building,
  AlertCircle,
  Camera,
  Plus,
  X,
  Check,
  Clock,
  Bell,
  User,
  Info,
  AlertTriangle,
  Upload,
  Trash2,
  Package,
  BedDouble,
  ListChecks,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Navigation,
} from 'lucide-react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface NotePhoto {
  id: string
  url: string
  caption?: string
}

interface PropertyNote {
  id: string
  type: string
  title?: string
  content: string
  severity?: string
  status: string
  createdAt: string
  addedBy: { name: string }
  photos: NotePhoto[]
}

interface PropertyDetail {
  id: string
  name: string
  address: string
  accessCode?: string
  accessNotes?: string
  bedConfig?: string
}

interface LinenRequirement {
  itemId: string
  itemName: string
  itemCode: string
  category: string
  perFlip: number
  onHand: number
}

interface PropertyPhoto {
  id: string
  room: string
  caption: string | null
  notes: string | null
  url: string
}

interface PropertyInstruction {
  id: string
  room: string
  instruction: string
  linkedPhotoId: string | null
  linkedPhoto: PropertyPhoto | null
}

const NOTE_TYPES = [
  { value: 'damage', label: 'Damage', icon: AlertTriangle, color: 'red' },
  { value: 'issue', label: 'Issue', icon: AlertCircle, color: 'orange' },
  { value: 'reminder', label: 'Reminder', icon: Bell, color: 'amber' },
  { value: 'owner_request', label: 'Owner Request', icon: User, color: 'purple' },
  { value: 'info', label: 'Info', icon: Info, color: 'blue' },
]

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'green' },
  { value: 'medium', label: 'Medium', color: 'amber' },
  { value: 'high', label: 'High', color: 'red' },
]

export default function WorkerPropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const propertyId = params.id as string

  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [notes, setNotes] = useState<PropertyNote[]>([])
  const [linenRequirements, setLinenRequirements] = useState<LinenRequirement[]>([])
  const [instructions, setInstructions] = useState<PropertyInstruction[]>([])
  const [instructionsByRoom, setInstructionsByRoom] = useState<Record<string, PropertyInstruction[]>>({})
  const [photos, setPhotos] = useState<PropertyPhoto[]>([])
  const [photosByRoom, setPhotosByRoom] = useState<Record<string, PropertyPhoto[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [showAddNote, setShowAddNote] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Photo detail modal
  const [selectedPhoto, setSelectedPhoto] = useState<PropertyPhoto | null>(null)

  // Collapsible sections
  const [showInstructions, setShowInstructions] = useState(true)
  const [showPhotos, setShowPhotos] = useState(true)

  // New note form state
  const [noteType, setNoteType] = useState('issue')
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteSeverity, setNoteSeverity] = useState<string | null>(null)
  const [uploadedPhotos, setUploadedPhotos] = useState<{ url: string; caption: string }[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [propRes, notesRes, linensRes, instructionsRes, photosRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}`),
        fetch(`/api/notes?propertyId=${propertyId}&includeResolved=true`),
        fetch(`/api/linens/property/${propertyId}`),
        fetch(`/api/properties/${propertyId}/instructions`),
        fetch(`/api/properties/${propertyId}/photos`),
      ])

      if (propRes.ok) {
        setProperty(await propRes.json())
      }
      if (notesRes.ok) {
        setNotes(await notesRes.json())
      }
      if (linensRes.ok) {
        const data = await linensRes.json()
        // Only show items with perFlip > 0 (items needed for this property)
        setLinenRequirements(
          (data.linens || []).filter((l: LinenRequirement) => l.perFlip > 0)
        )
      }
      if (instructionsRes.ok) {
        const data = await instructionsRes.json()
        setInstructions(data.instructions || data)
        setInstructionsByRoom(data.byRoom || {})
      }
      if (photosRes.ok) {
        const data = await photosRes.json()
        setPhotos(data.photos || [])
        setPhotosByRoom(data.byRoom || {})
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'notes')

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const { url } = await response.json()
          setUploadedPhotos((prev) => [...prev, { url, caption: '' }])
        }
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const removePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmitNote = async () => {
    if (!noteContent.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          type: noteType,
          title: noteTitle || null,
          content: noteContent,
          severity: noteSeverity,
          photos: uploadedPhotos,
        }),
      })

      if (response.ok) {
        // Reset form
        setNoteType('issue')
        setNoteTitle('')
        setNoteContent('')
        setNoteSeverity(null)
        setUploadedPhotos([])
        setShowAddNote(false)
        // Refresh notes
        fetchData()
      }
    } catch (error) {
      console.error('Failed to submit note:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTypeConfig = (type: string) => {
    return NOTE_TYPES.find((t) => t.value === type) || NOTE_TYPES[4]
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">Loading...</div>
    )
  }

  if (!property) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft size={20} className="mr-2" /> Back
        </Button>
        <div className="text-center py-8 text-gray-500">Property not found</div>
      </div>
    )
  }

  const activeNotes = notes.filter((n) => n.status !== 'resolved')
  const resolvedNotes = notes.filter((n) => n.status === 'resolved')

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{property.name}</h1>
          <a
            href={`https://maps.google.com/maps?q=${encodeURIComponent(property.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            onClick={(e) => {
              e.preventDefault()
              // Try to use native navigation on mobile
              const address = encodeURIComponent(property.address)
              // Check if on iOS
              const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
              // Check if on Android
              const isAndroid = /Android/.test(navigator.userAgent)

              if (isIOS) {
                // Apple Maps with fallback to Google Maps
                window.location.href = `maps://maps.google.com/maps?daddr=${address}`
              } else if (isAndroid) {
                // Google Maps intent for Android
                window.location.href = `geo:0,0?q=${address}`
              } else {
                // Desktop - open Google Maps in new tab
                window.open(`https://maps.google.com/maps?q=${address}`, '_blank')
              }
            }}
          >
            <Navigation size={14} />
            {property.address}
          </a>
        </div>
      </div>

      {/* Property Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building size={20} />
            Property Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {property.accessCode && (
            <div>
              <span className="text-sm text-gray-500">Access Code:</span>
              <span className="ml-2 font-mono font-bold text-lg">{property.accessCode}</span>
            </div>
          )}
          {property.accessNotes && (
            <div>
              <span className="text-sm text-gray-500">Access Notes:</span>
              <p className="text-gray-700">{property.accessNotes}</p>
            </div>
          )}
          {property.bedConfig && (
            <div>
              <span className="text-sm text-gray-500">Bed Configuration:</span>
              <p className="text-gray-700">{property.bedConfig}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cleaning Instructions */}
      {instructions.length > 0 && (
        <Card>
          <CardHeader>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full flex items-center justify-between"
            >
              <CardTitle className="flex items-center gap-2">
                <ListChecks size={20} className="text-emerald-600" />
                Cleaning Instructions ({instructions.length})
              </CardTitle>
              {showInstructions ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          </CardHeader>
          {showInstructions && (
            <CardContent className="space-y-4">
              {Object.entries(instructionsByRoom).map(([room, roomInstructions]) => (
                <div key={room} className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-800 mb-2">{room}</h4>
                  <ul className="space-y-2">
                    {roomInstructions.map((inst, idx) => (
                      <li key={inst.id} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-medium">{idx + 1}.</span>
                        <div className="flex-1">
                          <p className="text-gray-700">{inst.instruction}</p>
                          {inst.linkedPhoto && (
                            <button
                              onClick={() => setSelectedPhoto(inst.linkedPhoto)}
                              className="mt-1 text-sm text-blue-600 flex items-center gap-1 hover:underline"
                            >
                              <Camera size={14} />
                              View photo
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Reference Photos */}
      {photos.length > 0 && (
        <Card>
          <CardHeader>
            <button
              onClick={() => setShowPhotos(!showPhotos)}
              className="w-full flex items-center justify-between"
            >
              <CardTitle className="flex items-center gap-2">
                <Camera size={20} className="text-blue-600" />
                Reference Photos ({photos.length})
              </CardTitle>
              {showPhotos ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </button>
          </CardHeader>
          {showPhotos && (
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                Tap a photo to see detailed instructions
              </p>
              {Object.entries(photosByRoom).map(([room, roomPhotos]) => (
                <div key={room}>
                  <h4 className="font-semibold text-gray-800 mb-2">{room}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {roomPhotos.map((photo) => (
                      <button
                        key={photo.id}
                        onClick={() => setSelectedPhoto(photo)}
                        className={cn(
                          'relative rounded-lg overflow-hidden border-2 transition-all',
                          photo.notes
                            ? 'border-blue-400 hover:border-blue-600'
                            : 'border-transparent hover:border-gray-300'
                        )}
                      >
                        <div className="relative h-24 w-full">
                          <Image
                            src={photo.url}
                            alt={photo.caption || room}
                            fill
                            className="object-cover"
                          />
                        </div>
                        {photo.notes && (
                          <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-xs py-0.5 text-center">
                            <Info size={10} className="inline mr-1" />
                            Notes
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Linens & Supplies Required */}
      {linenRequirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package size={20} className="text-emerald-600" />
              Linens & Supplies Needed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-3">
              Items needed to fully stock this property per turnover:
            </p>
            <div className="space-y-2">
              {/* Group by category */}
              {Object.entries(
                linenRequirements.reduce((acc, item) => {
                  if (!acc[item.category]) acc[item.category] = []
                  acc[item.category].push(item)
                  return acc
                }, {} as Record<string, LinenRequirement[]>)
              ).map(([category, items]) => (
                <div key={category} className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-700 mb-2 capitalize">{category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((item) => (
                      <div
                        key={item.itemId}
                        className="flex items-center justify-between bg-white p-2 rounded border"
                      >
                        <span className="text-sm text-gray-700">{item.itemName}</span>
                        <span className="font-bold text-emerald-700 text-lg">{item.perFlip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Note Button */}
      {!showAddNote && (
        <Button
          onClick={() => setShowAddNote(true)}
          className="w-full"
          size="lg"
        >
          <Plus size={20} className="mr-2" />
          Report Issue / Add Note
        </Button>
      )}

      {/* Add Note Form */}
      {showAddNote && (
        <Card className="border-2 border-emerald-500">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>New Note</span>
              <button onClick={() => setShowAddNote(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Note Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {NOTE_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setNoteType(type.value)}
                      className={cn(
                        'p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all',
                        noteType === type.value
                          ? `border-${type.color}-500 bg-${type.color}-50`
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                      style={{
                        borderColor: noteType === type.value ? `var(--${type.color}-500, #ef4444)` : undefined,
                        backgroundColor: noteType === type.value ? `var(--${type.color}-50, #fef2f2)` : undefined,
                      }}
                    >
                      <Icon size={20} className={noteType === type.value ? `text-${type.color}-600` : 'text-gray-400'} />
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Severity (for damage/issue) */}
            {(noteType === 'damage' || noteType === 'issue') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                <div className="flex gap-2">
                  {SEVERITY_OPTIONS.map((sev) => (
                    <button
                      key={sev.value}
                      type="button"
                      onClick={() => setNoteSeverity(sev.value)}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all',
                        noteSeverity === sev.value
                          ? sev.color === 'green'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : sev.color === 'amber'
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      {sev.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Title */}
            <Input
              label="Title (optional)"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Brief summary..."
            />

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Describe the issue, damage, or note in detail..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos (Evidence)
              </label>
              <div className="space-y-3">
                {/* Uploaded photos preview */}
                {uploadedPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {uploadedPhotos.map((photo, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={photo.url}
                          alt={`Upload ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                  {isUploading ? (
                    <span className="text-gray-500">Uploading...</span>
                  ) : (
                    <>
                      <Camera size={24} className="text-gray-400" />
                      <span className="text-gray-600">Tap to add photos</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmitNote}
              disabled={!noteContent.trim() || isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Note'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Notes */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertCircle size={20} className="text-amber-500" />
          Active Notes ({activeNotes.length})
        </h2>
        {activeNotes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-6 text-gray-500">
              No active notes for this property
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeNotes.map((note) => {
              const typeConfig = getTypeConfig(note.type)
              const Icon = typeConfig.icon
              return (
                <Card key={note.id} className="border-l-4 border-l-amber-500">
                  <CardContent className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon size={18} className="text-amber-600" />
                        <span className="font-medium capitalize">{note.type.replace('_', ' ')}</span>
                        {note.severity && (
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              note.severity === 'high'
                                ? 'bg-red-100 text-red-700'
                                : note.severity === 'medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-green-100 text-green-700'
                            )}
                          >
                            {note.severity}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {format(new Date(note.createdAt), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    {note.title && (
                      <p className="font-semibold text-gray-900">{note.title}</p>
                    )}
                    <p className="text-gray-700">{note.content}</p>
                    {note.photos && note.photos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 pt-2">
                        {note.photos.map((photo) => (
                          <img
                            key={photo.id}
                            src={photo.url}
                            alt="Evidence"
                            className="w-full h-16 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400">Added by {note.addedBy.name}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Resolved Notes */}
      {resolvedNotes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-500">
            <Check size={20} />
            Resolved ({resolvedNotes.length})
          </h2>
          <div className="space-y-3 opacity-60">
            {resolvedNotes.slice(0, 5).map((note) => (
              <Card key={note.id} className="border-l-4 border-l-gray-300">
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-medium capitalize text-gray-600">
                        {note.type.replace('_', ' ')}
                      </span>
                      {note.title && <span className="ml-2 text-gray-500">- {note.title}</span>}
                    </div>
                    <span className="text-xs text-gray-400">
                      {format(new Date(note.createdAt), 'MMM d')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{note.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Photo Detail Modal */}
      <Modal
        isOpen={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        title={selectedPhoto ? `${selectedPhoto.room}${selectedPhoto.caption ? ` - ${selectedPhoto.caption}` : ''}` : 'Photo'}
      >
        {selectedPhoto && (
          <div className="space-y-4">
            <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={selectedPhoto.url}
                alt={selectedPhoto.caption || selectedPhoto.room}
                fill
                className="object-contain"
              />
            </div>
            {selectedPhoto.caption && (
              <p className="text-center text-gray-600 font-medium">
                {selectedPhoto.caption}
              </p>
            )}
            {selectedPhoto.notes ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <ListChecks size={16} />
                  Instructions for this photo
                </h4>
                <p className="text-blue-900 whitespace-pre-wrap">{selectedPhoto.notes}</p>
              </div>
            ) : (
              <p className="text-center text-gray-400 text-sm">
                No additional notes for this photo
              </p>
            )}
            <Button
              variant="outline"
              onClick={() => setSelectedPhoto(null)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
