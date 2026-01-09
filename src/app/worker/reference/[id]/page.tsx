'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building,
  Info,
  Package,
  ListChecks,
  Navigation,
} from 'lucide-react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

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
  room: string
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

export default function WorkerPropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const propertyId = params.id as string

  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [linenRequirements, setLinenRequirements] = useState<LinenRequirement[]>([])
  const [linensByRoom, setLinensByRoom] = useState<Record<string, LinenRequirement[]>>({})
  const [instructions, setInstructions] = useState<PropertyInstruction[]>([])
  const [instructionsByRoom, setInstructionsByRoom] = useState<Record<string, PropertyInstruction[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Photo detail modal
  const [selectedPhoto, setSelectedPhoto] = useState<PropertyPhoto | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [propRes, linensRes, instructionsRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}`),
        fetch(`/api/linens/property/${propertyId}`),
        fetch(`/api/properties/${propertyId}/instructions`),
      ])

      if (propRes.ok) {
        setProperty(await propRes.json())
      }
      if (linensRes.ok) {
        const data = await linensRes.json()
        // Only show items with perFlip > 0 (items needed for this property)
        const filteredLinens = (data.linens || []).filter((l: LinenRequirement) => l.perFlip > 0)
        setLinenRequirements(filteredLinens)
        // Build byRoom from filtered linens
        const byRoom: Record<string, LinenRequirement[]> = {}
        for (const linen of filteredLinens) {
          const room = linen.room || 'General'
          if (!byRoom[room]) byRoom[room] = []
          byRoom[room].push(linen)
        }
        setLinensByRoom(byRoom)
      }
      if (instructionsRes.ok) {
        const data = await instructionsRes.json()
        setInstructions(data.instructions || data)
        setInstructionsByRoom(data.byRoom || {})
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

      {/* Room-by-Room Guide - Instructions with inline photos and linens */}
      {(() => {
        // Get all unique rooms from instructions and linens
        const allRooms = new Set<string>([
          ...Object.keys(instructionsByRoom),
          ...Object.keys(linensByRoom),
        ])
        const roomsArray = Array.from(allRooms).sort((a, b) => {
          // Sort "General" first, then alphabetically
          if (a === 'General') return -1
          if (b === 'General') return 1
          return a.localeCompare(b)
        })

        if (roomsArray.length === 0) return null

        return (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ListChecks size={20} className="text-emerald-600" />
              Room-by-Room Guide
            </h2>

            {roomsArray.map((room) => {
              const roomInstructions = instructionsByRoom[room] || []
              const roomLinens = linensByRoom[room] || []

              return (
                <Card key={room}>
                  <CardHeader className="py-3 bg-gray-50">
                    <CardTitle className="text-base">{room}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Instructions with inline photos */}
                    {roomInstructions.length > 0 && (
                      <div className="space-y-3">
                        {roomInstructions.map((inst, idx) => (
                          <div key={inst.id} className="border-l-2 border-emerald-400 pl-3">
                            <div className="flex items-start gap-2">
                              <span className="bg-emerald-100 text-emerald-700 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <p className="text-sm text-gray-700 flex-1">{inst.instruction}</p>
                            </div>
                            {inst.linkedPhoto && (
                              <button
                                onClick={() => setSelectedPhoto(inst.linkedPhoto)}
                                className="mt-2 ml-7 relative rounded-lg overflow-hidden border-2 border-blue-200 hover:border-blue-400 transition-all"
                              >
                                <div className="relative h-24 w-32">
                                  <Image
                                    src={inst.linkedPhoto.url}
                                    alt={inst.linkedPhoto.caption || 'Reference'}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                {inst.linkedPhoto.notes && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-xs py-0.5 text-center">
                                    <Info size={10} className="inline mr-1" />
                                    Tap for details
                                  </div>
                                )}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Linens */}
                    {roomLinens.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                          <Package size={14} className="text-amber-600" />
                          Linens Needed
                        </h5>
                        <div className="grid grid-cols-2 gap-2">
                          {roomLinens.map((item) => (
                            <div
                              key={`${item.itemId}-${room}`}
                              className="flex items-center justify-between bg-amber-50 p-2 rounded border border-amber-100"
                            >
                              <span className="text-sm text-gray-700">{item.itemName}</span>
                              <span className="font-bold text-amber-700">{item.perFlip}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty room */}
                    {roomInstructions.length === 0 && roomLinens.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-2">
                        No specific instructions for this room
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      })()}

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
