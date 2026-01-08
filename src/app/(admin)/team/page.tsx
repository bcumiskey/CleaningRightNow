'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, Phone, Mail, User, Key, Check, DollarSign, Trash2, Pencil } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import toast from 'react-hot-toast'

interface TeamMember {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string
  isActive: boolean
  hasPassword?: boolean
}

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [passwordMember, setPasswordMember] = useState<TeamMember | null>(null)

  useEffect(() => {
    fetchTeamMembers()
  }, [])

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team')
      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data)
      }
    } catch (error) {
      console.error('Failed to fetch team:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingMember(null)
    setShowModal(true)
  }

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member)
    setShowModal(true)
  }

  const handleSetPassword = (member: TeamMember, e: React.MouseEvent) => {
    e.stopPropagation()
    setPasswordMember(member)
    setShowPasswordModal(true)
  }

  const handleSave = async (data: Partial<TeamMember>) => {
    try {
      const url = editingMember ? `/api/team/${editingMember.id}` : '/api/team'
      const method = editingMember ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success(editingMember ? 'Team member updated' : 'Team member added')
        setShowModal(false)
        fetchTeamMembers()
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to save team member')
      }
    } catch (error) {
      toast.error('Failed to save team member')
    }
  }

  const handleSavePassword = async (password: string) => {
    if (!passwordMember) return

    try {
      const response = await fetch(`/api/team/${passwordMember.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        toast.success(`Password set for ${passwordMember.name}`)
        setShowPasswordModal(false)
        setPasswordMember(null)
        fetchTeamMembers()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to set password')
      }
    } catch (error) {
      toast.error('Failed to set password')
    }
  }

  const handleDelete = async (member: TeamMember, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Remove ${member.name} from the team?`)) return

    try {
      const response = await fetch(`/api/team/${member.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success(`${member.name} removed from team`)
        fetchTeamMembers()
      } else {
        toast.error('Failed to remove team member')
      }
    } catch (error) {
      toast.error('Failed to remove team member')
    }
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="Team" />

      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {teamMembers.length} Team Member{teamMembers.length !== 1 && 's'}
          </h3>
          <Button onClick={handleAdd}>
            <Plus size={16} />
            Add Team Member
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : teamMembers.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Users}
                title="No team members yet"
                description="Add your team members to start assigning jobs."
                actionLabel="Add Team Member"
                onAction={handleAdd}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {teamMembers.map((member) => (
              <Card
                key={member.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleEdit(member)}
              >
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="text-blue-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{member.name}</h4>
                        <Badge variant={member.role === 'admin' ? 'purple' : 'info'}>
                          {member.role}
                        </Badge>
                      </div>
                      {member.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                          <Phone size={14} />
                          {member.phone}
                        </div>
                      )}
                      {member.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <Mail size={14} />
                          {member.email}
                        </div>
                      )}

                      {/* Login Status */}
                      {member.email && (
                        <div className="mt-3 pt-3 border-t">
                          {member.hasPassword ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-green-600">
                                <Check size={14} />
                                <span>Login enabled</span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => handleSetPassword(member, e)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <Key size={14} />
                                Reset
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleSetPassword(member, e)}
                            >
                              <Key size={14} />
                              Set Password
                            </Button>
                          )}
                        </div>
                      )}
                      {!member.email && (
                        <p className="mt-3 pt-3 border-t text-xs text-gray-400">
                          Add email to enable login
                        </p>
                      )}

                      {/* View Pay Button for Workers */}
                      {member.role === 'worker' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 w-full justify-start text-gray-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = `/team/${member.id}/pay`
                          }}
                        >
                          <DollarSign size={14} />
                          View Pay History
                        </Button>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-3 pt-3 border-t flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(member)
                          }}
                        >
                          <Pencil size={14} />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={(e) => handleDelete(member, e)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TeamMemberModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        member={editingMember}
      />

      <SetPasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          setPasswordMember(null)
        }}
        onSave={handleSavePassword}
        memberName={passwordMember?.name || ''}
      />
    </div>
  )
}

interface TeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<TeamMember>) => void
  member: TeamMember | null
}

function TeamMemberModal({ isOpen, onClose, onSave, member }: TeamMemberModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'worker',
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        email: member.email || '',
        phone: member.phone || '',
        role: member.role,
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'worker',
      })
    }
  }, [member, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    await onSave(formData)
    setIsSaving(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={member ? 'Edit Team Member' : 'Add Team Member'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Jane Doe"
          required
        />

        <Input
          label="Phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="(555) 123-4567"
        />

        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="jane@example.com"
        />

        <Select
          label="Role"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          options={[
            { value: 'worker', label: 'Worker' },
            { value: 'admin', label: 'Admin' },
          ]}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {member ? 'Save Changes' : 'Add Team Member'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

interface SetPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (password: string) => void
  memberName: string
}

function SetPasswordModal({ isOpen, onClose, onSave, memberName }: SetPasswordModalProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setPassword('')
      setConfirmPassword('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsSaving(true)
    await onSave(password)
    setIsSaving(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Set Password for ${memberName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Set a password to allow this worker to log in to the worker portal.
        </p>

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
        />

        <Input
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          required
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            <Key size={16} />
            Set Password
          </Button>
        </div>
      </form>
    </Modal>
  )
}
