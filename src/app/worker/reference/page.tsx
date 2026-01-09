'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building, ChevronRight, AlertCircle, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface PropertyRef {
  id: string
  name: string
  address: string
  _activeNotes: number
}

export default function WorkerReferencePage() {
  const [properties, setProperties] = useState<PropertyRef[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/worker/properties')
      if (response.ok) {
        setProperties(await response.json())
      } else {
        toast.error('Failed to load properties')
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error)
      toast.error('Failed to load properties')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProperties = properties.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search properties..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : filteredProperties.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Building}
              title="No properties found"
              description={search ? 'Try a different search term.' : 'No properties available.'}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProperties.map((property) => (
            <Link key={property.id} href={`/worker/reference/${property.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center gap-4">
                  <div
                    className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center',
                      property._activeNotes > 0 ? 'bg-red-100' : 'bg-emerald-100'
                    )}
                  >
                    <Building
                      className={property._activeNotes > 0 ? 'text-red-600' : 'text-emerald-600'}
                      size={24}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg text-gray-900">{property.name}</div>
                    <div className="text-sm text-gray-500">{property.address}</div>
                    {property._activeNotes > 0 && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                        <AlertCircle size={12} />
                        {property._activeNotes} active note{property._activeNotes !== 1 && 's'}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="text-gray-400" size={24} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
