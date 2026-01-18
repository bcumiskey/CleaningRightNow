'use client'

import { useState, useEffect } from 'react'
import { Building, DollarSign, Calendar, Save, Image, FileText, ExternalLink, Upload, Mail, CheckCircle, XCircle, Send } from 'lucide-react'
import AdminHeader from '@/components/layout/AdminHeader'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ImageUpload from '@/components/ui/ImageUpload'
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
  linenTargetMultiplier: number
}

interface EmailStatus {
  provider: 'smtp' | 'resend' | 'none'
  configured: boolean
  senderEmail?: string
  envVars: {
    hasSmtpHost: boolean
    hasSmtpUser: boolean
    hasSmtpPass: boolean
    hasResendApiKey: boolean
  }
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
    linenTargetMultiplier: 2,
  })
  const [expensePercentage, setExpensePercentage] = useState('12')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)

  useEffect(() => {
    loadSettings()
    loadEmailStatus()
  }, [])

  const loadEmailStatus = async () => {
    try {
      const res = await fetch('/api/email/status')
      if (res.ok) {
        const data = await res.json()
        setEmailStatus(data)
      }
    } catch (error) {
      console.error('Failed to load email status:', error)
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address')
      return
    }
    setIsSendingTest(true)
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Test email sent successfully!')
      } else {
        toast.error(data.error || 'Failed to send test email')
      }
    } catch (error) {
      toast.error('Failed to send test email')
    } finally {
      setIsSendingTest(false)
    }
  }

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
          linenTargetMultiplier: data.linenTargetMultiplier ?? 2,
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
            <div className="flex items-start gap-6">
              <ImageUpload
                value={settings.logoUrl || undefined}
                onChange={(url) => setSettings({ ...settings, logoUrl: url })}
                onRemove={() => setSettings({ ...settings, logoUrl: '' })}
                folder="logos"
                label="Upload Logo"
                previewSize="md"
              />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-3">
                  Upload your company logo. It will appear on invoices, statements, and other documents.
                </p>
                <p className="text-xs text-gray-500">
                  Recommended: PNG or JPG, at least 200x80 pixels. Max 5MB.
                </p>
                <div className="mt-4">
                  <Input
                    label="Or enter a URL"
                    value={settings.logoUrl || ''}
                    onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                    placeholder="https://example.com/your-logo.png"
                  />
                </div>
              </div>
            </div>
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
            <div className="max-w-xs">
              <Input
                label="Linen Target (Flips)"
                type="number"
                min="1"
                max="10"
                value={settings.linenTargetMultiplier.toString()}
                onChange={(e) => setSettings({ ...settings, linenTargetMultiplier: parseInt(e.target.value) || 2 })}
                placeholder="2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Low inventory alerts trigger when stock falls below this many flips worth of linens.
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

        {/* Email Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail size={20} className="text-gray-400" />
              <h3 className="font-semibold text-gray-900">Email Integration</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {emailStatus ? (
              <>
                <div className="flex items-center gap-3">
                  {emailStatus.configured ? (
                    <CheckCircle size={20} className="text-green-500" />
                  ) : (
                    <XCircle size={20} className="text-red-500" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {emailStatus.configured
                        ? `Connected via ${emailStatus.provider === 'smtp' ? 'SMTP (Microsoft 365)' : 'Resend'}`
                        : 'Email not configured'}
                    </p>
                    {emailStatus.senderEmail && (
                      <p className="text-sm text-gray-500">Sending from: {emailStatus.senderEmail}</p>
                    )}
                  </div>
                </div>

                {!emailStatus.configured && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800 font-medium mb-2">Setup Required</p>
                    <p className="text-sm text-amber-700 mb-3">
                      Add the following environment variables in Vercel to enable email:
                    </p>
                    <div className="space-y-2 text-xs font-mono bg-white rounded p-3 border border-amber-200">
                      <p className="font-semibold text-gray-700">For Microsoft 365 (SMTP):</p>
                      <p className={emailStatus.envVars.hasSmtpHost ? 'text-green-600' : 'text-gray-500'}>
                        {emailStatus.envVars.hasSmtpHost ? '✓' : '○'} SMTP_HOST (smtp.office365.com)
                      </p>
                      <p className={emailStatus.envVars.hasSmtpUser ? 'text-green-600' : 'text-gray-500'}>
                        {emailStatus.envVars.hasSmtpUser ? '✓' : '○'} SMTP_USER (your email address)
                      </p>
                      <p className={emailStatus.envVars.hasSmtpPass ? 'text-green-600' : 'text-gray-500'}>
                        {emailStatus.envVars.hasSmtpPass ? '✓' : '○'} SMTP_PASS (your password)
                      </p>
                    </div>
                  </div>
                )}

                {emailStatus.configured && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Send Test Email</p>
                    <div className="flex gap-2">
                      <Input
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="your@email.com"
                        type="email"
                        className="flex-1"
                      />
                      <Button onClick={sendTestEmail} isLoading={isSendingTest}>
                        <Send size={16} />
                        Send Test
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-500">Loading email status...</div>
            )}
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
