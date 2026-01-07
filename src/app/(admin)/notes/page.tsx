'use client'

import { useEffect, useState } from 'react'
import { StickyNote, Plus, AlertCircle, Bell, User, Info, CheckCircle } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'

interface PropertyNote {
  id: string
  type: string
  content: string
  status: string
  createdAt: string
  property: { name: string }
  addedBy: { name: string }
}

const noteConfig: Record<string, { bg: string; border: string; text: string; icon: typeof AlertCircle; label: string }> = {
  issue: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: AlertCircle, label: 'Issue' },
  reminder: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Bell, label: 'Reminder' },
  owner_request: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: User, label: 'Owner Request' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: Info, label: 'Info' },
}

export default function NotesPage() {
  const [notes, setNotes] = useState<PropertyNote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    try {
      const response = await fetch('/api/notes')
      if (response.ok) {
        setNotes(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResolve = async (noteId: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      })
      if (response.ok) {
        fetchNotes()
      }
    } catch (error) {
      console.error('Failed to resolve note:', error)
    }
  }

  const activeNotes = notes.filter((n) => n.status === 'active')
  const resolvedNotes = notes.filter((n) => n.status === 'resolved')

  return (
    <div className="min-h-screen">
      <AdminHeader title="Notes" />

      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : notes.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={StickyNote}
                title="No notes yet"
                description="Notes will appear here when added to properties."
              />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Active Notes */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">
                  Active Notes ({activeNotes.length})
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeNotes.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No active notes</p>
                ) : (
                  activeNotes.map((note) => {
                    const config = noteConfig[note.type] || noteConfig.info
                    const Icon = config.icon
                    return (
                      <div
                        key={note.id}
                        className={cn('p-4 rounded-xl border', config.bg, config.border)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', config.bg)}>
                            <Icon size={20} className={config.text} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{note.property.name}</span>
                              <span className={cn('px-2 py-0.5 rounded text-xs font-medium', config.bg, config.text)}>
                                {config.label}
                              </span>
                            </div>
                            <p className={config.text}>{note.content}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Added by {note.addedBy.name} • {new Date(note.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleResolve(note.id)}
                            className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg flex items-center gap-1"
                          >
                            <CheckCircle size={14} />
                            Resolve
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {/* Resolved Notes */}
            {resolvedNotes.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 className="font-semibold text-gray-500">
                    Resolved ({resolvedNotes.length})
                  </h3>
                </CardHeader>
                <CardContent className="space-y-2">
                  {resolvedNotes.map((note) => (
                    <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-600">{note.property.name}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500 line-through">{note.content}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
