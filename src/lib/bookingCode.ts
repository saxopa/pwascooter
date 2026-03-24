export function getBookingPickupCode(bookingId: string): string {
    return bookingId.replace(/-/g, '').slice(0, 8).toUpperCase()
}
