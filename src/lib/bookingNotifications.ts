import { invokeAuthedFunction } from './invokeAuthedFunction'

export type BookingNotificationEvent =
  | 'booking_created'
  | 'booking_activated'
  | 'booking_completed'
  | 'booking_cancelled'

export async function sendBookingNotification(eventType: BookingNotificationEvent, bookingId: string) {
  const { error } = await invokeAuthedFunction('booking-notifications', {
    body: { eventType, bookingId },
  })

  if (error) {
    console.error(`Failed to send booking notification (${eventType})`, error)
  }
}
