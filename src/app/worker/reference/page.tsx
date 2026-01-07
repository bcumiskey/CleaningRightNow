'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Home,
  ChevronRight,
  Loader2,
  Search,
  AlertTriangle,
} from 'lucide-react'
import Input from '@/components/ui/Input'

interface Property {
  id: string
  name: string
  address: string
  _activeNotes: number
}

export default function WorkerReferencePage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/worker/properties')
      if (response.ok) {
        const data = await response.json()
        setProperties(data)
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProperties = properties.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.address.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Property Reference</h1>
        <p className="text-gray-500 text-sm">Stocking, photos, and instructions</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search properties..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Properties List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : filteredProperties.length > 0 ? (
        <div className="space-y-2">
          {filteredProperties.map((property) => (
            <Link
              key={property.id}
              href={`/worker/reference/${property.id}`}
              className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-indigo-200 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Home className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {property.name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {property.address}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {property._activeNotes > 0 && (
                  <div className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-medium">{property._activeNotes}</span>
                  </div>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-medium text-gray-900 mb-1">
            {search ? 'No properties found' : 'No properties yet'}
          </h3>
          <p className="text-gray-500 text-sm">
            {search ? 'Try a different search' : 'Properties will appear here'}
          </p>
        </div>
      )}
    </div>
  )
}
