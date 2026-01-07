'use client'

import { useState } from 'react'
import { Settings, Building, DollarSign, Calendar, Save } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [businessSettings, setBusinessSettings] = useState({
    businessName: 'Cleaning Right Now',
    businessEmail: '',
    businessPhone: '',
    businessAddress: '',
    expensePercentage: '12',
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Save settings API call would go here
      toast.success('Settings saved')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title="Settings" />

      <div className="p-6 max-w-4xl space-y-6">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building size={20} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Business Information</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Business Name"
              value={businessSettings.businessName}
              onChange={(e) =>
                setBusinessSettings({ ...businessSettings, businessName: e.target.value })
              }
              placeholder="Your Business Name"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Business Email"
                type="email"
                value={businessSettings.businessEmail}
                onChange={(e) =>
                  setBusinessSettings({ ...businessSettings, businessEmail: e.target.value })
                }
                placeholder="business@example.com"
              />
              <Input
                label="Business Phone"
                value={businessSettings.businessPhone}
                onChange={(e) =>
                  setBusinessSettings({ ...businessSettings, businessPhone: e.target.value })
                }
                placeholder="(555) 123-4567"
              />
            </div>
            <Input
              label="Business Address"
              value={businessSettings.businessAddress}
              onChange={(e) =>
                setBusinessSettings({ ...businessSettings, businessAddress: e.target.value })
              }
              placeholder="123 Main St, City, State 12345"
            />
          </CardContent>
        </Card>

        {/* Financial Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign size={20} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Financial Settings</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-xs">
              <Input
                label="Default Expense Percentage"
                type="number"
                min="0"
                max="100"
                value={businessSettings.expensePercentage}
                onChange={(e) =>
                  setBusinessSettings({ ...businessSettings, expensePercentage: e.target.value })
                }
                placeholder="12"
              />
              <p className="text-sm text-gray-500 mt-1">
                This percentage is deducted from job rates for business expenses before calculating
                team payments.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Calendar Integration</h3>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Calendar integrations are configured per-property. Edit a property to add a Turno or
              Google Calendar iCal URL.
            </p>
            <Button variant="outline" onClick={() => (window.location.href = '/properties')}>
              Manage Properties
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} isLoading={isSaving}>
            <Save size={16} />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
