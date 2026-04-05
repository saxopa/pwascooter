import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useHosts } from '../../contexts/HostsContext'

describe('useHosts', () => {
  it('should throw error when used outside of provider', () => {
    // This should throw because we're not inside a provider
    expect(() => {
      renderHook(() => useHosts())
    }).toThrow('useHosts must be used within HostsProvider')
  })

  it('should export a function', () => {
    expect(typeof useHosts).toBe('function')
  })
})
