'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal, { ModalFooter } from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Edit,
  Trash2,
  Loader2,
  DollarSign,
  History,
  Wallet,
  Shield,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface TeamMember {
  id: string
  name: string
  phone?: string
  email?: string
  role: 'admin' | 'worker'
  active: boolean
  balance: number
  _count: {
    assignments: number
    payments: number
  }
}

interface Payment {
  id: string
  amount: number
  method?: string
  note?: string
  paidAt: string
}

interface TeamMemberFormData {
  name: string
  phone: string
  email: string
  role: 'admin' | 'worker'
  active: boolean
}

export default function TeamPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<TeamMemberFormData>({
    name: '',
    phone: '',
    email: '',
    role: 'worker',
    active: true,
  })
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [payNote, setPayNote] = useState('')

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTeamMembers()
    }
  }, [status])

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team')
      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data)
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error)
      toast.error('Failed to load team members')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPaymentHistory = async (memberId: string) => {
    try {
      const response = await fetch(`/api/team/${memberId}/payments`)
      if (response.ok) {
        const data = await response.json()
        setPaymentHistory(data)
      }
    } catch (error) {
      console.error('Failed to fetch payment history:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const payload = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        role: formData.role,
        active: formData.active,
      }

      const url = editingMember
        ? `/api/team/${editingMember.id}`
        : '/api/team'
      const method = editingMember ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success(editingMember ? 'Team member updated' : 'Team member added')
        setIsModalOpen(false)
        resetForm()
        fetchTeamMembers()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save team member')
      }
    } catch (error) {
      console.error('Failed to save team member:', error)
      toast.error('Failed to save team member')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePay = async () => {
    if (!selectedMember || !payAmount) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/team/${selectedMember.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(payAmount),
          method: payMethod,
          note: payNote || null,
        }),
      })

      if (response.ok) {
        toast.success(`Paid ${formatCurrency(parseFloat(payAmount))} to ${selectedMember.name}`)
        setIsPayModalOpen(false)
        setPayAmount('')
        setPayMethod('cash')
        setPayNote('')
        fetchTeamMembers()
      } else {
        toast.error('Failed to record payment')
      }
    } catch (error) {
      console.error('Failed to pay team member:', error)
      toast.error('Failed to record payment')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (member: TeamMember) => {
    if (!confirm(`Are you sure you want to delete "${member.name}"?`)) return

    try {
      const response = await fetch(`/api/team/${member.id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Team member deleted')
        fetchTeamMembers()
      } else {
        toast.error('Failed to delete team member')
      }
    } catch (error) {
      console.error('Failed to delete team member:', error)
      toast.error('Failed to delete team member')
    }
  }

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member)
    setFormData({
      name: member.name,
      phone: member.phone || '',
      email: member.email || '',
      role: member.role,
      active: member.active,
    })
    setIsModalOpen(true)
  }

  const openPayModal = (member: TeamMember) => {
    setSelectedMember(member)
    setPayAmount(member.balance > 0 ? member.balance.toString() : '')
    setIsPayModalOpen(true)
  }

  const openHistoryModal = (member: TeamMember) => {
    setSelectedMember(member)
    fetchPaymentHistory(member.id)
    setIsHistoryModalOpen(true)
  }

  const resetForm = () => {
    setEditingMember(null)
    setFormData({
      name: '',
      phone: '',
      email: '',
      role: 'worker',
      active: true,
    })
  }

  const filteredMembers = teamMembers.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && m.active) ||
      (statusFilter === 'inactive' && !m.active)
    return matchesSearch && matchesStatus
  })

  const totalOwed = teamMembers.reduce((sum, m) => sum + m.balance, 0)
  const activeCount = teamMembers.filter((m) => m.active).length

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

  return (
    <DashboardLayout>
      <Header title="Team" />

      <div className="page-container">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Members</p>
                  <p className="text-xl font-bold">{teamMembers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-xl font-bold">{activeCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Owed</p>
                  <p className="text-xl font-bold text-yellow-600">{formatCurrency(totalOwed)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-32"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="w-4 h-4" />
            Add Team Member
          </Button>
        </div>

        {/* Team List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredMembers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead align="center">Role</TableHead>
                      <TableHead align="center">Jobs</TableHead>
                      <TableHead align="right">Balance</TableHead>
                      <TableHead align="center">Status</TableHead>
                      <TableHead align="right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-indigo-600 font-medium">
                                {member.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">{member.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {member.phone && (
                              <div className="flex items-center gap-1 text-gray-500">
                                <Phone className="w-3 h-3" /> {member.phone}
                              </div>
                            )}
                            {member.email && (
                              <div className="flex items-center gap-1 text-gray-500">
                                <Mail className="w-3 h-3" /> {member.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell align="center">
                          <Badge variant={member.role === 'admin' ? 'info' : 'default'}>
                            {member.role === 'admin' && <Shield className="w-3 h-3" />}
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell align="center">
                          <Badge variant="info">{member._count.assignments}</Badge>
                        </TableCell>
                        <TableCell align="right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={member.balance > 0 ? 'font-medium text-yellow-600' : 'text-gray-500'}>
                              {formatCurrency(member.balance)}
                            </span>
                            {member.balance > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPayModal(member)}
                              >
                                <DollarSign className="w-3 h-3" />
                                Pay
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell align="center">
                          <Badge variant={member.active ? 'success' : 'default'}>
                            {member.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell align="right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openHistoryModal(member)}>
                              <History className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(member)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(member)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No team members yet"
                description="Add your first team member to start assigning jobs."
                action={{
                  label: 'Add Team Member',
                  onClick: () => setIsModalOpen(true),
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team Member Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingMember ? 'Edit Team Member' : 'Add Team Member'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Name *"
              placeholder="Full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'worker' })}
              >
                <option value="worker">Worker</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <label htmlFor="active" className="text-sm text-gray-700">Active team member</label>
            </div>
          </div>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingMember ? 'Update' : 'Add'} Team Member
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Pay Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={`Pay ${selectedMember?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Current Balance</p>
            <p className="text-2xl font-bold text-yellow-600">
              {formatCurrency(selectedMember?.balance || 0)}
            </p>
          </div>

          <Input
            label="Payment Amount *"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <Select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="venmo">Venmo</option>
              <option value="zelle">Zelle</option>
              <option value="check">Check</option>
              <option value="other">Other</option>
            </Select>
          </div>

          <Input
            label="Note (optional)"
            placeholder="Payment note..."
            value={payNote}
            onChange={(e) => setPayNote(e.target.value)}
          />
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setIsPayModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handlePay} isLoading={isSaving}>
            Record Payment
          </Button>
        </ModalFooter>
      </Modal>

      {/* Payment History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Payment History - ${selectedMember?.name}`}
        size="md"
      >
        <div className="max-h-96 overflow-y-auto">
          {paymentHistory.length > 0 ? (
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-green-600">{formatCurrency(payment.amount)}</p>
                    <p className="text-sm text-gray-500">
                      {payment.method || 'Cash'} - {formatDate(payment.paidAt)}
                    </p>
                    {payment.note && (
                      <p className="text-sm text-gray-400">{payment.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No payment history</p>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </DashboardLayout>
  )
}
