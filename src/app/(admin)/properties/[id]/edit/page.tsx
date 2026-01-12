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
  Bed,
  Home,
  ChevronDown,
  ChevronUp,
  Edit3,
  Package,
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

interface BedConfig {
  type: string
  count: number
}

interface Room {
  id: string
  name: string
  type: string
  beds: BedConfig[] | null
  sortOrder: number
  _count?: {
    instructions: number
    photos: number
    linenRequirements: number
    supplyRequirements: number
  }
  // Expanded data loaded on demand
  instructions?: Instruction[]
  photos?: Photo[]
}

const ROOM_TYPES = [
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'living', label: 'Living Room' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'other', label: 'Other' },
]

const BED_TYPES = ['King', 'Queen', 'Full', 'Twin', 'California King', 'Bunk', 'Sofa Bed', 'Crib']

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
  color: string | null
}

interface InventoryItem {
  itemId: string
  itemName: string
  itemCode: string
  category: string
  perFlip: number
  onHand?: number
  room: string
  type: 'linen' | 'supply'
}

interface AvailableItem {
  itemId: string
  itemName: string
  itemCode: string
  category: string
  defaultCost: number
}

interface CatalogItem {
  itemId: string
  itemName: string
  itemCode: string
  category: string
  defaultCost: number
  type: 'linen' | 'supply'
  perFlip: number // The configured quantity for this property (0 if not configured)
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

type TabType = 'details' | 'worker' | 'rooms' | 'inventory' | 'instructions' | 'photos'

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
    autoSendInvoice: false,
    accessCode: '',
    accessNotes: '',
    bedConfig: '',
    imageUrl: '',
    keywords: '',
    color: '',
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

  // Rooms state
  const [rooms, setRooms] = useState<Room[]>([])
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomType, setNewRoomType] = useState('bedroom')
  const [newRoomBeds, setNewRoomBeds] = useState<BedConfig[]>([])
  const [isSavingRoom, setIsSavingRoom] = useState(false)

  // Room expansion state
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null)
  const [roomPhotos, setRoomPhotos] = useState<Record<string, Photo[]>>({})
  const [roomInstructions, setRoomInstructions] = useState<Record<string, Instruction[]>>({})
  const [roomNewInstruction, setRoomNewInstruction] = useState('')
  const [roomNewPhotoUrl, setRoomNewPhotoUrl] = useState('')
  const [roomNewPhotoCaption, setRoomNewPhotoCaption] = useState('')
  const [isAddingRoomPhoto, setIsAddingRoomPhoto] = useState(false)
  const [isAddingRoomInstruction, setIsAddingRoomInstruction] = useState(false)

  // Room inventory state (kept for compatibility)
  const [roomInventory, setRoomInventory] = useState<Record<string, InventoryItem[]>>({})
  const [availableLinens, setAvailableLinens] = useState<AvailableItem[]>([])
  const [availableSupplies, setAvailableSupplies] = useState<AvailableItem[]>([])

  // Full catalog state for inventory form
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [catalogQuantities, setCatalogQuantities] = useState<Record<string, number>>({})
  const [isSavingInventory, setIsSavingInventory] = useState(false)
  const [inventoryDirty, setInventoryDirty] = useState(false)

  useEffect(() => {
    fetchOwners()
    if (!isNew) {
      loadPropertyData()
      fetchPropertyInventory()
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
      const [propRes, instRes, photoRes, roomsRes] = await Promise.all([
        fetch(`/api/properties/${id}`),
        fetch(`/api/properties/${id}/instructions`),
        fetch(`/api/properties/${id}/photos`),
        fetch(`/api/properties/${id}/rooms`),
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
          autoSendInvoice: prop.autoSendInvoice || false,
          accessCode: prop.accessCode || '',
          accessNotes: prop.accessNotes || '',
          bedConfig: prop.bedConfig || '',
          imageUrl: prop.imageUrl || '',
          keywords: prop.keywords || '',
          color: prop.color || '',
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

      if (roomsRes.ok) {
        const data = await roomsRes.json()
        setRooms(data.rooms || [])
      }
    } catch (error) {
      console.error('Failed to load property:', error)
      toast.error('Failed to load property')
    } finally {
      setIsLoading(false)
    }
  }

  // Room handlers
  const fetchRooms = async () => {
    try {
      const res = await fetch(`/api/properties/${id}/rooms`)
      if (res.ok) {
        const data = await res.json()
        setRooms(data.rooms || [])
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
    }
  }

  const handleAddRoom = async () => {
    if (!newRoomName.trim() || isNew) return

    setIsSavingRoom(true)
    try {
      const res = await fetch(`/api/properties/${id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName,
          type: newRoomType,
          beds: newRoomType === 'bedroom' && newRoomBeds.length > 0 ? newRoomBeds : null,
        }),
      })

      if (res.ok) {
        toast.success('Room added')
        setShowRoomModal(false)
        resetRoomForm()
        fetchRooms()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to add room')
      }
    } catch (error) {
      toast.error('Failed to add room')
    } finally {
      setIsSavingRoom(false)
    }
  }

  const handleUpdateRoom = async () => {
    if (!editingRoom) return

    setIsSavingRoom(true)
    try {
      const res = await fetch(`/api/properties/${id}/rooms/${editingRoom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName,
          type: newRoomType,
          beds: newRoomType === 'bedroom' && newRoomBeds.length > 0 ? newRoomBeds : null,
        }),
      })

      if (res.ok) {
        toast.success('Room updated')
        setShowRoomModal(false)
        setEditingRoom(null)
        resetRoomForm()
        fetchRooms()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update room')
      }
    } catch (error) {
      toast.error('Failed to update room')
    } finally {
      setIsSavingRoom(false)
    }
  }

  const handleDeleteRoom = async (roomId: string, force = false) => {
    try {
      const url = force
        ? `/api/properties/${id}/rooms/${roomId}?force=true`
        : `/api/properties/${id}/rooms/${roomId}`
      const res = await fetch(url, { method: 'DELETE' })

      if (res.ok) {
        toast.success('Room deleted')
        fetchRooms()
      } else {
        const error = await res.json()
        if (error.counts) {
          const total = Object.values(error.counts as Record<string, number>).reduce((a, b) => a + b, 0)
          if (confirm(`This room has ${total} linked items (instructions, photos, linens). Delete anyway?`)) {
            handleDeleteRoom(roomId, true)
          }
        } else {
          toast.error(error.error || 'Failed to delete room')
        }
      }
    } catch (error) {
      toast.error('Failed to delete room')
    }
  }

  const resetRoomForm = () => {
    setNewRoomName('')
    setNewRoomType('bedroom')
    setNewRoomBeds([])
  }

  const openEditRoom = (room: Room) => {
    setEditingRoom(room)
    setNewRoomName(room.name)
    setNewRoomType(room.type)
    setNewRoomBeds(room.beds || [])
    setShowRoomModal(true)
  }

  const addBedToRoom = () => {
    setNewRoomBeds([...newRoomBeds, { type: 'King', count: 1 }])
  }

  const updateBed = (index: number, field: 'type' | 'count', value: string | number) => {
    const updated = [...newRoomBeds]
    if (field === 'type') {
      updated[index].type = value as string
    } else {
      updated[index].count = Math.max(1, value as number)
    }
    setNewRoomBeds(updated)
  }

  const removeBed = (index: number) => {
    setNewRoomBeds(newRoomBeds.filter((_, i) => i !== index))
  }

  // Room expansion - load photos and instructions for a room
  const toggleRoomExpansion = async (room: Room) => {
    if (expandedRoomId === room.id) {
      setExpandedRoomId(null)
      return
    }

    setExpandedRoomId(room.id)
    setRoomNewInstruction('')
    setRoomNewPhotoUrl('')
    setRoomNewPhotoCaption('')

    // Load photos and instructions for this room if not already loaded
    if (!roomPhotos[room.name]) {
      const filtered = photos.filter(p => p.room === room.name)
      setRoomPhotos(prev => ({ ...prev, [room.name]: filtered }))
    }
    if (!roomInstructions[room.name]) {
      const filtered = instructions.filter(i => i.room === room.name)
      setRoomInstructions(prev => ({ ...prev, [room.name]: filtered }))
    }
  }

  // Fetch all property inventory (property-wide, not room-specific)
  const fetchPropertyInventory = async () => {
    if (isNew) return
    try {
      const [linensRes, suppliesRes] = await Promise.all([
        fetch(`/api/linens/property/${id}`),
        fetch(`/api/supplies/property/${id}`),
      ])

      const inventoryItems: InventoryItem[] = []
      const fullCatalog: CatalogItem[] = []
      const quantities: Record<string, number> = {}

      // Create a map of configured items for quick lookup
      const configuredItems: Record<string, number> = {}

      if (linensRes.ok) {
        const data = await linensRes.json()
        // Get configured items (those with perFlip set for this property)
        const configuredLinens = data.linens || []
        configuredLinens.forEach((item: { itemId: string; itemName: string; itemCode: string; category: string; perFlip: number; onHand?: number; room: string }) => {
          inventoryItems.push({
            ...item,
            type: 'linen',
          })
          configuredItems[`linen-${item.itemId}`] = item.perFlip
        })

        // Build full catalog from allItems
        if (data.allItems) {
          setAvailableLinens(data.allItems)
          data.allItems.forEach((item: { itemId: string; itemName: string; itemCode: string; category: string; defaultCost: number }) => {
            const key = `linen-${item.itemId}`
            const perFlip = configuredItems[key] || 0
            fullCatalog.push({
              ...item,
              type: 'linen',
              perFlip,
            })
            quantities[key] = perFlip
          })
        }
      }

      if (suppliesRes.ok) {
        const data = await suppliesRes.json()
        const configuredSupplies = data.supplies || []
        configuredSupplies.forEach((item: { itemId: string; itemName: string; itemCode: string; category: string; perFlip: number; room: string }) => {
          inventoryItems.push({
            ...item,
            type: 'supply',
          })
          configuredItems[`supply-${item.itemId}`] = item.perFlip
        })

        // Build full catalog from allItems
        if (data.allItems) {
          setAvailableSupplies(data.allItems)
          data.allItems.forEach((item: { itemId: string; itemName: string; itemCode: string; category: string; defaultCost: number }) => {
            const key = `supply-${item.itemId}`
            const perFlip = configuredItems[key] || 0
            fullCatalog.push({
              ...item,
              type: 'supply',
              perFlip,
            })
            quantities[key] = perFlip
          })
        }
      }

      // Store all items under "Property" key for consistency
      setRoomInventory({ Property: inventoryItems })
      setCatalogItems(fullCatalog)
      setCatalogQuantities(quantities)
      setInventoryDirty(false)
    } catch (error) {
      console.error('Failed to fetch property inventory:', error)
    }
  }

  // Delete inventory item from property
  const handleDeleteInventoryItem = async (item: InventoryItem) => {
    try {
      const apiPath = item.type === 'linen'
        ? `/api/linens/property/${id}?itemId=${item.itemId}&room=${encodeURIComponent(item.room)}`
        : `/api/supplies/property/${id}?itemId=${item.itemId}&room=${encodeURIComponent(item.room)}`

      const res = await fetch(apiPath, { method: 'DELETE' })

      if (res.ok) {
        toast.success('Item removed')
        // Refresh property inventory
        await fetchPropertyInventory()
      } else {
        toast.error('Failed to remove item')
      }
    } catch (error) {
      toast.error('Failed to remove item')
    }
  }

  // Update catalog quantity in form
  const handleCatalogQuantityChange = (key: string, value: number) => {
    setCatalogQuantities(prev => ({
      ...prev,
      [key]: Math.max(0, value),
    }))
    setInventoryDirty(true)
  }

  // Save all inventory changes
  const handleSaveInventory = async () => {
    if (!inventoryDirty || isNew) return

    setIsSavingInventory(true)
    try {
      // Separate linens and supplies
      const linensToSave: { itemId: string; perFlip: number; room: string }[] = []
      const suppliesToSave: { itemId: string; perFlip: number; room: string }[] = []

      // Get items that have quantity > 0 or had a previous quantity (to handle removals)
      for (const item of catalogItems) {
        const key = `${item.type}-${item.itemId}`
        const newQty = catalogQuantities[key] || 0
        const oldQty = item.perFlip || 0

        // Only include if there's a quantity or if it was changed from a previous value
        if (newQty > 0 || oldQty > 0) {
          if (item.type === 'linen') {
            linensToSave.push({
              itemId: item.itemId,
              perFlip: newQty,
              room: 'Property',
            })
          } else {
            suppliesToSave.push({
              itemId: item.itemId,
              perFlip: newQty,
              room: 'Property',
            })
          }
        }
      }

      // Save linens and supplies in parallel
      const promises: Promise<Response>[] = []

      if (linensToSave.length > 0) {
        promises.push(
          fetch(`/api/linens/property/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ linens: linensToSave }),
          })
        )
      }

      if (suppliesToSave.length > 0) {
        promises.push(
          fetch(`/api/supplies/property/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ supplies: suppliesToSave }),
          })
        )
      }

      // Also delete items that were set to 0
      for (const item of catalogItems) {
        const key = `${item.type}-${item.itemId}`
        const newQty = catalogQuantities[key] || 0
        const oldQty = item.perFlip || 0

        if (newQty === 0 && oldQty > 0) {
          const apiPath = item.type === 'linen'
            ? `/api/linens/property/${id}?itemId=${item.itemId}&room=Property`
            : `/api/supplies/property/${id}?itemId=${item.itemId}&room=Property`
          promises.push(fetch(apiPath, { method: 'DELETE' }))
        }
      }

      await Promise.all(promises)

      toast.success('Inventory saved')
      setInventoryDirty(false)
      // Refresh to get updated data
      await fetchPropertyInventory()
    } catch (error) {
      console.error('Failed to save inventory:', error)
      toast.error('Failed to save inventory')
    } finally {
      setIsSavingInventory(false)
    }
  }

  // Add instruction to specific room
  const handleAddRoomInstruction = async (roomName: string) => {
    if (!roomNewInstruction.trim() || isNew) return

    setIsAddingRoomInstruction(true)
    try {
      const res = await fetch(`/api/properties/${id}/instructions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: roomNewInstruction,
          room: roomName,
        }),
      })

      if (res.ok) {
        const added = await res.json()
        // Update local state
        const updatedInstructions = [...instructions, added]
        setInstructions(updatedInstructions)
        rebuildInstructionsByRoom(updatedInstructions)
        setRoomInstructions(prev => ({
          ...prev,
          [roomName]: [...(prev[roomName] || []), added],
        }))
        setRoomNewInstruction('')
        toast.success('Instruction added')
        // Refresh rooms to update counts
        fetchRooms()
      } else {
        toast.error('Failed to add instruction')
      }
    } catch (error) {
      toast.error('Failed to add instruction')
    } finally {
      setIsAddingRoomInstruction(false)
    }
  }

  // Delete instruction from room
  const handleDeleteRoomInstruction = async (instructionId: string, roomName: string) => {
    try {
      const res = await fetch(`/api/properties/${id}/instructions?instructionId=${instructionId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const filtered = instructions.filter(i => i.id !== instructionId)
        setInstructions(filtered)
        rebuildInstructionsByRoom(filtered)
        setRoomInstructions(prev => ({
          ...prev,
          [roomName]: (prev[roomName] || []).filter(i => i.id !== instructionId),
        }))
        toast.success('Instruction removed')
        fetchRooms()
      }
    } catch (error) {
      toast.error('Failed to delete instruction')
    }
  }

  // Add photo to specific room
  const handleAddRoomPhoto = async (roomName: string) => {
    if (!roomNewPhotoUrl || isNew) {
      toast.error('Please upload a photo')
      return
    }

    setIsAddingRoomPhoto(true)
    try {
      const res = await fetch(`/api/properties/${id}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: roomNewPhotoUrl,
          room: roomName,
          caption: roomNewPhotoCaption,
        }),
      })

      if (res.ok) {
        const added = await res.json()
        // Update local state
        const updatedPhotos = [...photos, added]
        setPhotos(updatedPhotos)
        rebuildPhotosByRoom(updatedPhotos)
        setRoomPhotos(prev => ({
          ...prev,
          [roomName]: [...(prev[roomName] || []), added],
        }))
        setRoomNewPhotoUrl('')
        setRoomNewPhotoCaption('')
        toast.success('Photo added')
        fetchRooms()
      } else {
        toast.error('Failed to add photo')
      }
    } catch (error) {
      toast.error('Failed to add photo')
    } finally {
      setIsAddingRoomPhoto(false)
    }
  }

  // Delete photo from room
  const handleDeleteRoomPhoto = async (photoId: string, roomName: string) => {
    try {
      const res = await fetch(`/api/properties/${id}/photos?photoId=${photoId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const filtered = photos.filter(p => p.id !== photoId)
        setPhotos(filtered)
        rebuildPhotosByRoom(filtered)
        setRoomPhotos(prev => ({
          ...prev,
          [roomName]: (prev[roomName] || []).filter(p => p.id !== photoId),
        }))
        toast.success('Photo removed')
        fetchRooms()
      }
    } catch (error) {
      toast.error('Failed to delete photo')
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
        console.error('Property save error:', error)
        toast.error(error.error || error.details || 'Failed to save property')
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

  // Count total property inventory items (items with quantity > 0)
  const totalInventoryCount = Object.values(catalogQuantities).filter(qty => qty > 0).length

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'details', label: 'Details', icon: <Building size={16} /> },
    { id: 'worker', label: 'Team Info', icon: <Key size={16} /> },
    { id: 'rooms', label: `Rooms (${rooms.length})`, icon: <Home size={16} /> },
    { id: 'inventory', label: `Inventory (${totalInventoryCount})`, icon: <Package size={16} /> },
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
              disabled={isNew && (tab.id === 'rooms' || tab.id === 'instructions' || tab.id === 'photos')}
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </div>

        {isNew && (activeTab === 'rooms' || activeTab === 'inventory' || activeTab === 'instructions' || activeTab === 'photos') && (
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

                {/* Calendar Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calendar Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.color || '#3B82F6'}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer border border-gray-300"
                    />
                    <div className="flex gap-2 flex-wrap">
                      {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: c })}
                          className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${formData.color === c ? 'border-gray-900 scale-110' : 'border-gray-300'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    {formData.color && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, color: '' })}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Color used to display this property on the calendar
                  </p>
                </div>
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
                      label="Invoice Frequency"
                      value={formData.billingFrequency}
                      onChange={(e) => setFormData({ ...formData, billingFrequency: e.target.value, billingType: e.target.value })}
                      options={[
                        { value: 'per_job', label: 'Per Job (immediate)' },
                        { value: 'weekly', label: 'Weekly' },
                        { value: 'biweekly', label: 'Bi-Weekly' },
                        { value: 'monthly_1st', label: 'Monthly (1st)' },
                        { value: 'monthly_15th', label: 'Monthly (15th)' },
                        { value: 'monthly_end', label: 'Monthly (End of Month)' },
                      ]}
                    />
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer pb-2">
                        <input
                          type="checkbox"
                          checked={formData.autoSendInvoice}
                          onChange={(e) => setFormData({ ...formData, autoSendInvoice: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Auto-send invoices</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Team Info Tab */}
        {activeTab === 'worker' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key size={18} />
                Information Visible to Team
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-gray-500">
                This information is shown to team members when they view job details or the property reference.
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
                    <h4 className="font-medium text-blue-900 mb-2">What team members see:</h4>
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

        {/* Rooms Tab */}
        {activeTab === 'rooms' && !isNew && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Home size={20} />
                  Room Configuration
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Click a room to expand and add photos, instructions, and more.
                </p>
              </div>
              <Button onClick={() => {
                resetRoomForm()
                setEditingRoom(null)
                setShowRoomModal(true)
              }}>
                <Plus size={16} />
                Add Room
              </Button>
            </div>

            {rooms.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No rooms defined yet. Add rooms to organize instructions, photos, and linen requirements.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => {
                  const isExpanded = expandedRoomId === room.id
                  const currentRoomPhotos = roomPhotos[room.name] || photos.filter(p => p.room === room.name)
                  const currentRoomInstructions = roomInstructions[room.name] || instructions.filter(i => i.room === room.name)

                  return (
                    <Card key={room.id} className={isExpanded ? 'ring-2 ring-blue-500' : ''}>
                      {/* Room Header - Clickable */}
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleRoomExpansion(room)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronUp size={20} className="text-gray-400" />
                            ) : (
                              <ChevronDown size={20} className="text-gray-400" />
                            )}
                            <div>
                              <h4 className="font-medium text-gray-900">{room.name}</h4>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span className="capitalize">{room.type}</span>
                                {room.beds && room.beds.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Bed size={12} />
                                    {room.beds.map(b => `${b.count}x ${b.type}`).join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {/* Quick stats */}
                            <div className="flex gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Camera size={12} />
                                {room._count?.photos || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <ListChecks size={12} />
                                {room._count?.instructions || 0}
                              </span>
                            </div>
                            {/* Edit/Delete buttons */}
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditRoom(room)}
                              >
                                <Edit3 size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteRoom(room.id)}
                              >
                                <Trash2 size={14} className="text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <CardContent className="border-t bg-gray-50 pt-4">
                          <div className="grid grid-cols-2 gap-6">
                            {/* Photos Section */}
                            <div>
                              <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <Camera size={16} />
                                Photos
                              </h5>

                              {/* Existing photos */}
                              {currentRoomPhotos.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                  {currentRoomPhotos.map((photo) => (
                                    <div
                                      key={photo.id}
                                      className="relative group rounded-lg overflow-hidden bg-gray-200"
                                    >
                                      <div className="relative h-16 w-full">
                                        <Image
                                          src={photo.url}
                                          alt={photo.caption || room.name}
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                      {photo.caption && (
                                        <div className="text-xs p-1 truncate bg-white">
                                          {photo.caption}
                                        </div>
                                      )}
                                      <button
                                        onClick={() => handleDeleteRoomPhoto(photo.id, room.name)}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add photo inline */}
                              <div className="bg-white p-3 rounded-lg border border-gray-200">
                                <ImageUpload
                                  value={roomNewPhotoUrl}
                                  onChange={setRoomNewPhotoUrl}
                                  onRemove={() => setRoomNewPhotoUrl('')}
                                  folder={`properties/${id}/reference`}
                                  label="Add photo"
                                  previewSize="sm"
                                />
                                {roomNewPhotoUrl && (
                                  <div className="mt-2 space-y-2">
                                    <Input
                                      placeholder="Caption (optional)"
                                      value={roomNewPhotoCaption}
                                      onChange={(e) => setRoomNewPhotoCaption(e.target.value)}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleAddRoomPhoto(room.name)}
                                      isLoading={isAddingRoomPhoto}
                                    >
                                      <Plus size={14} />
                                      Save Photo
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Instructions Section */}
                            <div>
                              <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <ListChecks size={16} />
                                Instructions
                              </h5>

                              {/* Existing instructions */}
                              {currentRoomInstructions.length > 0 && (
                                <div className="space-y-2 mb-4">
                                  {currentRoomInstructions.map((inst, index) => (
                                    <div
                                      key={inst.id}
                                      className="flex items-start gap-2 p-2 bg-white rounded border border-gray-200 group"
                                    >
                                      <span className="text-gray-400 text-sm">{index + 1}.</span>
                                      <span className="flex-1 text-sm">{inst.instruction}</span>
                                      <button
                                        onClick={() => handleDeleteRoomInstruction(inst.id, room.name)}
                                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Add instruction inline */}
                              <div className="flex gap-2">
                                <Input
                                  className="flex-1"
                                  placeholder="Add an instruction..."
                                  value={roomNewInstruction}
                                  onChange={(e) => setRoomNewInstruction(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && roomNewInstruction.trim()) {
                                      handleAddRoomInstruction(room.name)
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleAddRoomInstruction(room.name)}
                                  isLoading={isAddingRoomInstruction}
                                  disabled={!roomNewInstruction.trim()}
                                >
                                  <Plus size={14} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && !isNew && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package size={18} />
                Property Inventory
              </CardTitle>
              {inventoryDirty && (
                <Button onClick={handleSaveInventory} isLoading={isSavingInventory}>
                  <Save size={16} />
                  Save Changes
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-6">
                Set the quantity needed for each item per cleaning. Items with 0 quantity are not required for this property.
              </p>

              {catalogItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                  <Package size={40} className="mx-auto mb-2 opacity-50" />
                  <p>No catalog items found</p>
                  <p className="text-sm">Add items to the Linens/Supplies catalog first</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Group by type */}
                  {['linen', 'supply'].map(type => {
                    const typeItems = catalogItems.filter(item => item.type === type)
                    if (typeItems.length === 0) return null

                    // Group by category
                    const byCategory = typeItems.reduce((acc, item) => {
                      const cat = item.category || 'Other'
                      if (!acc[cat]) acc[cat] = []
                      acc[cat].push(item)
                      return acc
                    }, {} as Record<string, CatalogItem[]>)

                    // Count items with quantity > 0
                    const configuredCount = typeItems.filter(item => {
                      const key = `${item.type}-${item.itemId}`
                      return (catalogQuantities[key] || 0) > 0
                    }).length

                    return (
                      <div key={type}>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-3">
                          <span className={`text-xs px-2 py-1 rounded ${type === 'linen' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {type === 'linen' ? 'Linens' : 'Supplies'}
                          </span>
                          <span className="text-sm font-normal text-gray-500">
                            {configuredCount} of {typeItems.length} items configured
                          </span>
                        </h3>
                        {Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryItems]) => (
                          <div key={category} className="mb-6">
                            <h4 className="text-sm font-medium text-gray-700 mb-3 pb-2 border-b">
                              {category}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {categoryItems.map((item) => {
                                const key = `${item.type}-${item.itemId}`
                                const quantity = catalogQuantities[key] || 0
                                const hasQuantity = quantity > 0

                                return (
                                  <div
                                    key={key}
                                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                      hasQuantity
                                        ? 'bg-white border-gray-300 shadow-sm'
                                        : 'bg-gray-50 border-gray-200'
                                    }`}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className={`font-medium truncate ${hasQuantity ? 'text-gray-900' : 'text-gray-500'}`}>
                                        {item.itemName}
                                      </p>
                                      {item.itemCode && (
                                        <p className="text-xs text-gray-400 truncate">{item.itemCode}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleCatalogQuantityChange(key, quantity - 1)}
                                        disabled={quantity === 0}
                                        className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="0"
                                        value={quantity}
                                        onChange={(e) => handleCatalogQuantityChange(key, parseInt(e.target.value) || 0)}
                                        className={`w-12 h-8 text-center border rounded font-medium ${
                                          hasQuantity
                                            ? 'border-blue-300 bg-blue-50 text-blue-700'
                                            : 'border-gray-200 bg-white text-gray-400'
                                        }`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleCatalogQuantityChange(key, quantity + 1)}
                                        className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Save button at bottom if dirty */}
              {inventoryDirty && catalogItems.length > 0 && (
                <div className="mt-6 pt-6 border-t flex justify-end">
                  <Button onClick={handleSaveInventory} isLoading={isSavingInventory}>
                    <Save size={16} />
                    Save Inventory Changes
                  </Button>
                </div>
              )}
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
              placeholder="Detailed instructions shown when team member clicks on this photo"
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

      {/* Room Modal */}
      <Modal
        isOpen={showRoomModal}
        onClose={() => {
          setShowRoomModal(false)
          setEditingRoom(null)
          resetRoomForm()
        }}
        title={editingRoom ? 'Edit Room' : 'Add Room'}
      >
        <div className="space-y-4">
          <Input
            label="Room Name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="e.g., Master Bedroom, Kitchen"
          />

          <Select
            label="Room Type"
            value={newRoomType}
            onChange={(e) => setNewRoomType(e.target.value)}
            options={ROOM_TYPES}
          />

          {/* Bed Configuration - only for bedrooms */}
          {newRoomType === 'bedroom' && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  Bed Configuration
                </label>
                <Button size="sm" variant="outline" onClick={addBedToRoom}>
                  <Plus size={14} />
                  Add Bed
                </Button>
              </div>

              {newRoomBeds.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">
                  No beds configured. Add beds to auto-suggest linen requirements.
                </p>
              ) : (
                <div className="space-y-2">
                  {newRoomBeds.map((bed, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={bed.type}
                        onChange={(e) => updateBed(index, 'type', e.target.value)}
                        options={BED_TYPES.map(t => ({ value: t, label: t }))}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={bed.count}
                        onChange={(e) => updateBed(index, 'count', parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeBed(index)}
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowRoomModal(false)
                setEditingRoom(null)
                resetRoomForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingRoom ? handleUpdateRoom : handleAddRoom}
              isLoading={isSavingRoom}
              disabled={!newRoomName.trim()}
            >
              {editingRoom ? 'Update Room' : 'Add Room'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
