'use client'

import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'

interface LinenCategory {
  id: string
  name: string
  items: LinenItem[]
}

interface LinenItem {
  id: string
  name: string
  code: string
  unitCost: number
}

export default function LinensPage() {
  const [categories, setCategories] = useState<LinenCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchLinens()
  }, [])

  const fetchLinens = async () => {
    try {
      const response = await fetch('/api/linens')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Failed to fetch linens:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="Linen Inventory" />

      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : categories.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Package}
                title="No linen items"
                description="Add properties to start tracking linen inventory."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <p className="text-gray-600">
              Manage your linen inventory and track stocking requirements per property.
            </p>

            {categories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                          Item
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                          Code
                        </th>
                        <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                          Unit Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {category.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium">{item.name}</td>
                          <td className="px-6 py-3 text-gray-500 font-mono text-sm">
                            {item.code}
                          </td>
                          <td className="px-6 py-3 text-right">
                            ${item.unitCost.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
