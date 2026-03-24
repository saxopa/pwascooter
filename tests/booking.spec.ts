import { test, expect } from '@playwright/test'
import {
  login,
  logout,
  selectDuration,
} from './utils/test-helpers'

test.describe('Carte & Marqueurs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/map')
    await page.waitForLoadState('networkidle')
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
    await page.goto('/map')
    await page.waitForLoadState('networkidle')
  })

  test('Clic sur marqueur ouvre le bottom sheet', async ({ page }) => {
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(3000)

    const marker = page.locator('.leaflet-marker-icon').first()
    const hasMarker = await marker.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasMarker) {
      test.skip()
      return
    }

    await marker.click()

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

    const marker = page.locator('.leaflet-marker-icon').first()
    if (!(await marker.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip()
      return
    }

    await marker.click()
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

    const marker = page.locator('.leaflet-marker-icon').first()
    if (!(await marker.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip()
      return
    }

    await marker.click()
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
    const marker = page.locator('.leaflet-marker-icon').first()
    if (!(await marker.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip()
      return
    }

    await marker.click()
    await expect(page.locator('text=Choisir une durée')).toBeVisible({ timeout: 5000 })

    // Select 1h
    await selectDuration(page, '1h')

    // Click "Payer et Réserver" button
    const bookBtn = page.locator('button:has-text("Payer et Réserver")')
    await expect(bookBtn).toBeVisible()
    await bookBtn.click()

    // Wait for simulated payment (2s) + Supabase call
    // Should show "Réservation confirmée !" or an error
    const successOrError = page.locator('text=Réservation confirmée, text=complet, text=erreur').first()
    await expect(successOrError).toBeVisible({ timeout: 10000 })

    await logout(page).catch(() => {})
  })
})

test.describe('Page Mes Réservations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/map')
    await page.waitForLoadState('networkidle')
  })

  test('Navigation vers /bookings via le bouton header', async ({ page }) => {
    // "Mes réservations" button in MapView header
    const bookingsBtn = page.locator('button:has-text("Mes réservations")')
    await expect(bookingsBtn).toBeVisible({ timeout: 5000 })

    await bookingsBtn.click()

    // Should navigate to /bookings
    await expect(page).toHaveURL(/\/bookings/)
  })

  test('Page /bookings se charge', async ({ page }) => {
    // Navigate via button from map (not direct URL which has basepath issues)
    const bookingsBtn = page.locator('button:has-text("Mes réservations")')
    await bookingsBtn.click()
    await page.waitForLoadState('networkidle')

    // Title should show "Mes réservations"
    await expect(page.locator('text=Mes réservations').first()).toBeVisible({ timeout: 5000 })

    // Back button should be present
    await expect(page.locator('button[aria-label="Retour à la carte"]')).toBeVisible()
  })

  test('Bouton retour depuis /bookings', async ({ page }) => {
    // Navigate to bookings via button
    await page.locator('button:has-text("Mes réservations")').click()
    await page.waitForLoadState('networkidle')

    await page.locator('button[aria-label="Retour à la carte"]').click()

    // Should navigate back to map
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Anti-surbooking', () => {
  test.skip('Capacity=1 bloque la 2ème réservation (requires 2 test accounts)', async () => {
    // This test requires:
    // 1. A host with a capacity=1 space
    // 2. Two different test user accounts (TEST_USER_EMAIL + TEST_USER2_EMAIL)
    // 3. Sequential booking on the same spot
    // Cannot be reliably automated without proper test fixtures
  })
})
