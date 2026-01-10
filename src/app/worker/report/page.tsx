'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, Camera, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import toast from 'react-hot-toast'

interface Property {
  id: string
  name: string
  address: string
}

const NOTE_TYPES = [
  { value: 'issue', label: 'Issue', description: 'Something needs attention' },
  { value: 'damage', label: 'Damage', description: 'Property damage found' },
  { value: 'reminder', label: 'Reminder', description: 'Note for future visits' },
  { value: 'owner_request', label: 'Owner Request', description: 'Request from property owner' },
  { value: 'info', label: 'Info', description: 'General information' },
]

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-blue-600' },
  { value: 'medium', label: 'Medium', color: 'text-amber-600' },
  { value: 'high', label: 'High', color: 'text-red-600' },
]

export default function ReportIssuePage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading...</div>}>
      <ReportIssueContent />
    </Suspense>
  )
}

function ReportIssueContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPropertyId = searchParams.get('propertyId')

  const [properties, setProperties] = useState<Property[]>([])
  const [isLoadingProperties, setIsLoadingProperties] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(preselectedPropertyId || '')
  const [noteType, setNoteType] = useState<string>('issue')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [severity, setSeverity] = useState<string>('medium')
  const [estimatedCost, setEstimatedCost] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  useEffect(() => {
    fetchProperties()
  }, [])

  useEffect(() => {
    if (preselectedPropertyId) {
      setSelectedPropertyId(preselectedPropertyId)
    }
  }, [preselectedPropertyId])

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/worker/properties')
      if (response.ok) {
        const data = await response.json()
        setProperties(data)
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error)
      toast.error('Failed to load properties')
    } finally {
      setIsLoadingProperties(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const { url } = await response.json()
        setPhotos([...photos, url])
        toast.success('Photo uploaded')
      } else {
        toast.error('Failed to upload photo')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload photo')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPropertyId) {
      toast.error('Please select a property')
      return
    }

    if (!content.trim()) {
      toast.error('Please describe the issue')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          type: noteType,
          title: title.trim() || undefined,
          content: content.trim(),
          severity: ['issue', 'damage'].includes(noteType) ? severity : undefined,
          estimatedCost: noteType === 'damage' && estimatedCost ? parseFloat(estimatedCost) : undefined,
          photos: photos.map(url => ({ url })),
        }),
      })

      if (response.ok) {
        toast.success('Report submitted successfully')
        router.push('/worker')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to submit report')
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('Failed to submit report')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)
  const showSeverity = ['issue', 'damage'].includes(noteType)
  const showEstimatedCost = noteType === 'damage'

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="text-amber-600" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Report an Issue</h1>
          <p className="text-sm text-gray-500">Document issues, damage, or notes</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Property Selector */}
        <Card>
          <CardContent>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property *
            </label>
            {isLoadingProperties ? (
              <div className="text-gray-500 py-2">Loading properties...</div>
            ) : (
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-base"
                required
              >
                <option value="">Select a property...</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            )}
            {selectedProperty && (
              <p className="text-sm text-gray-500 mt-1">{selectedProperty.address}</p>
            )}
          </CardContent>
        </Card>

        {/* Report Type */}
        <Card>
          <CardContent>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type of Report *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {NOTE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setNoteType(type.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    noteType === type.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-gray-500">{type.description}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Severity (for issues/damage) */}
        {showSeverity && (
          <Card>
            <CardContent>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity
              </label>
              <div className="flex gap-2">
                {SEVERITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSeverity(option.value)}
                    className={`flex-1 py-2 px-3 rounded-lg border font-medium transition-colors ${
                      severity === option.value
                        ? option.value === 'high'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : option.value === 'medium'
                          ? 'border-amber-500 bg-amber-50 text-amber-700'
                          : 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Title & Description */}
        <Card>
          <CardContent className="space-y-4">
            <Input
              label="Title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[120px]"
                required
              />
            </div>

            {/* Estimated Cost (for damage) */}
            {showEstimatedCost && (
              <Input
                label="Estimated Repair Cost"
                type="number"
                step="0.01"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="0.00"
              />
            )}
          </CardContent>
        </Card>

        {/* Photo Upload */}
        <Card>
          <CardContent>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos
            </label>

            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photos.map((url, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={url}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={isUploadingPhoto}
              />
              {isUploadingPhoto ? (
                <span className="text-gray-500">Uploading...</span>
              ) : (
                <>
                  <Camera size={20} className="text-gray-400" />
                  <span className="text-gray-600">Add Photo</span>
                </>
              )}
            </label>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full py-3"
          isLoading={isSubmitting}
          disabled={!selectedPropertyId || !content.trim()}
        >
          <AlertTriangle size={18} />
          Submit Report
        </Button>
      </form>
    </div>
  )
}
