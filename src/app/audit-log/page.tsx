'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { formatDateTime } from '@/lib/utils'
import {
  History,
  Search,
  Loader2,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string
  description?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  createdAt: string
  user?: {
    name?: string
    email: string
  }
}

const ACTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
]

const ENTITY_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'Property', label: 'Property' },
  { value: 'Job', label: 'Job' },
  { value: 'TeamMember', label: 'Team Member' },
  { value: 'Supply', label: 'Supply' },
  { value: 'Linen', label: 'Linen' },
  { value: 'LaundryRecord', label: 'Laundry' },
  { value: 'Invoice', label: 'Invoice' },
]

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/audit-log')
      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Plus className="w-4 h-4 text-green-600" />
      case 'UPDATE':
        return <Edit className="w-4 h-4 text-blue-600" />
      case 'DELETE':
        return <Trash2 className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'success' | 'info' | 'danger' | 'default'> = {
      CREATE: 'success',
      UPDATE: 'info',
      DELETE: 'danger',
    }
    return <Badge variant={variants[action] || 'default'}>{action}</Badge>
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.description?.toLowerCase().includes(search.toLowerCase()) ||
      log.entityType.toLowerCase().includes(search.toLowerCase())
    const matchesAction = actionFilter === 'all' || log.action === actionFilter
    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter
    return matchesSearch && matchesAction && matchesEntity
  })

  return (
    <DashboardLayout>
      <Header title="Audit Log" />

      <div className="page-container">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            options={ACTIONS}
            className="w-full sm:w-40"
          />
          <Select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            options={ENTITY_TYPES}
            className="w-full sm:w-40"
          />
        </div>

        {/* Logs List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredLogs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead align="right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          {getActionBadge(log.action)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{log.entityType}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-900">
                          {log.description || `${log.action} ${log.entityType}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {log.user?.name || log.user?.email || 'System'}
                        </span>
                      </TableCell>
                      <TableCell align="right">
                        <span className="text-sm text-gray-500">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icon={History}
                title="No audit logs yet"
                description="Activity will be logged as you use the system."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
