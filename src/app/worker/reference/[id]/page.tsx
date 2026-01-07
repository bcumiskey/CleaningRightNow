'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Package,
  Camera,
  StickyNote,
  Info,
  MapPin,
  Phone,
  Key,
  FileText,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PropertyDetail {
  id: string
  name: string
  address: string
  ownerName: string
  ownerPhone?: string
  ownerEmail?: string
  accessCode?: string
  instructions: Array<{
    id: string
    category: string
    content: string
    sortOrder: number
  }>
  photos: Array<{
    id: string
    url: string
    caption?: string
    room?: string
  }>
  notes: Array<{
    id: string
    type: string
    content: string
    status: string
  }>
  linens: Array<{
    categoryName: string
    items: Array<{
      name: string
      perFlip: number
    }>
  }>
}

type TabType = 'stocking' | 'photos' | 'notes' | 'info'

const tabs: { id: TabType; label: string; icon: typeof Package }[] = [
  { id: 'stocking', label: 'Stocking', icon: Package },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'info', label: 'Info', icon: Info },
]

export default function WorkerPropertyReferencePage() {
  const router = useRouter()
  const params = useParams()
  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('stocking')

  useEffect(() => {
    if (params.id) {
      fetchProperty()
    }
  }, [params.id])

  const fetchProperty = async () => {
    try {
      const response = await fetch(`/api/worker/properties/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setProperty(data)
      }
    } catch (error) {
      console.error('Failed to fetch property:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!property) {
    return null
  }

  const activeNotes = property.notes.filter(n => n.status === 'active')

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 -ml-1 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">{property.name}</h1>
            <p className="text-sm text-gray-500 truncate">{property.address}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mt-4 -mb-4 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'notes' && activeNotes.length > 0 && (
                <span className="ml-1 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                  {activeNotes.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4">
        {activeTab === 'stocking' && (
          <div className="space-y-4">
            {property.linens.length > 0 ? (
              property.linens.map((category) => (
                <div key={category.categoryName} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                    <h3 className="font-medium text-gray-900">{category.categoryName}</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {category.items
                      .filter(item => item.perFlip > 0)
                      .map((item) => (
                        <div key={item.name} className="flex items-center justify-between px-4 py-3">
                          <span className="text-gray-700">{item.name}</span>
                          <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {item.perFlip}
                          </span>
                        </div>
                      ))}
                    {category.items.filter(item => item.perFlip > 0).length === 0 && (
                      <p className="px-4 py-3 text-gray-500 text-sm">No items required</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No stocking requirements set</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <div>
            {property.photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {property.photos.map((photo) => (
                  <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Property photo'}
                      className="w-full h-full object-cover"
                    />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1">
                        {photo.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Camera className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No reference photos yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            {activeNotes.length > 0 ? (
              activeNotes.map((note) => (
                <div
                  key={note.id}
                  className={cn(
                    'rounded-xl p-4 border',
                    note.type === 'issue' ? 'bg-red-50 border-red-200' :
                    note.type === 'reminder' ? 'bg-amber-50 border-amber-200' :
                    note.type === 'owner_request' ? 'bg-purple-50 border-purple-200' :
                    'bg-blue-50 border-blue-200'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className={cn(
                      'w-4 h-4',
                      note.type === 'issue' ? 'text-red-600' :
                      note.type === 'reminder' ? 'text-amber-600' :
                      note.type === 'owner_request' ? 'text-purple-600' :
                      'text-blue-600'
                    )} />
                    <span className={cn(
                      'text-xs font-medium uppercase',
                      note.type === 'issue' ? 'text-red-700' :
                      note.type === 'reminder' ? 'text-amber-700' :
                      note.type === 'owner_request' ? 'text-purple-700' :
                      'text-blue-700'
                    )}>
                      {note.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-800">{note.content}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <StickyNote className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No active notes</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* Address */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-gray-900">{property.address}</p>
                </div>
              </div>
            </div>

            {/* Access Code */}
            {property.accessCode && (
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-start gap-3">
                  <Key className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Access Code</p>
                    <p className="text-gray-900 font-mono">{property.accessCode}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Owner Contact */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Owner</p>
                  <p className="text-gray-900">{property.ownerName}</p>
                  {property.ownerPhone && (
                    <a
                      href={`tel:${property.ownerPhone}`}
                      className="text-indigo-600 text-sm"
                    >
                      {property.ownerPhone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Instructions */}
            {property.instructions.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <h3 className="font-medium text-gray-900">Standing Instructions</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {property.instructions.map((instruction) => (
                    <div key={instruction.id} className="px-4 py-3">
                      <p className="text-xs text-gray-500 uppercase mb-1">
                        {instruction.category}
                      </p>
                      <p className="text-gray-700">{instruction.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
