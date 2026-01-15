import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEmail, getEmailProviderInfo } from '@/lib/email'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const providerInfo = getEmailProviderInfo()
  if (!providerInfo.configured) {
    return NextResponse.json({ error: 'Email provider not configured' }, { status: 400 })
  }

  try {
    const { to } = await request.json()

    if (!to || typeof to !== 'string') {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 })
    }

    const result = await sendEmail({
      to,
      subject: 'Test Email from Cleaning Right Now',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
            Test Email
          </h1>

          <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
            This is a test email from the Cleaning Right Now application.
          </p>

          <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="color: #047857; font-size: 14px; margin: 0;">Email Provider:</p>
            <p style="color: #065f46; font-size: 18px; font-weight: bold; margin: 8px 0 0 0;">
              ${providerInfo.provider === 'microsoft365' ? 'Microsoft 365' : 'Resend'}
            </p>
          </div>

          <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
            If you received this email, your email integration is working correctly!
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

          <p style="color: #9ca3af; font-size: 12px;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        provider: providerInfo.provider,
      })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}
