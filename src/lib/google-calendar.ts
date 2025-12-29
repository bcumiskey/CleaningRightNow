import prisma from './prisma'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

interface GoogleTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
}

/**
 * Refresh the Google access token if expired
 */
export async function refreshGoogleToken(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
    },
  })

  if (!user?.googleAccessToken) {
    return null
  }

  // Check if token is still valid (with 5 minute buffer)
  if (user.googleTokenExpiry && user.googleTokenExpiry > new Date(Date.now() + 5 * 60 * 1000)) {
    return user.googleAccessToken
  }

  // Token expired, try to refresh
  if (!user.googleRefreshToken) {
    console.error('No refresh token available')
    return null
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: user.googleRefreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      console.error('Failed to refresh token:', await response.text())
      return null
    }

    const tokens = await response.json()

    // Update tokens in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token,
        googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        // Google may issue a new refresh token
        ...(tokens.refresh_token && { googleRefreshToken: tokens.refresh_token }),
      },
    })

    return tokens.access_token
  } catch (error) {
    console.error('Error refreshing Google token:', error)
    return null
  }
}

/**
 * Create or update a Google Calendar event
 */
export async function syncJobToGoogleCalendar(
  userId: string,
  job: {
    id: string
    scheduledDate: Date
    scheduledTime: string | null
    property: {
      name: string
      address: string
    }
    status: string
    notes: string | null
  }
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const accessToken = await refreshGoogleToken(userId)
  if (!accessToken) {
    return { success: false, error: 'Not connected to Google Calendar' }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleCalendarId: true },
  })

  const calendarId = user?.googleCalendarId || 'primary'

  // Parse the scheduled time
  let startDateTime = new Date(job.scheduledDate)
  let endDateTime = new Date(job.scheduledDate)

  if (job.scheduledTime) {
    const [hours, minutes] = job.scheduledTime.split(':').map(Number)
    startDateTime.setHours(hours, minutes, 0, 0)
    // Default to 2 hour duration
    endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000)
  } else {
    // All-day event
    startDateTime.setHours(9, 0, 0, 0)
    endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000)
  }

  const event = {
    summary: `🧹 ${job.property.name}`,
    location: job.property.address,
    description: job.notes || `Cleaning job at ${job.property.name}`,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'America/New_York',
    },
    // Use extended properties to track our job ID
    extendedProperties: {
      private: {
        cleaningJobId: job.id,
      },
    },
  }

  try {
    // Check if event already exists
    const existingEventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?privateExtendedProperty=cleaningJobId%3D${job.id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (existingEventsResponse.ok) {
      const existingEvents = await existingEventsResponse.json()

      if (existingEvents.items && existingEvents.items.length > 0) {
        // Update existing event
        const existingEventId = existingEvents.items[0].id
        const updateResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${existingEventId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          }
        )

        if (updateResponse.ok) {
          const updatedEvent = await updateResponse.json()
          return { success: true, eventId: updatedEvent.id }
        } else {
          const error = await updateResponse.text()
          console.error('Failed to update event:', error)
          return { success: false, error: 'Failed to update event' }
        }
      }
    }

    // Create new event
    const createResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    if (createResponse.ok) {
      const createdEvent = await createResponse.json()
      return { success: true, eventId: createdEvent.id }
    } else {
      const error = await createResponse.text()
      console.error('Failed to create event:', error)
      return { success: false, error: 'Failed to create event' }
    }
  } catch (error) {
    console.error('Google Calendar sync error:', error)
    return { success: false, error: 'Sync failed' }
  }
}

/**
 * Delete a job from Google Calendar
 */
export async function deleteJobFromGoogleCalendar(
  userId: string,
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  const accessToken = await refreshGoogleToken(userId)
  if (!accessToken) {
    return { success: false, error: 'Not connected to Google Calendar' }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleCalendarId: true },
  })

  const calendarId = user?.googleCalendarId || 'primary'

  try {
    // Find the event by job ID
    const existingEventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?privateExtendedProperty=cleaningJobId%3D${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (existingEventsResponse.ok) {
      const existingEvents = await existingEventsResponse.json()

      if (existingEvents.items && existingEvents.items.length > 0) {
        const eventId = existingEvents.items[0].id
        const deleteResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )

        if (deleteResponse.ok || deleteResponse.status === 204) {
          return { success: true }
        }
      }
    }

    return { success: true } // Event not found is still success
  } catch (error) {
    console.error('Google Calendar delete error:', error)
    return { success: false, error: 'Delete failed' }
  }
}

/**
 * Sync all upcoming jobs to Google Calendar
 */
export async function syncAllJobsToGoogleCalendar(
  userId: string
): Promise<{ success: boolean; synced: number; errors: number }> {
  const accessToken = await refreshGoogleToken(userId)
  if (!accessToken) {
    return { success: false, synced: 0, errors: 0 }
  }

  // Get all upcoming jobs
  const jobs = await prisma.job.findMany({
    where: {
      scheduledDate: {
        gte: new Date(),
      },
      status: {
        in: ['SCHEDULED', 'IN_PROGRESS'],
      },
    },
    include: {
      property: {
        select: {
          name: true,
          address: true,
        },
      },
    },
  })

  let synced = 0
  let errors = 0

  for (const job of jobs) {
    const result = await syncJobToGoogleCalendar(userId, job)
    if (result.success) {
      synced++
    } else {
      errors++
    }
  }

  return { success: true, synced, errors }
}
