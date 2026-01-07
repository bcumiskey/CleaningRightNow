'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import StatCard from '@/components/ui/StatCard'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  Plus,
  AlertCircle,
  Bell,
  User,
  Info,
  CheckCircle,
  StickyNote,
  Home,
  Loader2,
  Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface PropertyNote {
  id: string
  type: string
  content: string
  status: string
  resolvedAt?: string
  createdAt: string
  property: {
    id: string
    name: string
  }
  addedBy: {
    id: string
    name: string
  }
}

interface Property {
  id: string
  name: string
}

interface TeamMember {
  id: string
  name: string
}

const noteTypeIcons: Record<string, typeof AlertCircle> = {
  issue: AlertCircle,
  reminder: Bell,
  owner_request: User,
  info: Info,
}

const noteTypeColors: Record<string, string> = {
  issue: 'text-red-600 bg-red-100',
  reminder: 'text-amber-600 bg-amber-100',
  owner_request: 'text-purple-600 bg-purple-100',
  info: 'text-blue-600 bg-blue-100',
}

const noteTypeBadgeVariants: Record<string, 'default' | 'success' | 'warning' | 'info' | 'danger'> = {
  issue: 'danger',
  reminder: 'warning',
  owner_request: 'info',
  info: 'default',
}

export default function NotesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [notes, setNotes] = useState<PropertyNote[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Filters
  const [filterStatus, setFilterStatus] = useState('active')
  const [filterProperty, setFilterProperty] = useState('')
  const [filterType, setFilterType] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    propertyId: '',
    type: 'info',
    content: '',
    addedById: '',
  })

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData()
    }
  }, [status])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchNotes()
    }
  }, [filterStatus, filterProperty, filterType, status])

  const fetchData = async () => {
    try {
      const [propertiesRes, teamRes] = await Promise.all([
        fetch('/api/properties'),
        fetch('/api/team'),
      ])

      if (propertiesRes.ok) {
        const propertiesData = await propertiesRes.json()
        setProperties(propertiesData)
      }
      if (teamRes.ok) {
        const teamData = await teamRes.json()
        setTeamMembers(teamData)
        // Set default addedById to first admin or first member
        const admin = teamData.find((m: TeamMember & { role: string }) => m.role === 'admin')
        if (admin) {
          setFormData((prev) => ({ ...prev, addedById: admin.id }))
        } else if (teamData.length > 0) {
          setFormData((prev) => ({ ...prev, addedById: teamData[0].id }))
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
  }

  const fetchNotes = async () => {
    setIsLoading(true)
    try {
      // Fetch all notes from all properties
      const response = await fetch('/api/properties')
      if (response.ok) {
        const propertiesData = await response.json()

        // Collect all notes from all properties
        const allNotes: PropertyNote[] = []
        for (const property of propertiesData) {
          const notesRes = await fetch(
            `/api/properties/${property.id}/notes?status=${filterStatus}&type=${filterType}`
          )
          if (notesRes.ok) {
            const propertyNotes = await notesRes.json()
            allNotes.push(...propertyNotes)
          }
        }

        // Filter by property if selected
        let filteredNotes = allNotes
        if (filterProperty) {
          filteredNotes = filteredNotes.filter((n) => n.property.id === filterProperty)
        }

        // Sort by date descending
        filteredNotes.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

        setNotes(filteredNotes)
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!formData.propertyId || !formData.content || !formData.addedById) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch(`/api/properties/${formData.propertyId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Note added successfully')
        setIsModalOpen(false)
        setFormData({
          propertyId: '',
          type: 'info',
          content: '',
          addedById: formData.addedById,
        })
        fetchNotes()
      } else {
        toast.error('Failed to add note')
      }
    } catch (error) {
      console.error('Error adding note:', error)
      toast.error('Failed to add note')
    }
  }

  const handleResolveNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}/resolve`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Note resolved')
        fetchNotes()
      } else {
        toast.error('Failed to resolve note')
      }
    } catch (error) {
      console.error('Error resolving note:', error)
      toast.error('Failed to resolve note')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!session) {
    router.push('/login')
    return null
  }

  const activeNotes = notes.filter((n) => n.status === 'active')
  const issueNotes = notes.filter((n) => n.type === 'issue' && n.status === 'active')
  const propertiesWithNotes = new Set(activeNotes.map((n) => n.property.id)).size
  const resolvedThisWeek = notes.filter((n) => {
    if (n.status !== 'resolved' || !n.resolvedAt) return false
    const resolvedDate = new Date(n.resolvedAt)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return resolvedDate >= weekAgo
  }).length

  return (
    <DashboardLayout>
      <Header title="Property Notes" />

      <div className="page-container">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Active Notes"
            value={String(activeNotes.length)}
            icon={StickyNote}
            iconColor="text-blue-600 bg-blue-100"
          />
          <StatCard
            title="Open Issues"
            value={String(issueNotes.length)}
            icon={AlertCircle}
            iconColor="text-red-600 bg-red-100"
          />
          <StatCard
            title="Properties with Notes"
            value={String(propertiesWithNotes)}
            icon={Home}
            iconColor="text-purple-600 bg-purple-100"
          />
          <StatCard
            title="Resolved This Week"
            value={String(resolvedThisWeek)}
            icon={CheckCircle}
            iconColor="text-green-600 bg-green-100"
          />
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-32"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="resolved">Resolved</option>
              </Select>
              <Select
                value={filterProperty}
                onChange={(e) => setFilterProperty(e.target.value)}
                className="w-48"
              >
                <option value="">All Properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-40"
              >
                <option value="">All Types</option>
                <option value="issue">Issue</option>
                <option value="reminder">Reminder</option>
                <option value="owner_request">Owner Request</option>
                <option value="info">Info</option>
              </Select>
              <div className="flex-1" />
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Note
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notes Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Notes Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : notes.length > 0 ? (
              <div className="space-y-4">
                {notes.map((note) => {
                  const IconComponent = noteTypeIcons[note.type] || Info
                  return (
                    <div
                      key={note.id}
                      className="flex gap-4 p-4 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${noteTypeColors[note.type]}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-gray-900">{note.property.name}</span>
                          <Badge variant={noteTypeBadgeVariants[note.type]}>
                            {note.type.replace('_', ' ')}
                          </Badge>
                          {note.status === 'resolved' && (
                            <Badge variant="success">Resolved</Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{note.content}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{formatDateTime(note.createdAt)}</span>
                          <span>by {note.addedBy.name}</span>
                        </div>
                      </div>
                      {note.status === 'active' && (
                        <div className="flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolveNote(note.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Resolve
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <StickyNote className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No notes found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Note Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Note"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property *
            </label>
            <Select
              value={formData.propertyId}
              onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
            >
              <option value="">Select property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <Select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="info">Info</option>
              <option value="issue">Issue</option>
              <option value="reminder">Reminder</option>
              <option value="owner_request">Owner Request</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note *
            </label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter note content..."
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNote}>
              Add Note
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
