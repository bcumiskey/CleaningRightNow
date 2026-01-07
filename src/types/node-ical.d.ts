declare module 'node-ical' {
  export interface VEvent {
    type: 'VEVENT'
    uid: string
    start: Date
    end: Date
    summary?: string
    description?: string
    location?: string
    dtstamp?: Date
  }

  export interface CalendarResponse {
    [key: string]: VEvent | { type: string }
  }

  export const async: {
    fromURL(url: string): Promise<CalendarResponse>
  }

  export function parseICS(icsData: string): CalendarResponse
  export function fromURL(url: string, callback: (err: Error | null, data: CalendarResponse) => void): void
}
