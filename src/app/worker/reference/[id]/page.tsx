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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
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
  const [isLoading, setIsLoading] = useState(true)
  const [showAddNote, setShowAddNote] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // New note form state
  const [noteType, setNoteType] = useState('issue')
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteSeverity, setNoteSeverity] = useState<string | null>(null)
  const [uploadedPhotos, setUploadedPhotos] = useState<{ url: string; caption: string }[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [propRes, notesRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}`),
        fetch(`/api/notes?propertyId=${propertyId}&includeResolved=true`),
      ])

      if (propRes.ok) {
        setProperty(await propRes.json())
      }
      if (notesRes.ok) {
        setNotes(await notesRes.json())
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
        <div>
          <h1 className="text-xl font-bold">{property.name}</h1>
          <p className="text-sm text-gray-500">{property.address}</p>
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
    </div>
  )
}
