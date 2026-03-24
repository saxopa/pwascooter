import { test, expect } from '@playwright/test'
import {
  gotoRoute,
  login,
  logout,
} from './utils/test-helpers'

test.describe('Host Dashboard & Spaces', () => {
  const hostEmail = process.env.TEST_HOST_EMAIL
  const hostPassword = process.env.TEST_HOST_PASSWORD

  test.beforeEach(async ({ page }) => {
    if (!hostEmail || !hostPassword) {
      test.skip()
      return
    }

    await gotoRoute(page, '/map')
    await login(page, hostEmail, hostPassword)
  })

  test.afterEach(async ({ page }) => {
    await logout(page).catch(() => {})
  })

  test('Dashboard Host — page loads with stats', async ({ page }) => {
    if (!hostEmail) { test.skip(); return }

    await gotoRoute(page, '/host/dashboard')

    // Should stay on dashboard (not redirected)
    await expect(page).toHaveURL(/#\/host\/dashboard/)

    // Header should show "Espace Pro"
    await expect(page.locator('h1:has-text("Espace Pro")')).toBeVisible()

    // Should have 3 stat cards with numbers
    const statCards = page.locator('.glass-card')
    await expect(statCards.first()).toBeVisible({ timeout: 10000 })

    // "Places actives" text should be visible
    await expect(page.locator('text=Places actives')).toBeVisible()

    // "Add" button should be visible
    await expect(page.locator('button:has-text("Ajouter")')).toBeVisible()
  })

  test('Host crée une place (formulaire)', async ({ page }) => {
    if (!hostEmail) { test.skip(); return }

    await gotoRoute(page, '/host/dashboard')

    // Click "Ajouter" button
    await page.locator('button:has-text("Ajouter")').click()

    // The form should appear — header says "Nouvelle place"
    await expect(page.locator('h1:has-text("Nouvelle place")')).toBeVisible({ timeout: 5000 })

    // Fill the form
    const spotName = `E2E Spot ${Date.now()}`
    await page.locator('input[placeholder*="Capitole"]').fill(spotName)

    // Type an address and wait for geocoding suggestions
    const addressInput = page.locator('input[placeholder*="adresse"]')
    await addressInput.fill('Place du Capitole Toulouse')
    await page.waitForTimeout(1500) // Wait for Nominatim debounce

    // Click the first suggestion if available
    const suggestion = page.locator('button').filter({ hasText: 'Capitole' }).first()
    if (await suggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
      await suggestion.click()
      // Coordinates indicator should appear
      await expect(page.locator('text=Coordonnées')).toBeVisible({ timeout: 3000 })
    }

    // Fill capacity and price (they have default values, but let's set them)
    const capacityInput = page.locator('input[type="number"]').first()
    await capacityInput.fill('3')

    const priceInput = page.locator('input[type="number"]').nth(1)
    await priceInput.fill('2.5')

    // Submit the form
    await page.locator('button:has-text("Créer la place")').click()

    // Should return to dashboard after creation
    await expect(page.locator('h1:has-text("Espace Pro")')).toBeVisible({ timeout: 10000 })
  })

  test('Toggle place active/inactive', async ({ page }) => {
    if (!hostEmail) { test.skip(); return }

    await gotoRoute(page, '/host/dashboard')

    // Find the first "Désactiver" or "Activer" button
    const toggleBtn = page.locator('button:has-text("Désactiver"), button:has-text("Activer")').first()

    const hasSpaces = await toggleBtn.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasSpaces) {
      test.skip()
      return
    }

    // Get initial text
    const initialText = await toggleBtn.textContent()
    await toggleBtn.click()

    // Wait for the update
    await page.waitForTimeout(2000)

    // After toggle, the button text should change
    const newToggleBtn = page.locator('button:has-text("Désactiver"), button:has-text("Activer")').first()
    const newText = await newToggleBtn.textContent()
    expect(newText).not.toBe(initialText)
  })

  test('Bouton retour vers la carte', async ({ page }) => {
    if (!hostEmail) { test.skip(); return }

    await gotoRoute(page, '/host/dashboard')

    // Click the back button (ArrowLeft, aria-label "Retour à la carte")
    await page.locator('button[aria-label="Retour à la carte"]').click()

    // Should navigate back to map
    await expect(page).toHaveURL(/#\/map$/)
  })

  test('Scanner caméra remplit et valide un code', async ({ page }) => {
    if (!hostEmail) { test.skip(); return }

    await page.addInitScript(() => {
      class MockBarcodeDetector {
        static async getSupportedFormats() {
          return ['code_39']
        }

        async detect() {
          return [{ rawValue: 'SCN12345' }]
        }
      }

      Object.defineProperty(window, 'BarcodeDetector', {
        configurable: true,
        writable: true,
        value: MockBarcodeDetector,
      })

      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: async () => new MediaStream(),
        },
      })

      Object.defineProperty(HTMLMediaElement.prototype, 'play', {
        configurable: true,
        value: async () => undefined,
      })
    })

    await page.route('**/rest/v1/rpc/validate_booking_by_code', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '11111111-1111-1111-1111-111111111111',
          host_id: '22222222-2222-2222-2222-222222222222',
          user_id: '33333333-3333-3333-3333-333333333333',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          total_price: 4,
          status: 'active',
          pickup_code: 'SCN12345',
          created_at: new Date().toISOString(),
        }),
      })
    })

    await gotoRoute(page, '/host/dashboard')

    const hasSpaces = await page.locator('text=Mes places (0)').isVisible().catch(() => false)
    if (hasSpaces) {
      test.skip()
      return
    }

    await page.getByTestId('open-scanner-button').click()
    await expect(page.getByTestId('scanner-modal')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('validation-success')).toContainText('Dépôt validé pour', { timeout: 10000 })
    await expect(page.getByTestId('validation-code-input')).toHaveValue('', { timeout: 5000 })
  })
})

test.describe('Host Dashboard — Route Protection', () => {
  test('Utilisateur non-host redirigé depuis /host/dashboard', async ({ page }) => {
    const userEmail = process.env.TEST_USER_EMAIL
    const userPassword = process.env.TEST_USER_PASSWORD

    if (!userEmail || !userPassword) {
      test.skip()
      return
    }

    await gotoRoute(page, '/map')

    // Login as regular user
    await login(page, userEmail, userPassword)

    // Try to access host dashboard
    await gotoRoute(page, '/host/dashboard')

    // Should be redirected away from host dashboard (to /)
    const url = page.url()
    expect(url).not.toContain('#/host/dashboard')

    await logout(page).catch(() => {})
  })

  test('Utilisateur non connecté redirigé depuis /host/dashboard', async ({ page }) => {
    // Start from map, then try to navigate to host dashboard via URL
    await gotoRoute(page, '/map')

    // Use the app's router to navigate (handles basepath)
    await page.evaluate(() => {
      window.location.hash = '#/host/dashboard'
    })
    await page.waitForTimeout(3000)

    // Should be redirected to / (ProtectedRoute redirects non-hosts)
    // OR the page should show the map (not the dashboard)
    const hasDashboard = await page.locator('h1:has-text("Espace Pro")').isVisible({ timeout: 2000 }).catch(() => false)
    expect(hasDashboard).toBe(false)
  })
})

test.describe('Host — Espace Pro Button', () => {
  test('Bouton "Espace Pro" visible pour un host', async ({ page }) => {
    const hostEmail = process.env.TEST_HOST_EMAIL
    const hostPassword = process.env.TEST_HOST_PASSWORD

    if (!hostEmail || !hostPassword) {
      test.skip()
      return
    }

    await gotoRoute(page, '/map')
    await login(page, hostEmail, hostPassword)

    // "Espace Pro" button should be visible in the header
    await expect(page.locator('button:has-text("Espace Pro")')).toBeVisible({ timeout: 5000 })

    await logout(page).catch(() => {})
  })

  test('Bouton "Espace Pro" ABSENT pour un user normal', async ({ page }) => {
    const userEmail = process.env.TEST_USER_EMAIL
    const userPassword = process.env.TEST_USER_PASSWORD

    if (!userEmail || !userPassword) {
      test.skip()
      return
    }

    await gotoRoute(page, '/')
    await login(page, userEmail, userPassword)

    // "Espace Pro" button should NOT be visible
    await expect(page.locator('button:has-text("Espace Pro")')).not.toBeVisible({ timeout: 3000 })

    await logout(page).catch(() => {})
  })
})
