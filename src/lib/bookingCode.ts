export function getBookingPickupCode(bookingId: string): string {
    return bookingId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

export function extractBookingPickupCode(rawValue: string): string {
    const normalizedValue = rawValue.trim().toUpperCase()
    const compactValue = normalizedValue.replace(/[^A-Z0-9]/g, '')

    if (compactValue.length >= 8) {
        return compactValue.slice(0, 8)
    }

    const codeMatch = normalizedValue.match(/[A-F0-9]{8}/)
    return codeMatch?.[0] ?? normalizedValue
}
