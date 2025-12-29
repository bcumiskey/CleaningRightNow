'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Header from '@/components/layout/Header'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Settings, Save, Loader2, Key, Building, Percent, Plus, Trash2, Calendar, Copy, RefreshCw, Link2, ExternalLink, Download, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface UserSettings {
  businessName: string
  businessPhone: string
  businessEmail: string
  businessAddress: string
  expensePercentage: string
}

interface CalendarSettings {
  calendarToken: string | null
  turnoApiKey: string | null
  googleCalendarId: string | null
  hasToken: boolean
  hasTurnoKey: boolean
}

interface GoogleCalendarStatus {
  connected: boolean
  calendarId: string | null
  needsReauth: boolean
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
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>({
    calendarToken: null,
    turnoApiKey: null,
    googleCalendarId: null,
    hasToken: false,
    hasTurnoKey: false,
  })
  const [turnoApiKeyInput, setTurnoApiKeyInput] = useState('')
  const [turnoImportUrl, setTurnoImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState<{
    total: number
    imported: number
    duplicates: number
    skipped: number
    noPropertyMatch: number
  } | null>(null)
  const [isGeneratingToken, setIsGeneratingToken] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [googleStatus, setGoogleStatus] = useState<GoogleCalendarStatus>({
    connected: false,
    calendarId: null,
    needsReauth: false,
  })
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false)
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false)

  useEffect(() => {
    fetchSettings()
    fetchServices()
    fetchCalendarSettings()
    fetchGoogleStatus()

    // Check for success/error query params from OAuth callback
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'google_connected') {
      toast.success('Google Calendar connected successfully!')
      fetchGoogleStatus()
      // Clean up URL
      window.history.replaceState({}, '', '/settings')
    } else if (params.get('error')) {
      const error = params.get('error')
      const errorMessages: Record<string, string> = {
        google_auth_denied: 'Google Calendar authorization was denied',
        no_code: 'Authorization failed - no code received',
        session_expired: 'Your session expired. Please log in again.',
        invalid_state: 'Invalid authorization state',
        token_exchange_failed: 'Failed to complete authorization',
        callback_failed: 'Authorization callback failed',
      }
      toast.error(errorMessages[error!] || 'Google Calendar connection failed')
      window.history.replaceState({}, '', '/settings')
    }
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

  const fetchCalendarSettings = async () => {
    try {
      const response = await fetch('/api/settings/calendar')
      if (response.ok) {
        const data = await response.json()
        setCalendarSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch calendar settings:', error)
    }
  }

  const fetchGoogleStatus = async () => {
    try {
      const response = await fetch('/api/settings/google')
      if (response.ok) {
        const data = await response.json()
        setGoogleStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch Google status:', error)
    }
  }

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true)
    try {
      const response = await fetch('/api/auth/google')
      if (response.ok) {
        const data = await response.json()
        // Redirect to Google OAuth
        window.location.href = data.authUrl
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to connect Google Calendar')
        setIsConnectingGoogle(false)
      }
    } catch (error) {
      console.error('Failed to connect Google:', error)
      toast.error('Failed to connect Google Calendar')
      setIsConnectingGoogle(false)
    }
  }

  const handleDisconnectGoogle = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) return

    try {
      const response = await fetch('/api/settings/google', { method: 'DELETE' })
      if (response.ok) {
        setGoogleStatus({ connected: false, calendarId: null, needsReauth: false })
        toast.success('Google Calendar disconnected')
      } else {
        toast.error('Failed to disconnect Google Calendar')
      }
    } catch (error) {
      console.error('Failed to disconnect Google:', error)
      toast.error('Failed to disconnect Google Calendar')
    }
  }

  const handleSyncToGoogle = async () => {
    setIsSyncingGoogle(true)
    try {
      const response = await fetch('/api/calendar/google/sync', { method: 'POST' })
      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || `Synced ${data.synced} jobs to Google Calendar`)
      } else {
        toast.error(data.error || 'Failed to sync with Google Calendar')
      }
    } catch (error) {
      console.error('Failed to sync to Google:', error)
      toast.error('Failed to sync with Google Calendar')
    } finally {
      setIsSyncingGoogle(false)
    }
  }

  const handleGenerateToken = async () => {
    setIsGeneratingToken(true)
    try {
      const response = await fetch('/api/settings/calendar', { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        setCalendarSettings(prev => ({
          ...prev,
          calendarToken: data.calendarToken,
          hasToken: true,
        }))
        toast.success('Calendar token generated')
      } else {
        toast.error('Failed to generate token')
      }
    } catch (error) {
      console.error('Failed to generate token:', error)
      toast.error('Failed to generate token')
    } finally {
      setIsGeneratingToken(false)
    }
  }

  const handleRevokeToken = async () => {
    if (!confirm('Are you sure? This will invalidate all existing calendar subscriptions.')) return

    try {
      const response = await fetch('/api/settings/calendar', { method: 'DELETE' })
      if (response.ok) {
        setCalendarSettings(prev => ({
          ...prev,
          calendarToken: null,
          hasToken: false,
        }))
        toast.success('Calendar token revoked')
      } else {
        toast.error('Failed to revoke token')
      }
    } catch (error) {
      console.error('Failed to revoke token:', error)
      toast.error('Failed to revoke token')
    }
  }

  const handleSaveTurnoKey = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/settings/calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnoApiKey: turnoApiKeyInput }),
      })

      if (response.ok) {
        setCalendarSettings(prev => ({
          ...prev,
          turnoApiKey: turnoApiKeyInput ? '********' : null,
          hasTurnoKey: !!turnoApiKeyInput,
        }))
        setTurnoApiKeyInput('')
        toast.success('Turno API key saved')
      } else {
        toast.error('Failed to save Turno API key')
      }
    } catch (error) {
      console.error('Failed to save Turno key:', error)
      toast.error('Failed to save Turno API key')
    } finally {
      setIsSaving(false)
    }
  }

  const handleImportFromTurno = async (dryRun = false) => {
    if (!turnoImportUrl) {
      toast.error('Please enter an iCal URL')
      return
    }

    setIsImporting(true)
    setImportResults(null)

    try {
      const response = await fetch('/api/calendar/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: turnoImportUrl,
          dryRun,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setImportResults({
          total: data.total,
          imported: data.imported,
          duplicates: data.duplicates,
          skipped: data.skipped,
          noPropertyMatch: data.noPropertyMatch,
        })
        if (!dryRun && data.imported > 0) {
          toast.success(`Imported ${data.imported} jobs`)
        } else if (dryRun) {
          toast.success('Preview complete')
        } else if (data.imported === 0) {
          toast.error('No jobs could be imported')
        }
      } else {
        toast.error(data.error || 'Import failed')
      }
    } catch (error) {
      console.error('Failed to import:', error)
      toast.error('Failed to import calendar feed')
    } finally {
      setIsImporting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const getICalUrl = () => {
    if (typeof window === 'undefined' || !calendarSettings.calendarToken) return ''
    return `${window.location.origin}/api/calendar/ical?token=${calendarSettings.calendarToken}`
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

          {/* Calendar Integration */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <CardTitle>Calendar Integration</CardTitle>
              </div>
              <CardDescription>
                Sync your cleaning schedule with Google Calendar, Apple Calendar, Outlook, or Turno
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* iCal Feed */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-gray-600" />
                      <h4 className="font-medium text-gray-900">iCal Feed URL</h4>
                    </div>
                    {calendarSettings.hasToken ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(getICalUrl())}
                        >
                          <Copy className="w-4 h-4" />
                          Copy URL
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRevokeToken}
                        >
                          <RefreshCw className="w-4 h-4" />
                          Revoke
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleGenerateToken}
                        isLoading={isGeneratingToken}
                      >
                        Generate Token
                      </Button>
                    )}
                  </div>
                  {calendarSettings.hasToken ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-white rounded border font-mono text-xs text-gray-600 break-all">
                        {getICalUrl()}
                      </div>
                      <p className="text-sm text-gray-500">
                        Subscribe to this URL in your calendar app. Shows jobs from the past 30 days to 90 days ahead.
                      </p>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <a
                          href={`https://calendar.google.com/calendar/r?cid=webcal://${getICalUrl().replace('https://', '').replace('http://', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Add to Google Calendar
                        </a>
                        <span className="text-gray-300">|</span>
                        <a
                          href={`webcal://${getICalUrl().replace('https://', '').replace('http://', '')}`}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Add to Apple Calendar
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Generate a token to create a calendar feed URL that you can subscribe to from any calendar app.
                    </p>
                  )}
                </div>

                {/* Google Calendar OAuth */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <h4 className="font-medium text-gray-900">Google Calendar</h4>
                    </div>
                    {googleStatus.connected ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          Connected
                        </span>
                      </div>
                    ) : googleStatus.needsReauth ? (
                      <span className="inline-flex items-center gap-1 text-sm text-yellow-600">
                        <AlertCircle className="w-4 h-4" />
                        Needs reconnection
                      </span>
                    ) : null}
                  </div>

                  {googleStatus.connected ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Connected to: <span className="font-medium">{googleStatus.calendarId || 'Primary Calendar'}</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={handleSyncToGoogle}
                          isLoading={isSyncingGoogle}
                        >
                          <RefreshCw className="w-4 h-4" />
                          Sync All Jobs
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDisconnectGoogle}
                        >
                          Disconnect
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Jobs are automatically synced to Google Calendar when created or updated.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-500">
                        Connect your Google Calendar for two-way sync. Jobs will be automatically added to your calendar.
                      </p>
                      <Button
                        size="sm"
                        onClick={handleConnectGoogle}
                        isLoading={isConnectingGoogle}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Connect Google Calendar
                      </Button>
                      {googleStatus.needsReauth && (
                        <p className="text-xs text-yellow-600">
                          Your Google authorization has expired. Please reconnect.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Turno Integration */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <img
                      src="https://www.turno.com/wp-content/uploads/2023/02/turno-favicon.png"
                      alt="Turno"
                      className="w-5 h-5"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <h4 className="font-medium text-gray-900">Turno Integration</h4>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">
                    Sync with Turno for vacation rental turnovers. Export your schedule to Turno using the iCal URL above, or import bookings from Turno below.
                  </p>

                  {/* Import from Turno */}
                  <div className="space-y-3 mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Import from Turno iCal Feed
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="Paste Turno iCal feed URL here..."
                        value={turnoImportUrl}
                        onChange={(e) => setTurnoImportUrl(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleImportFromTurno(true)}
                        isLoading={isImporting}
                        disabled={!turnoImportUrl}
                      >
                        Preview
                      </Button>
                      <Button
                        onClick={() => handleImportFromTurno(false)}
                        isLoading={isImporting}
                        disabled={!turnoImportUrl}
                      >
                        <Download className="w-4 h-4" />
                        Import
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Find your Turno iCal feed URL in Turno under Settings &gt; Integrations &gt; Calendar Export
                    </p>

                    {/* Import Results */}
                    {importResults && (
                      <div className="mt-3 p-3 bg-white rounded border">
                        <h5 className="font-medium text-gray-900 mb-2">Import Results</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span>{importResults.imported} imported</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-gray-400" />
                            <span>{importResults.duplicates} duplicates</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                            <span>{importResults.noPropertyMatch} no match</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-gray-400" />
                            <span>{importResults.skipped} skipped</span>
                          </div>
                        </div>
                        {importResults.noPropertyMatch > 0 && (
                          <p className="text-xs text-yellow-600 mt-2">
                            Some events could not be matched to properties. Make sure property names or addresses in your Turno account match those in this app.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Turno API Key (optional) */}
                  <div className="pt-3 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Turno API Key (Optional)
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        placeholder={calendarSettings.hasTurnoKey ? '••••••••' : 'Enter Turno API key'}
                        value={turnoApiKeyInput}
                        onChange={(e) => setTurnoApiKeyInput(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={handleSaveTurnoKey}
                        isLoading={isSaving}
                        disabled={!turnoApiKeyInput}
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </Button>
                    </div>
                    {calendarSettings.hasTurnoKey && (
                      <p className="text-xs text-green-600 mt-2">Turno API key is configured</p>
                    )}
                  </div>

                  <a
                    href="https://turno.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mt-3"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Learn more about Turno
                  </a>
                </div>
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
