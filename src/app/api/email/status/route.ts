import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEmailProviderInfo } from '@/lib/email'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessionUser = session.user as { role?: string }
  if (sessionUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const providerInfo = getEmailProviderInfo()

  return NextResponse.json({
    ...providerInfo,
    envVars: {
      hasAzureTenantId: !!process.env.AZURE_TENANT_ID,
      hasAzureClientId: !!process.env.AZURE_CLIENT_ID,
      hasAzureClientSecret: !!process.env.AZURE_CLIENT_SECRET,
      hasM365SenderEmail: !!process.env.M365_SENDER_EMAIL,
      hasResendApiKey: !!process.env.RESEND_API_KEY,
    },
  })
}
