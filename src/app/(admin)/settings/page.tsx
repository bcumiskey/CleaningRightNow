'use client'

import { useState, useEffect } from 'react'
import { Building, DollarSign, Calendar, Save, Image, FileText, ExternalLink } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import toast from 'react-hot-toast'

interface CompanySettings {
  id: string
  companyName: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  logoUrl: string | null
  invoiceFooter: string | null
  invoiceTerms: string | null
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>({
    id: 'default',
    companyName: 'Cleaning Right Now',
    address: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
    invoiceFooter: '',
    invoiceTerms: '',
  })
  const [expensePercentage, setExpensePercentage] = useState('12')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setSettings({
          ...data,
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          logoUrl: data.logoUrl || '',
          invoiceFooter: data.invoiceFooter || '',
          invoiceTerms: data.invoiceTerms || '',
        })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!res.ok) throw new Error('Failed to save')

      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <AdminHeader title="Settings" />
        <div className="p-6 flex justify-center">
          <div className="animate-pulse text-gray-500">Loading settings...</div>
        </div>
      </div>
    )
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
              label="Company Name"
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              placeholder="Your Business Name"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="business@example.com"
              />
              <Input
                label="Phone"
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <Input
              label="Address"
              value={settings.address || ''}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              placeholder="123 Main St, City, State 12345"
            />
            <Input
              label="Website"
              value={settings.website || ''}
              onChange={(e) => setSettings({ ...settings, website: e.target.value })}
              placeholder="www.yourbusiness.com"
            />
          </CardContent>
        </Card>

        {/* Company Logo */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Image size={20} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Company Logo</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Logo URL"
              value={settings.logoUrl || ''}
              onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
              placeholder="https://example.com/your-logo.png"
            />
            <p className="text-sm text-gray-500">
              Enter a URL to your company logo. The logo will appear on invoices and other documents.
              Recommended size: 200x80 pixels, PNG or JPG format.
            </p>
            {settings.logoUrl && (
              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-2">Preview:</p>
                <img
                  src={settings.logoUrl}
                  alt="Company Logo Preview"
                  className="h-16 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Document Settings</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Payment Terms
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                value={settings.invoiceTerms || ''}
                onChange={(e) => setSettings({ ...settings, invoiceTerms: e.target.value })}
                placeholder="Payment is due upon receipt. Please make checks payable to..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Footer Message
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                value={settings.invoiceFooter || ''}
                onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
                placeholder="Thank you for your business!"
              />
            </div>
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
                value={expensePercentage}
                onChange={(e) => setExpensePercentage(e.target.value)}
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
              <ExternalLink size={16} />
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
