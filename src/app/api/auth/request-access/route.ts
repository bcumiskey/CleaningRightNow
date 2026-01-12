import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json()

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    // Get all admin users to notify
    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { email: true, name: true },
    })

    if (admins.length === 0) {
      return NextResponse.json({ error: 'No administrators found' }, { status: 500 })
    }

    // Get company settings for branding
    const settings = await prisma.companySettings.findUnique({
      where: { id: 'default' },
    })

    const companyName = settings?.companyName || 'Cleaning Right Now'

    // Send email to all admins
    const adminEmails = admins.map(a => a.email).filter(Boolean)

    if (adminEmails.length > 0) {
      await sendEmail({
        to: adminEmails,
        subject: `[${companyName}] New Access Request from ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">New Team Member Access Request</h2>

            <p>Someone has requested access to ${companyName}:</p>

            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
              ${message ? `<p style="margin: 0;"><strong>Message:</strong> ${message}</p>` : ''}
            </div>

            <p>To approve this request, log in and add them as a team member:</p>
            <ol>
              <li>Go to <strong>Team</strong> in the sidebar</li>
              <li>Click <strong>Add Team Member</strong></li>
              <li>Enter their details and set a password</li>
              <li>Share their login credentials with them</li>
            </ol>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated message from ${companyName}.
            </p>
          </div>
        `,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Access request error:', error)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }
}
