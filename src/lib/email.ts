import { Resend } from 'resend'
import { Client } from '@microsoft/microsoft-graph-client'
import { ClientSecretCredential } from '@azure/identity'

// Email Provider Configuration
type EmailProvider = 'microsoft365' | 'resend' | 'none'

function getEmailProvider(): EmailProvider {
  if (process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET) {
    return 'microsoft365'
  }
  if (process.env.RESEND_API_KEY) {
    return 'resend'
  }
  return 'none'
}

// Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Microsoft Graph client
function getMicrosoftGraphClient(): Client | null {
  const tenantId = process.env.AZURE_TENANT_ID
  const clientId = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    return null
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret)

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken('https://graph.microsoft.com/.default')
        return token.token
      },
    },
  })
}

// Generic email sending function
interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  fromEmail?: string
  fromName?: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType?: string
  }>
}

export async function sendEmail({
  to,
  subject,
  html,
  fromEmail,
  fromName = 'Cleaning Right Now',
  attachments = [],
}: SendEmailParams): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const provider = getEmailProvider()

  if (provider === 'none') {
    console.warn('Email not configured - no email provider set up')
    return { success: false, error: 'Email service not configured' }
  }

  const toAddresses = Array.isArray(to) ? to : [to]

  if (provider === 'microsoft365') {
    return sendViaMicrosoft365({ to: toAddresses, subject, html, fromEmail, fromName, attachments })
  }

  return sendViaResend({ to: toAddresses, subject, html, fromEmail, fromName, attachments })
}

// Microsoft 365 email sending
async function sendViaMicrosoft365({
  to,
  subject,
  html,
  fromEmail,
  fromName,
  attachments,
}: {
  to: string[]
  subject: string
  html: string
  fromEmail?: string
  fromName?: string
  attachments: Array<{ filename: string; content: Buffer; contentType?: string }>
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const client = getMicrosoftGraphClient()
  if (!client) {
    return { success: false, error: 'Microsoft Graph client not configured' }
  }

  // The sender email must be a valid mailbox in your M365 tenant
  const senderEmail = fromEmail || process.env.M365_SENDER_EMAIL || 'noreply@cleaningrightnow.com'

  try {
    const message = {
      subject,
      body: {
        contentType: 'HTML',
        content: html,
      },
      toRecipients: to.map(email => ({
        emailAddress: { address: email },
      })),
      from: {
        emailAddress: {
          address: senderEmail,
          name: fromName,
        },
      },
      attachments: attachments.map(att => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: att.filename,
        contentType: att.contentType || 'application/pdf',
        contentBytes: att.content.toString('base64'),
      })),
    }

    // Send mail using the /users/{id}/sendMail endpoint
    await client.api(`/users/${senderEmail}/sendMail`).post({
      message,
      saveToSentItems: true,
    })

    return { success: true, messageId: `m365-${Date.now()}` }
  } catch (error) {
    console.error('Microsoft 365 email send error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to send email via Microsoft 365'
    return { success: false, error: errorMessage }
  }
}

// Resend email sending
async function sendViaResend({
  to,
  subject,
  html,
  fromEmail,
  fromName,
  attachments,
}: {
  to: string[]
  subject: string
  html: string
  fromEmail?: string
  fromName?: string
  attachments: Array<{ filename: string; content: Buffer; contentType?: string }>
}): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!resend) {
    return { success: false, error: 'Resend not configured' }
  }

  const senderEmail = fromEmail || 'notifications@cleaningrightnow.com'

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${senderEmail}>`,
      to,
      subject,
      html,
      attachments: attachments.map(att => ({
        filename: att.filename,
        content: att.content,
      })),
    })

    if (error) {
      console.error('Resend email send error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('Resend email send error:', error)
    return { success: false, error: 'Failed to send email via Resend' }
  }
}

// Get current email provider info
export function getEmailProviderInfo(): { provider: EmailProvider; configured: boolean; senderEmail?: string } {
  const provider = getEmailProvider()
  return {
    provider,
    configured: provider !== 'none',
    senderEmail: provider === 'microsoft365'
      ? process.env.M365_SENDER_EMAIL
      : provider === 'resend'
        ? 'notifications@cleaningrightnow.com'
        : undefined,
  }
}

// Invoice email
interface SendInvoiceEmailParams {
  to: string
  invoiceNumber: string
  propertyName: string
  total: number
  dueDate?: string
  pdfBuffer: Buffer
  fromEmail?: string
  fromName?: string
}

export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  propertyName,
  total,
  dueDate,
  pdfBuffer,
  fromEmail,
  fromName = 'Cleaning Right Now',
}: SendInvoiceEmailParams) {
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(total)

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
        Invoice ${invoiceNumber}
      </h1>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
        Please find attached your invoice for <strong>${propertyName}</strong>.
      </p>

      <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <table style="width: 100%;">
          <tr>
            <td style="color: #6b7280; font-size: 14px;">Invoice Number:</td>
            <td style="color: #1f2937; font-weight: bold; text-align: right;">${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding-top: 8px;">Property:</td>
            <td style="color: #1f2937; font-weight: bold; text-align: right; padding-top: 8px;">${propertyName}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding-top: 8px;">Amount Due:</td>
            <td style="color: #1f2937; font-weight: bold; font-size: 18px; text-align: right; padding-top: 8px;">${formattedTotal}</td>
          </tr>
          ${dueDate ? `
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding-top: 8px;">Due Date:</td>
            <td style="color: #1f2937; font-weight: bold; text-align: right; padding-top: 8px;">${dueDate}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
        The full invoice is attached as a PDF for your records.
      </p>

      <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin-top: 24px;">
        Thank you for your business!
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

      <p style="color: #9ca3af; font-size: 12px;">
        This invoice was sent by ${fromName}. If you have any questions, please reply to this email.
      </p>
    </div>
  `

  return sendEmail({
    to,
    subject: `Invoice ${invoiceNumber} for ${propertyName}`,
    html,
    fromEmail,
    fromName,
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  })
}

// Pay statement email
interface SendPayStatementEmailParams {
  to: string
  workerName: string
  payPeriod: string
  totalEarnings: number
  pdfBuffer: Buffer
  fromEmail?: string
  fromName?: string
}

export async function sendPayStatementEmail({
  to,
  workerName,
  payPeriod,
  totalEarnings,
  pdfBuffer,
  fromEmail,
  fromName = 'Cleaning Right Now',
}: SendPayStatementEmailParams) {
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalEarnings)

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
        Pay Statement
      </h1>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
        Hi ${workerName},
      </p>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
        Your pay statement for <strong>${payPeriod}</strong> is attached.
      </p>

      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="color: #047857; font-size: 14px; margin: 0;">Total Earnings</p>
        <p style="color: #065f46; font-size: 28px; font-weight: bold; margin: 8px 0 0 0;">${formattedTotal}</p>
      </div>

      <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
        The detailed breakdown is in the attached PDF. If you have any questions about your pay,
        please don't hesitate to reach out.
      </p>

      <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin-top: 24px;">
        Thank you for your hard work!
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

      <p style="color: #9ca3af; font-size: 12px;">
        This pay statement was sent by ${fromName}.
      </p>
    </div>
  `

  return sendEmail({
    to,
    subject: `Your Pay Statement for ${payPeriod}`,
    html,
    fromEmail,
    fromName,
    attachments: [
      {
        filename: `PayStatement-${payPeriod.replace(/\s/g, '-')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  })
}

// Job assignment notification email
interface SendJobAssignmentEmailParams {
  to: string
  workerName: string
  propertyName: string
  jobDate: string
  jobTime?: string
  propertyAddress?: string
  notes?: string
  fromEmail?: string
  fromName?: string
}

export async function sendJobAssignmentEmail({
  to,
  workerName,
  propertyName,
  jobDate,
  jobTime,
  propertyAddress,
  notes,
  fromEmail,
  fromName = 'Cleaning Right Now',
}: SendJobAssignmentEmailParams) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
        New Job Assignment
      </h1>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
        Hi ${workerName},
      </p>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
        You have been assigned to a new job:
      </p>

      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <table style="width: 100%;">
          <tr>
            <td style="color: #1e40af; font-size: 14px; font-weight: bold;">Property:</td>
            <td style="color: #1e3a5f; text-align: right; font-size: 16px; font-weight: bold;">${propertyName}</td>
          </tr>
          <tr>
            <td style="color: #1e40af; font-size: 14px; padding-top: 12px;">Date:</td>
            <td style="color: #1e3a5f; text-align: right; padding-top: 12px;">${jobDate}</td>
          </tr>
          ${jobTime ? `
          <tr>
            <td style="color: #1e40af; font-size: 14px; padding-top: 8px;">Time:</td>
            <td style="color: #1e3a5f; text-align: right; padding-top: 8px;">${jobTime}</td>
          </tr>
          ` : ''}
          ${propertyAddress ? `
          <tr>
            <td style="color: #1e40af; font-size: 14px; padding-top: 8px;">Address:</td>
            <td style="color: #1e3a5f; text-align: right; padding-top: 8px;">${propertyAddress}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      ${notes ? `
      <div style="background-color: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="color: #854d0e; font-size: 14px; margin: 0;"><strong>Notes:</strong></p>
        <p style="color: #713f12; font-size: 14px; margin: 8px 0 0 0;">${notes}</p>
      </div>
      ` : ''}

      <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin-top: 24px;">
        Please check the app for full details and any special instructions.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

      <p style="color: #9ca3af; font-size: 12px;">
        This notification was sent by ${fromName}.
      </p>
    </div>
  `

  return sendEmail({
    to,
    subject: `New Job: ${propertyName} on ${jobDate}`,
    html,
    fromEmail,
    fromName,
  })
}

// Job completion notification to owner
interface SendJobCompletionEmailParams {
  to: string
  ownerName: string
  propertyName: string
  completedDate: string
  jobDetails?: string
  fromEmail?: string
  fromName?: string
}

export async function sendJobCompletionEmail({
  to,
  ownerName,
  propertyName,
  completedDate,
  jobDetails,
  fromEmail,
  fromName = 'Cleaning Right Now',
}: SendJobCompletionEmailParams) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
        Cleaning Completed
      </h1>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
        Hi ${ownerName},
      </p>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
        We're pleased to let you know that cleaning has been completed for your property.
      </p>

      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <table style="width: 100%;">
          <tr>
            <td style="color: #047857; font-size: 14px;">Property:</td>
            <td style="color: #065f46; text-align: right; font-weight: bold;">${propertyName}</td>
          </tr>
          <tr>
            <td style="color: #047857; font-size: 14px; padding-top: 8px;">Completed:</td>
            <td style="color: #065f46; text-align: right; padding-top: 8px;">${completedDate}</td>
          </tr>
        </table>
      </div>

      ${jobDetails ? `
      <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">
        ${jobDetails}
      </p>
      ` : ''}

      <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin-top: 24px;">
        Thank you for choosing us! If you have any questions or feedback, please don't hesitate to reach out.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

      <p style="color: #9ca3af; font-size: 12px;">
        This notification was sent by ${fromName}.
      </p>
    </div>
  `

  return sendEmail({
    to,
    subject: `Cleaning Completed: ${propertyName}`,
    html,
    fromEmail,
    fromName,
  })
}
