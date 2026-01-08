'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Pencil,
  X,
  Save,
} from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

interface CalendarSource {
  id: string
  name: string
  type: string
  icalUrl: string
  isActive: boolean
  lastSyncAt?: string
  lastSyncStatus?: string
  lastSyncError?: string
  lastSyncCount?: number
}

interface SyncResult {
  sourceId: string
  sourceName: string
  status: 'success' | 'error'
  eventsFound: number
  jobsCreated: number
  jobsSkipped: number
  unmatchedEvents: string[]
  error?: string
}

const SOURCE_TYPES = [
  { value: 'turno', label: 'Turno' },
  { value: 'google', label: 'Google Calendar' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'vrbo', label: 'VRBO' },
  { value: 'other', label: 'Other' },
]

export default function CalendarSettingsPage() {
  const [sources, setSources] = useState<CalendarSource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null)

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSource, setEditingSource] = useState<CalendarSource | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'turno',
    icalUrl: '',
    isActive: true,
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchSources()
  }, [])

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/calendar-sources')
      if (res.ok) {
        setSources(await res.json())
      }
    } catch (error) {
      console.error('Failed to fetch sources:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSource = async () => {
    if (!formData.name || !formData.icalUrl) {
      toast.error('Name and iCal URL are required')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/calendar-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast.success('Calendar source added')
        setShowAddModal(false)
        setFormData({ name: '', type: 'turno', icalUrl: '', isActive: true })
        fetchSources()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to add source')
      }
    } catch (error) {
      toast.error('Failed to add source')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateSource = async () => {
    if (!editingSource) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/calendar-sources/${editingSource.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast.success('Calendar source updated')
        setEditingSource(null)
        fetchSources()
      } else {
        toast.error('Failed to update source')
      }
    } catch (error) {
      toast.error('Failed to update source')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Delete this calendar source?')) return

    try {
      const res = await fetch(`/api/calendar-sources/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Calendar source deleted')
        fetchSources()
      } else {
        toast.error('Failed to delete source')
      }
    } catch (error) {
      toast.error('Failed to delete source')
    }
  }

  const handleSyncAll = async () => {
    setIsSyncing(true)
    setSyncResults(null)

    try {
      const res = await fetch('/api/calendar-sources/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (res.ok) {
        const data = await res.json()
        setSyncResults(data.results)
        toast.success(`Sync complete: ${data.summary.jobsCreated} jobs created`)
        fetchSources() // Refresh to get updated sync times
      } else {
        toast.error('Sync failed')
      }
    } catch (error) {
      toast.error('Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSyncOne = async (sourceId: string) => {
    setIsSyncing(true)

    try {
      const res = await fetch('/api/calendar-sources/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      })

      if (res.ok) {
        const data = await res.json()
        const result = data.results[0]
        if (result.status === 'success') {
          toast.success(`Synced: ${result.jobsCreated} jobs created, ${result.jobsSkipped} skipped`)
        } else {
          toast.error(`Sync failed: ${result.error}`)
        }
        fetchSources()
      } else {
        toast.error('Sync failed')
      }
    } catch (error) {
      toast.error('Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  const openEditModal = (source: CalendarSource) => {
    setEditingSource(source)
    setFormData({
      name: source.name,
      type: source.type,
      icalUrl: source.icalUrl,
      isActive: source.isActive,
    })
  }

  const getTypeLabel = (type: string) => {
    return SOURCE_TYPES.find(t => t.value === type)?.label || type
  }

  const getStatusBadge = (source: CalendarSource) => {
    if (!source.lastSyncAt) {
      return <Badge variant="default">Never synced</Badge>
    }
    if (source.lastSyncStatus === 'error') {
      return <Badge variant="danger">Error</Badge>
    }
    return <Badge variant="success">OK</Badge>
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="Calendar Integration" />

      <div className="p-6 space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Calendar Sources</h2>
            <p className="text-sm text-gray-500">
              Connect your Turno account and Google Calendars to automatically import jobs.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSyncAll}
              isLoading={isSyncing}
              disabled={sources.filter(s => s.isActive).length === 0}
            >
              <RefreshCw size={16} />
              Sync All
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus size={16} />
              Add Source
            </Button>
          </div>
        </div>

        {/* Sources List */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : sources.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Calendar}
                title="No calendar sources"
                description="Add your Turno or Google Calendar iCal feeds to start importing jobs automatically."
                actionLabel="Add Calendar Source"
                onAction={() => setShowAddModal(true)}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sources.map((source) => (
              <Card key={source.id} className={!source.isActive ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          source.type === 'turno'
                            ? 'bg-purple-100'
                            : source.type === 'google'
                            ? 'bg-blue-100'
                            : 'bg-gray-100'
                        }`}
                      >
                        <Calendar
                          size={24}
                          className={
                            source.type === 'turno'
                              ? 'text-purple-600'
                              : source.type === 'google'
                              ? 'text-blue-600'
                              : 'text-gray-600'
                          }
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{source.name}</h3>
                          <Badge variant="default">{getTypeLabel(source.type)}</Badge>
                          {!source.isActive && <Badge variant="warning">Disabled</Badge>}
                        </div>
                        <p className="text-sm text-gray-500 font-mono truncate max-w-md">
                          {source.icalUrl}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          {source.lastSyncAt && (
                            <span>
                              Last sync: {formatDistanceToNow(new Date(source.lastSyncAt), { addSuffix: true })}
                            </span>
                          )}
                          {source.lastSyncCount !== null && source.lastSyncCount !== undefined && (
                            <span>{source.lastSyncCount} events</span>
                          )}
                          {getStatusBadge(source)}
                        </div>
                        {source.lastSyncError && (
                          <p className="text-xs text-red-600 mt-1">{source.lastSyncError}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSyncOne(source.id)}
                        disabled={isSyncing || !source.isActive}
                      >
                        <RefreshCw size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(source)}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSource(source.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Sync Results */}
        {syncResults && syncResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle size={20} className="text-green-600" />
                Sync Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncResults.map((result) => (
                  <div
                    key={result.sourceId}
                    className={`p-4 rounded-lg ${
                      result.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {result.status === 'success' ? (
                        <CheckCircle size={16} className="text-green-600" />
                      ) : (
                        <XCircle size={16} className="text-red-600" />
                      )}
                      <span className="font-medium">{result.sourceName}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Events Found:</span>{' '}
                        <span className="font-medium">{result.eventsFound}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Jobs Created:</span>{' '}
                        <span className="font-medium text-green-600">{result.jobsCreated}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Skipped:</span>{' '}
                        <span className="font-medium">{result.jobsSkipped}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Unmatched:</span>{' '}
                        <span className="font-medium text-amber-600">{result.unmatchedEvents.length}</span>
                      </div>
                    </div>
                    {result.unmatchedEvents.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-1">
                          Unmatched events (no property found):
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {result.unmatchedEvents.slice(0, 5).map((event, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded"
                            >
                              {event}
                            </span>
                          ))}
                          {result.unmatchedEvents.length > 5 && (
                            <span className="px-2 py-0.5 text-gray-500 text-xs">
                              +{result.unmatchedEvents.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {result.error && (
                      <p className="text-sm text-red-600 mt-2">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle size={20} className="text-blue-500" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">1. Add Calendar Sources</h4>
              <p>
                Add your Turno iCal feed URL and any Google Calendar iCal URLs. Each source can
                contain events for multiple properties.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">2. Property Name Matching</h4>
              <p>
                The system matches events to properties by looking for property names in the event
                title/summary. Make sure your property names in this app match how they appear in
                your calendars.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">3. Checkout = Cleaning Day</h4>
              <p>
                Jobs are created for the checkout (end) date of each reservation. Check-in and
                blocked dates are ignored for cleaning purposes.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">4. Sync Regularly</h4>
              <p>
                Click &quot;Sync All&quot; to pull the latest reservations. Duplicate events (same UID) are
                automatically skipped.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || !!editingSource}
        onClose={() => {
          setShowAddModal(false)
          setEditingSource(null)
          setFormData({ name: '', type: 'turno', icalUrl: '', isActive: true })
        }}
        title={editingSource ? 'Edit Calendar Source' : 'Add Calendar Source'}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Turno Master Calendar"
            required
          />

          <Select
            label="Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={SOURCE_TYPES}
          />

          <Input
            label="iCal URL"
            value={formData.icalUrl}
            onChange={(e) => setFormData({ ...formData, icalUrl: e.target.value })}
            placeholder="https://..."
            required
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Active</span>
          </label>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false)
                setEditingSource(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingSource ? handleUpdateSource : handleAddSource}
              isLoading={isSaving}
            >
              {editingSource ? 'Save Changes' : 'Add Source'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
