declare module 'node-ical' {
  export interface DateWithTimeZone extends Date {
    tz?: string
  }

  export interface VEvent {
    type: 'VEVENT'
    uid: string
    start: Date | DateWithTimeZone
    end?: Date | DateWithTimeZone
    summary?: string
    description?: string
    location?: string
    dtstamp?: Date
  }

  export interface VTimeZone {
    type: 'VTIMEZONE'
    tzid: string
  }

  export type CalendarComponent = VEvent | VTimeZone | { type: string }

  export interface CalendarResponse {
    [key: string]: CalendarComponent
  }

  export const async: {
    fromURL(url: string): Promise<CalendarResponse>
  }

  export function parseICS(icsData: string): CalendarResponse
  export function fromURL(url: string, callback: (err: Error | null, data: CalendarResponse) => void): void
}
