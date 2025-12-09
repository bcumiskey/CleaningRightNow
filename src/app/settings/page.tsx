'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Settings, Save, Loader2, Key, Building, Percent, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface UserSettings {
  businessName: string
  businessPhone: string
  businessEmail: string
  businessAddress: string
  expensePercentage: string
}

interface Service {
  id: string
  name: string
  basePrice: number
  active: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    businessName: '',
    businessPhone: '',
    businessEmail: '',
    businessAddress: '',
    expensePercentage: '12',
  })
  const [services, setServices] = useState<Service[]>([])
  const [newService, setNewService] = useState({ name: '', basePrice: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    fetchSettings()
    fetchServices()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings({
          businessName: data.businessName || '',
          businessPhone: data.businessPhone || '',
          businessEmail: data.businessEmail || '',
          businessAddress: data.businessAddress || '',
          expensePercentage: data.expensePercentage?.toString() || '12',
        })
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services')
      if (response.ok) {
        const data = await response.json()
        setServices(data)
      }
    } catch (error) {
      console.error('Failed to fetch services:', error)
    }
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: settings.businessName || null,
          businessPhone: settings.businessPhone || null,
          businessEmail: settings.businessEmail || null,
          businessAddress: settings.businessAddress || null,
          expensePercentage: parseFloat(settings.expensePercentage) || 12,
        }),
      })

      if (response.ok) {
        toast.success('Settings saved')
      } else {
        toast.error('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (response.ok) {
        toast.success('Password changed')
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to change password')
      }
    } catch (error) {
      console.error('Failed to change password:', error)
      toast.error('Failed to change password')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddService = async () => {
    if (!newService.name || !newService.basePrice) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newService.name,
          basePrice: parseFloat(newService.basePrice),
        }),
      })

      if (response.ok) {
        toast.success('Service added')
        setNewService({ name: '', basePrice: '' })
        fetchServices()
      } else {
        toast.error('Failed to add service')
      }
    } catch (error) {
      console.error('Failed to add service:', error)
      toast.error('Failed to add service')
    }
  }

  const handleDeleteService = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return

    try {
      const response = await fetch(`/api/services/${id}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Service deleted')
        fetchServices()
      } else {
        toast.error('Failed to delete service')
      }
    } catch (error) {
      console.error('Failed to delete service:', error)
      toast.error('Failed to delete service')
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <Header title="Settings" />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Header title="Settings" />

      <div className="page-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <CardTitle>Business Information</CardTitle>
              </div>
              <CardDescription>
                This information will appear on invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Business Name"
                  placeholder="Cleaning Right Now"
                  value={settings.businessName}
                  onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                />
                <Input
                  label="Business Phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={settings.businessPhone}
                  onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })}
                />
                <Input
                  label="Business Email"
                  type="email"
                  placeholder="contact@cleaningrightnow.com"
                  value={settings.businessEmail}
                  onChange={(e) => setSettings({ ...settings, businessEmail: e.target.value })}
                />
                <Input
                  label="Business Address"
                  placeholder="123 Main St, City, State 12345"
                  value={settings.businessAddress}
                  onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                />
                <Button onClick={handleSaveSettings} isLoading={isSaving}>
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Default Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-indigo-600" />
                <CardTitle>Default Settings</CardTitle>
              </div>
              <CardDescription>
                Default values for new jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Default Expense Percentage"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="12"
                  value={settings.expensePercentage}
                  onChange={(e) => setSettings({ ...settings, expensePercentage: e.target.value })}
                  hint="Percentage of job total for business expenses"
                />
                <Button onClick={handleSaveSettings} isLoading={isSaving}>
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <CardTitle>Services</CardTitle>
              </div>
              <CardDescription>
                Manage the services you offer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Add new service */}
                <div className="flex gap-4">
                  <Input
                    placeholder="Service name"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={newService.basePrice}
                    onChange={(e) => setNewService({ ...newService, basePrice: e.target.value })}
                    className="w-32"
                  />
                  <Button onClick={handleAddService}>
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                </div>

                {/* Services list */}
                <div className="border rounded-lg divide-y">
                  {services.length > 0 ? (
                    services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{service.name}</p>
                          <p className="text-sm text-gray-500">
                            ${service.basePrice.toFixed(2)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteService(service.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-gray-500">
                      No services yet. Add your first service above.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600" />
                <CardTitle>Change Password</CardTitle>
              </div>
              <CardDescription>
                Update your login password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Current Password"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                />
                <Input
                  label="New Password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  hint="Must be at least 8 characters"
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                />
                <Button
                  onClick={handleChangePassword}
                  isLoading={isSaving}
                  disabled={!passwordData.currentPassword || !passwordData.newPassword}
                >
                  <Key className="w-4 h-4" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
