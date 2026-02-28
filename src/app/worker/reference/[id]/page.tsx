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
  Camera,
  BedDouble,
  FileText,
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
  imageUrl?: string | null
}

interface RoomData {
  id: string
  name: string
  type: string
  floor: string | null
  beds: Array<{ type: string; count: number }> | null
  pillowCount: number | null
  sheetSet: string | null
  servesRoom: string | null
  notes: string | null
  sortOrder: number
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
  const [rooms, setRooms] = useState<RoomData[]>([])
  const [linensByRoom, setLinensByRoom] = useState<Record<string, LinenRequirement[]>>({})
  const [instructionsByRoom, setInstructionsByRoom] = useState<Record<string, PropertyInstruction[]>>({})
  const [photosByRoom, setPhotosByRoom] = useState<Record<string, PropertyPhoto[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  // Photo detail modal
  const [selectedPhoto, setSelectedPhoto] = useState<PropertyPhoto | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [propRes, roomsRes, linensRes, instructionsRes, photosRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}`),
        fetch(`/api/properties/${propertyId}/rooms`),
        fetch(`/api/linens/property/${propertyId}`),
        fetch(`/api/properties/${propertyId}/instructions`),
        fetch(`/api/properties/${propertyId}/photos`),
      ])

      if (propRes.ok) {
        setProperty(await propRes.json())
      }
      if (roomsRes.ok) {
        const data = await roomsRes.json()
        setRooms(data.rooms || [])
      }
      if (linensRes.ok) {
        const data = await linensRes.json()
        const filteredLinens = (data.linens || []).filter((l: LinenRequirement) => l.perFlip > 0)
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
        setInstructionsByRoom(data.byRoom || {})
      }
      if (photosRes.ok) {
        const data = await photosRes.json()
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

  const openNavigation = () => {
    const address = encodeURIComponent(property.address)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)

    if (isIOS) {
      window.location.href = `maps://maps.google.com/maps?daddr=${address}`
    } else if (isAndroid) {
      window.location.href = `geo:0,0?q=${address}`
    } else {
      window.open(`https://maps.google.com/maps?q=${address}`, '_blank')
    }
  }

  // Group rooms by floor for display
  const roomsByFloor: Record<string, RoomData[]> = {}
  for (const room of rooms) {
    const floor = room.floor || 'General'
    if (!roomsByFloor[floor]) roomsByFloor[floor] = []
    roomsByFloor[floor].push(room)
  }

  // Floor ordering
  const floorOrder = ['Main Floor', 'Upstairs', '1st Floor', '2nd Floor', 'Basement', 'Garage', 'General']
  const sortedFloors = Object.keys(roomsByFloor).sort((a, b) => {
    const aIdx = floorOrder.indexOf(a)
    const bIdx = floorOrder.indexOf(b)
    if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx
    if (aIdx >= 0) return -1
    if (bIdx >= 0) return 1
    return a.localeCompare(b)
  })

  // Collect all room names that have data from instructions/linens/photos but no Room entity
  const roomEntityNames = new Set(rooms.map(r => r.name))
  const legacyRoomNames = new Set<string>()
  for (const key of [...Object.keys(instructionsByRoom), ...Object.keys(linensByRoom), ...Object.keys(photosByRoom)]) {
    if (!roomEntityNames.has(key)) {
      legacyRoomNames.add(key)
    }
  }

  // Render a room card
  const renderRoomCard = (room: RoomData | null, roomName: string) => {
    const roomInstructions = instructionsByRoom[roomName] || []
    const roomLinens = linensByRoom[roomName] || []
    const linkedPhotoIds = new Set(
      roomInstructions
        .filter(inst => inst.linkedPhotoId)
        .map(inst => inst.linkedPhotoId)
    )
    const roomPhotos = (photosByRoom[roomName] || []).filter(
      (p: PropertyPhoto) => !linkedPhotoIds.has(p.id)
    )

    const hasSetupInfo = room && (room.sheetSet || room.pillowCount || room.beds || room.notes || room.servesRoom)

    return (
      <Card key={roomName}>
        <CardHeader className="py-3 bg-gray-50">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{roomName}</span>
            {room?.type === 'bedroom' && <BedDouble size={16} className="text-indigo-500" />}
            {room?.type === 'bathroom' && <span className="text-xs text-gray-500">Bath</span>}
            {room?.type === 'storage' && <Package size={16} className="text-gray-500" />}
          </CardTitle>
          {room?.servesRoom && (
            <p className="text-xs text-gray-500 mt-1">Serves: {room.servesRoom}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bed & Sheet Setup Info */}
          {hasSetupInfo && (
            <div className="space-y-2">
              {room.beds && Array.isArray(room.beds) && room.beds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {room.beds.map((bed: { type: string; count: number }, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-sm px-2 py-1 rounded border border-indigo-100">
                      <BedDouble size={14} />
                      {bed.count > 1 ? `${bed.count}x ` : ''}{bed.type}
                    </span>
                  ))}
                </div>
              )}
              {room.sheetSet && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Sheets:</span> {room.sheetSet}
                </p>
              )}
              {room.pillowCount != null && room.pillowCount > 0 && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Pillows:</span> {room.pillowCount}
                </p>
              )}
            </div>
          )}

          {/* Room Notes (towel placement, arrangement details) */}
          {room?.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <h5 className="text-sm font-medium text-amber-800 mb-1 flex items-center gap-1">
                <FileText size={14} />
                Setup Notes
              </h5>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">{room.notes}</p>
            </div>
          )}

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

          {/* Room Reference Photos */}
          {roomPhotos.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Camera size={14} className="text-blue-600" />
                Reference Photos
              </h5>
              <div className="grid grid-cols-3 gap-2">
                {roomPhotos.map((photo: PropertyPhoto) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedPhoto(photo)}
                    className="relative rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-all"
                  >
                    <div className="relative h-20 w-full">
                      <Image
                        src={photo.url}
                        alt={photo.caption || roomName}
                        fill
                        className="object-cover"
                      />
                    </div>
                    {photo.caption && (
                      <div className="bg-gray-800 text-white text-xs py-0.5 px-1 text-center truncate">
                        {photo.caption}
                      </div>
                    )}
                  </button>
                ))}
              </div>
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
                    key={`${item.itemId}-${roomName}`}
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
          {!hasSetupInfo && roomInstructions.length === 0 && roomLinens.length === 0 && roomPhotos.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-2">
              No specific instructions for this room
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="pb-24">
      {/* Property Photo Header */}
      {property.imageUrl ? (
        <div className="relative h-48 -mt-4 -mx-4">
          <Image
            src={property.imageUrl}
            alt={property.name}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h1 className="text-2xl font-bold drop-shadow-lg">{property.name}</h1>
            <button
              onClick={openNavigation}
              className="flex items-center gap-1 text-white/90 text-sm mt-1 hover:text-white"
            >
              <Navigation size={14} />
              {property.address}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative h-32 -mt-4 -mx-4 bg-gradient-to-br from-emerald-500 to-emerald-600">
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h1 className="text-2xl font-bold">{property.name}</h1>
            <button
              onClick={openNavigation}
              className="flex items-center gap-1 text-white/90 text-sm mt-1 hover:text-white"
            >
              <Navigation size={14} />
              {property.address}
            </button>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">

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

      {/* Room-by-Room Setup Guide */}
      {(rooms.length > 0 || legacyRoomNames.size > 0) && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ListChecks size={20} className="text-emerald-600" />
            Room Setup Guide
          </h2>

          {/* Rooms grouped by floor */}
          {sortedFloors.map((floor) => (
            <div key={floor} className="space-y-2">
              {sortedFloors.length > 1 && (
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 pb-1">
                  {floor}
                </h3>
              )}
              {roomsByFloor[floor].map((room) => renderRoomCard(room, room.name))}
            </div>
          ))}

          {/* Legacy rooms without Room entities */}
          {legacyRoomNames.size > 0 && (
            <div className="space-y-2">
              {Array.from(legacyRoomNames).sort().map((roomName) =>
                renderRoomCard(null, roomName)
              )}
            </div>
          )}
        </div>
      )}

      {/* Fallback: Show instructions/linens if no rooms exist at all */}
      {rooms.length === 0 && legacyRoomNames.size === 0 && (() => {
        const allRooms = new Set<string>([
          ...Object.keys(instructionsByRoom),
          ...Object.keys(linensByRoom),
          ...Object.keys(photosByRoom),
        ])
        if (allRooms.size === 0) return null
        return (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ListChecks size={20} className="text-emerald-600" />
              Room-by-Room Guide
            </h2>
            {Array.from(allRooms).sort().map((roomName) =>
              renderRoomCard(null, roomName)
            )}
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
    </div>
  )
}
