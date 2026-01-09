'use client'

import { useEffect, useState } from 'react'
import { QrCode, Plus, RefreshCw, Trash2, Copy, Check, Building, Download } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface CheckInToken {
  id: string
  propertyId: string
  propertyName: string
  token: string
  isActive: boolean
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

interface Property {
  id: string
  name: string
}

export default function CheckInTokensPage() {
  const [tokens, setTokens] = useState<CheckInToken[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchTokens(), fetchProperties()])
      .finally(() => setIsLoading(false))
  }, [])

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/check-in-tokens')
      if (response.ok) {
        setTokens(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch tokens:', error)
    }
  }

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/properties')
      if (response.ok) {
        setProperties(await response.json())
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error)
    }
  }

  const handleCreate = async () => {
    if (!selectedProperty) {
      toast.error('Please select a property')
      return
    }

    try {
      const response = await fetch('/api/check-in-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: selectedProperty }),
      })

      if (response.ok) {
        toast.success('Token created!')
        setShowModal(false)
        setSelectedProperty('')
        fetchTokens()
      } else {
        toast.error('Failed to create token')
      }
    } catch (error) {
      toast.error('Failed to create token')
    }
  }

  const handleRegenerate = async (tokenId: string) => {
    if (!confirm('Regenerate this token? The old token will stop working.')) return

    try {
      const response = await fetch(`/api/check-in-tokens/${tokenId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: true }),
      })

      if (response.ok) {
        toast.success('Token regenerated')
        fetchTokens()
      } else {
        toast.error('Failed to regenerate token')
      }
    } catch (error) {
      toast.error('Failed to regenerate token')
    }
  }

  const handleToggleActive = async (token: CheckInToken) => {
    try {
      const response = await fetch(`/api/check-in-tokens/${token.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !token.isActive }),
      })

      if (response.ok) {
        toast.success(token.isActive ? 'Token deactivated' : 'Token activated')
        fetchTokens()
      } else {
        toast.error('Failed to update token')
      }
    } catch (error) {
      toast.error('Failed to update token')
    }
  }

  const handleDelete = async (tokenId: string) => {
    if (!confirm('Delete this token? This cannot be undone.')) return

    try {
      const response = await fetch(`/api/check-in-tokens/${tokenId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Token deleted')
        fetchTokens()
      } else {
        toast.error('Failed to delete token')
      }
    } catch (error) {
      toast.error('Failed to delete token')
    }
  }

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token)
    setCopiedToken(token)
    toast.success('Token copied!')
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const getCheckInUrl = (token: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/worker/check-in?token=${token}`
  }

  const downloadQRCode = (token: CheckInToken) => {
    // Generate a simple QR code URL using a public API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(getCheckInUrl(token.token))}`

    // Create download link
    const link = document.createElement('a')
    link.href = qrUrl
    link.download = `qr-${token.propertyName.replace(/\s+/g, '-').toLowerCase()}.png`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('QR Code download started')
  }

  // Properties that don't have tokens yet
  const propertiesWithoutTokens = properties.filter(
    p => !tokens.some(t => t.propertyId === p.id)
  )

  return (
    <div className="min-h-screen">
      <AdminHeader title="Check-in Tokens" />

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {tokens.length} Check-in Token{tokens.length !== 1 && 's'}
            </h3>
            <p className="text-sm text-gray-500">
              Generate NFC/QR codes for property check-ins
            </p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Add Token
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : tokens.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={QrCode}
                title="No check-in tokens yet"
                description="Create tokens for properties so workers can check in using NFC or QR codes."
                actionLabel="Create Token"
                onAction={() => setShowModal(true)}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tokens.map((token) => (
              <Card key={token.id} className="overflow-hidden">
                <CardContent>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Building className="text-emerald-600" size={20} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{token.propertyName}</h4>
                        <Badge variant={token.isActive ? 'success' : 'default'}>
                          {token.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Preview */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 flex justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getCheckInUrl(token.token))}`}
                      alt={`QR Code for ${token.propertyName}`}
                      className="w-32 h-32"
                    />
                  </div>

                  {/* Token Details */}
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center justify-between">
                      <span>Token:</span>
                      <div className="flex items-center gap-1">
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                          {token.token.substring(0, 8)}...
                        </code>
                        <button
                          onClick={() => copyToken(token.token)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {copiedToken === token.token ? (
                            <Check size={14} className="text-green-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                    {token.lastUsedAt && (
                      <div className="flex items-center justify-between">
                        <span>Last used:</span>
                        <span>{format(new Date(token.lastUsedAt), 'MMM d, h:mm a')}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span>Created:</span>
                      <span>{format(new Date(token.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => downloadQRCode(token)}
                    >
                      <Download size={14} />
                      Download QR
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRegenerate(token.id)}
                      title="Regenerate token"
                    >
                      <RefreshCw size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(token)}
                      title={token.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {token.isActive ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(token.id)}
                      title="Delete token"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Token Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setSelectedProperty('')
        }}
        title="Create Check-in Token"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Create a check-in token for a property. Workers will scan this token to check in when they arrive.
          </p>

          <Select
            label="Property"
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            options={[
              { value: '', label: 'Select a property...' },
              ...propertiesWithoutTokens.map(p => ({
                value: p.id,
                label: p.name,
              })),
            ]}
          />

          {propertiesWithoutTokens.length === 0 && (
            <p className="text-sm text-amber-600">
              All properties already have check-in tokens.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!selectedProperty}>
              <QrCode size={16} />
              Create Token
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
