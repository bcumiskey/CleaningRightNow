import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

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
  fromEmail = 'invoices@cleaningrightnow.com',
  fromName = 'Cleaning Right Now',
}: SendInvoiceEmailParams) {
  if (!resend) {
    console.warn('Email not configured - RESEND_API_KEY not set')
    return { success: false, error: 'Email service not configured' }
  }

  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(total)

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: `Invoice ${invoiceNumber} for ${propertyName}`,
      html: `
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
      `,
      attachments: [
        {
          filename: `${invoiceNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    })

    if (error) {
      console.error('Email send error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

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
  fromEmail = 'payroll@cleaningrightnow.com',
  fromName = 'Cleaning Right Now',
}: SendPayStatementEmailParams) {
  if (!resend) {
    console.warn('Email not configured - RESEND_API_KEY not set')
    return { success: false, error: 'Email service not configured' }
  }

  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalEarnings)

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: `Your Pay Statement for ${payPeriod}`,
      html: `
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
      `,
      attachments: [
        {
          filename: `PayStatement-${payPeriod.replace(/\s/g, '-')}.pdf`,
          content: pdfBuffer,
        },
      ],
    })

    if (error) {
      console.error('Email send error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: 'Failed to send email' }
  }
}
