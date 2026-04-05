import { describe, it, expect } from 'vitest'
import { getBookingPickupCode, extractBookingPickupCode, resolveBookingPickupCode } from '../bookingCode'

describe('bookingCode', () => {
  describe('getBookingPickupCode', () => {
    it('should return first 8 chars of UUID without dashes', () => {
      const bookingId = '12345678-1234-1234-1234-123456789abc'
      expect(getBookingPickupCode(bookingId)).toBe('12345678')
    })

    it('should convert to uppercase', () => {
      const bookingId = 'abcdefab-cdef-abcd-efab-cdefabcdefab'
      expect(getBookingPickupCode(bookingId)).toBe('ABCDEFAB')
    })

    it('should handle empty string', () => {
      expect(getBookingPickupCode('')).toBe('')
    })
  })

  describe('extractBookingPickupCode', () => {
    it('should extract 8-char code from string', () => {
      expect(extractBookingPickupCode('A1B2C3D4')).toBe('A1B2C3D4')
    })

    it('should remove non-alphanumeric chars', () => {
      expect(extractBookingPickupCode('A 1 B 2 C 3 D 4')).toBe('A1B2C3D4')
    })

    it('should extract from longer strings', () => {
      expect(extractBookingPickupCode('Code: A1B2C3D4 Extra text')).toBe('CODEA1B2')
    })

    it('should return trimmed value if no 8-char code found', () => {
      expect(extractBookingPickupCode('ABC')).toBe('ABC')
    })

    it('should handle hex codes from UUIDs', () => {
      expect(extractBookingPickupCode('ABCDEF01-2345-6789-ABCD-EF0123456789')).toBe('ABCDEF01')
    })
  })

  describe('resolveBookingPickupCode', () => {
    it('should use provided pickup code if available', () => {
      expect(resolveBookingPickupCode('A1B2C3D4', '12345678-1234-1234-1234-123456789abc')).toBe('A1B2C3D4')
    })

    it('should generate from bookingId if pickup code is null', () => {
      expect(resolveBookingPickupCode(null, 'abcdefab-cdef-abcd-efab-cdefabcdefab')).toBe('ABCDEFAB')
    })

    it('should generate from bookingId if pickup code is empty string', () => {
      expect(resolveBookingPickupCode('', '12345678-1234-1234-1234-123456789abc')).toBe('12345678')
    })

    it('should convert to uppercase', () => {
      expect(resolveBookingPickupCode('a1b2c3d4', '12345678-1234-1234-1234-123456789abc')).toBe('A1B2C3D4')
    })
  })
})
