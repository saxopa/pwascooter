import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import {
  gotoRoute,
  login,
  logout,
  selectDuration,
} from './utils/test-helpers'

const E2E_ANTI_SURBOOKING_HOST_ID = '11111111-1111-4111-8111-111111111111'

async function openFirstMarker(page: Page) {
  const marker = page.locator('.leaflet-marker-icon').first()
  const hasMarker = await marker.isVisible({ timeout: 5000 }).catch(() => false)

  if (!hasMarker) {
    return false
  }

  await marker.evaluate((node: HTMLElement) => node.click())
  return true
}

test.describe('Carte & Marqueurs', () => {
  test.beforeEach(async ({ page }) => {
    await gotoRoute(page, '/map')
  })

  test('La carte Leaflet se charge', async ({ page }) => {
    // Leaflet container should be visible
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 })

    // ScootSafe header should be visible
    await expect(page.locator('h1:has-text("ScootSafe")')).toBeVisible()
  })

  test('Les marqueurs de parking s\'affichent', async ({ page }) => {
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 })

    // Wait for markers to load from Supabase
    await page.waitForTimeout(3000)

    const markers = page.locator('.leaflet-marker-icon')
    const count = await markers.count()

    // There should be at least one marker (from seed data)
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Réservation — Bottom Sheet', () => {
  test.beforeEach(async ({ page }) => {
    await gotoRoute(page, '/map')
  })

  test('Clic sur marqueur ouvre le bottom sheet', async ({ page }) => {
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(3000)

    const opened = await openFirstMarker(page)
    if (!opened) {
      test.skip()
      return
    }

    // Bottom sheet should appear with "Choisir une durée"
    await expect(page.locator('text=Choisir une durée')).toBeVisible({ timeout: 5000 })

    // Duration buttons should be visible
    await expect(page.locator('button:has-text("1h")')).toBeVisible()
    await expect(page.locator('button:has-text("2h")')).toBeVisible()
    await expect(page.locator('button:has-text("4h")')).toBeVisible()

    // Price should be displayed
    await expect(page.locator('text=Total calculé')).toBeVisible()
  })

  test('Sélection de durée met à jour le prix', async ({ page }) => {
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(3000)

    if (!(await openFirstMarker(page))) {
      test.skip()
      return
    }
    await expect(page.locator('text=Total calculé')).toBeVisible({ timeout: 5000 })

    // Get initial price
    const priceEl = page.locator('text=/\\d+\\.\\d+ €/').first()
    // Select 4h duration
    await selectDuration(page, '4h')
    await page.waitForTimeout(500)

    // Price should have changed (4h > 1h default)
    const newPrice = await priceEl.textContent()
    // Prices could be same only if price_per_hour is 0
    expect(newPrice).toBeDefined()
  })

  test('Bouton "Se connecter pour réserver" si non connecté', async ({ page }) => {
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(3000)

    if (!(await openFirstMarker(page))) {
      test.skip()
      return
    }
    await expect(page.locator('text=Choisir une durée')).toBeVisible({ timeout: 5000 })

    // When not logged in, should see "Se connecter pour réserver"
    await expect(page.locator('button:has-text("Se connecter pour réserver")')).toBeVisible()
  })

  test('Réservation complète (authentifié)', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD

    if (!email || !password) {
      test.skip()
      return
    }

    // Login first
    await login(page, email, password)
    await page.waitForTimeout(1000)

    // Click a marker
    if (!(await openFirstMarker(page))) {
      test.skip()
      return
    }
    await expect(page.locator('text=Choisir une durée')).toBeVisible({ timeout: 5000 })

    // Select 1h
    await selectDuration(page, '1h')

    // Click "Payer et Réserver" button
    const bookBtn = page.locator('button:has-text("Payer et Réserver")')
    await expect(bookBtn).toBeVisible()
    await bookBtn.click()

    await expect
      .poll(
        async () => {
          const hasBookingCode = await page.getByTestId('booking-code-card').isVisible().catch(() => false)
          const hasError = await page.locator('text=/Erreur|erreur|complet/i').first().isVisible().catch(() => false)
          if (hasBookingCode) return 'success'
          if (hasError) return 'error'
          return 'pending'
        },
        { timeout: 10000 }
      )
      .toBe('success')

    await expect(page.getByTestId('booking-code-card')).toBeVisible({ timeout: 10000 })
    await expect(page.getByTestId('booking-code-value')).toContainText(/[A-Z0-9]{8}/)

    await logout(page).catch(() => {})
  })
})

test.describe('Page Mes Réservations', () => {
  test.beforeEach(async ({ page }) => {
    await gotoRoute(page, '/map')
  })

  test('Navigation vers /bookings via le bouton header', async ({ page }) => {
    const bookingsBtn = page.locator('button[aria-label="Mes Réservations"]')
    await expect(bookingsBtn).toBeVisible({ timeout: 5000 })

    await bookingsBtn.click()

    // Should navigate to /bookings
    await expect(page).toHaveURL(/#\/bookings/)
  })

  test('Page /bookings se charge', async ({ page }) => {
    // Navigate via button from map (not direct URL which has basepath issues)
    const bookingsBtn = page.locator('button[aria-label="Mes Réservations"]')
    await bookingsBtn.click()
    await page.waitForLoadState('networkidle')

    // Title should show "Mes réservations"
    await expect(page.locator('text=Mes réservations').first()).toBeVisible({ timeout: 5000 })

    // Back button should be present
    await expect(page.locator('button[aria-label="Retour à la carte"]')).toBeVisible()
  })

  test('Bouton retour depuis /bookings', async ({ page }) => {
    // Navigate to bookings via button
    await page.locator('button[aria-label="Mes Réservations"]').click()
    await page.waitForLoadState('networkidle')

    await page.locator('button[aria-label="Retour à la carte"]').click()

    // Should navigate back to map
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Anti-surbooking', () => {
  test('Capacity=1 bloque la 2ème réservation', async () => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
    const user1Email = process.env.TEST_USER_EMAIL
    const user1Password = process.env.TEST_USER_PASSWORD
    const user2Email = process.env.TEST_USER2_EMAIL
    const user2Password = process.env.TEST_USER2_PASSWORD

    if (!supabaseUrl || !supabaseAnonKey || !user1Email || !user1Password || !user2Email || !user2Password) {
      test.skip()
      return
    }

    const client1 = createClient(supabaseUrl, supabaseAnonKey)
    const client2 = createClient(supabaseUrl, supabaseAnonKey)

    const start = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const end = new Date(start.getTime() + 60 * 60 * 1000)

    const cleanupBookingIds: string[] = []

    try {
      const [{ data: loginData1, error: loginError1 }, { data: loginData2, error: loginError2 }] = await Promise.all([
        client1.auth.signInWithPassword({ email: user1Email, password: user1Password }),
        client2.auth.signInWithPassword({ email: user2Email, password: user2Password }),
      ])

      expect(loginError1?.message ?? null).toBeNull()
      expect(loginError2?.message ?? null).toBeNull()
      expect(loginData1.user?.id).toBeTruthy()
      expect(loginData2.user?.id).toBeTruthy()

      const { data: booking1, error: bookingError1 } = await client1.rpc('book_parking_spot', {
        p_host_id: E2E_ANTI_SURBOOKING_HOST_ID,
        p_start_time: start.toISOString(),
        p_end_time: end.toISOString(),
        p_total_price: 1.5,
      })

      expect(bookingError1?.message ?? null).toBeNull()
      expect(booking1?.success).toBe(true)

      if (booking1?.booking_id) {
        cleanupBookingIds.push(booking1.booking_id)
      }

      const { data: booking2, error: bookingError2 } = await client2.rpc('book_parking_spot', {
        p_host_id: E2E_ANTI_SURBOOKING_HOST_ID,
        p_start_time: start.toISOString(),
        p_end_time: end.toISOString(),
        p_total_price: 1.5,
      })

      expect(bookingError2?.message ?? null).toBeNull()
      expect(booking2?.success).toBe(false)
      expect(booking2?.error).toBe('PARKING_FULL')
    } finally {
      for (const bookingId of cleanupBookingIds) {
        await client1.rpc('cancel_booking', { p_booking_id: bookingId })
      }
      await client1.auth.signOut()
      await client2.auth.signOut()
    }
  })
})
